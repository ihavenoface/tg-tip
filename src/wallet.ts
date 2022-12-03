// @ts-expect-error
import Core from 'bitcoin-core'
import sequelize, { User, Transaction, Tip, WalletAddress, Post } from './db/index.js'
import g from './static/global.js'
import updateWalletAddress from './db/helpers/updateWalletAddress.js'
import BigNumber from './static/bignumber.js'
import * as dbHelper from './db/helpers/index.js'
import getUserByWalletAddress from './db/helpers/getUserByWalletAddress.js'
import { bot } from './index.js'
import i18next from 'i18next'
import { ParseMode } from 'typegram'
import bitcoin from 'bitcoinjs-lib'

/*
String to be appended to bitcoin.conf:
rpcauth=tipbot:c68b6555c71641648f399051b13d79a3$21b1bee34aaaad30e1f207280146e2295ea1deefd365fa62c9433a36731f40e6
Your password:
QLcYwK96u6N1UbpKFzb-WR79jdGPXR3fReJ4ganpO8s=
*/
// todo periodically add up wallet balance and and all user balances, so that we can check and possibly halt operations when/if things get out of hand for some reason

export const walletClient = new Core({
  version: '0.22.0',
  host: g.WALLET_HOST, // todo: get from env
  port: g.PORT,
  username: 'ppcuser', // todo: get from env
  password: 'ppcpass' // todo: get from env
})

export const isAddressValid = async (address: string): Promise<boolean> => {
  try {
    bitcoin.address.toOutputScript(address, g.NETWORK)
    const validate = await walletClient.validateAddress(address) as { isvalid: boolean } | null
    if (validate == null) return false
    return validate.isvalid
  } catch (_) {
    return false
  }
}

export const getNewAddress = async (): Promise<string> => {
  return walletClient.getNewAddress('tipbot', 'bech32')
}

export const ensureWalletAddress = async (user: User): Promise<string | null> => {
  const userExists = Boolean(user)
  if (!userExists) return null
  try {
    let walletAddress = null
    try {
      [{ walletAddress }] = await user.$get('walletAddresses', {
        attributes: ['walletAddress'],
        order: [['createdAt', 'DESC']],
        limit: 1
      })
    } catch (e) {
      // not really an error, if there's no address found first time
      console.log(e)
    }
    if (walletAddress === null) {
      walletAddress = await getNewAddress()
      if (!await isAddressValid(walletAddress)) {
        return null
      }
      await updateWalletAddress(user, walletAddress)
      await user.reload()
    }
    // todo double check return type. generally just ismine should do the job, but it's not entirely certain
    const addressInfo = await walletClient.getAddressInfo(walletAddress) as { ismine: boolean } | null
    if ((addressInfo?.ismine) === false) {
      // todo forward to configured admin for inspection / possibly shut down entirely or enter maintenance mode
      console.log('db out of sync with wallet. something went wrong somewhere')
      return null
    }
    const hasTransactions = await Transaction.count({
      // todo this is missing response from the coin daemon as of now, so we only have validation in part
      where: {
        walletAddress,
        type: 'DEPOSIT'
      }
    })
    if (hasTransactions !== 0) {
      walletAddress = await getNewAddress()
      if (!await isAddressValid(walletAddress)) {
        return null
      }
      await updateWalletAddress(user, walletAddress)
      await user.reload()
    }
    return walletAddress
  } catch (e) {
    console.error(e)
    return null
  }
}

export const makeTransactionToUser = async (user: User, amount: BigNumber, targetUser: User): Promise<Tip | null> => {
  if (!await dbHelper.checkFunds(user, amount, BigNumber(0))) {
    return null
  } // todo raise error | no fee needed
  return await dbHelper.moveFunds(user, amount, targetUser)
}

const MIN_CONFIRMATIONS_FOR_DEPOSIT = 6
const txq = new Map()

// todo: invalidate transactions if they get orphaned

export const tryToConfirmTransaction = async (walletTxId: string): Promise<void> => {
  if (txq.has(walletTxId)) return console.log(`tx ${walletTxId} is in queue. skipping.`)
  let rawTxRpc
  try {
    rawTxRpc = await walletClient.getTransaction(walletTxId)
  } catch (e) {
    console.log(`can't get txid: ${walletTxId}`)
    return
  }
  let receive
  for (const detail of rawTxRpc.details) {
    if (receive === null) continue
    if (detail.category !== 'receive') continue
    if (detail.address === null) continue
    const wa = await WalletAddress.findOne({ where: { walletAddress: detail.address } })
    if (wa == null) continue
    receive = detail.address === wa.walletAddress
    break
  }
  if (receive === null) return
  const [transaction] = await Transaction.findOrCreate({
    where: { walletTxId },
    defaults: {
      status: 'DOESNT_EXIST',
      rawTxRpc
    },
    // @ts-expect-error
    skip: ['amount', 'type']
  })
  await parseIncomingTransaction(transaction)
}

export const tryToConfirmTransactions = async (): Promise<void> => {
  const transactions = await Transaction.findAll({
    where: {
      status: ['UNCONFIRMED']
    },
    order: [['createdAt', 'DESC']],
    limit: 100
  })
  for (const transaction of transactions) {
    if (txq.has(transaction.walletTxId)) {
      continue
    }
    try {
      transaction.rawTxRpc = await walletClient.getTransaction(transaction.walletTxId)
      await transaction.save()
    } catch (e) {
      console.log(`can't get txid: ${transaction.walletTxId}`)
      continue
    }
    // todo not sure if this is any good in terms of queuing and balancing correctly just yet
    await parseIncomingTransaction(transaction)
  }
}

// setTimeout(() => tryToConfirmTransaction("5996a6c7e9a2bb9493a313e74718c869a0a4671a40273d999c59041862df01c9"), 100)

// setInterval(tryToConfirmTransactions, 5000);

const templateIncoming = (transaction: any, lng?: string): string => {
  const amount = BigNumber(transaction.amount).div(g.COIN).toFormat(g.BIGNUM_FORMAT)
  // todo find last post of user and get language code?
  // todo set explorer
  if (transaction.confirmations >= MIN_CONFIRMATIONS_FOR_DEPOSIT) {
    return i18next.t('depositComplete', { amount, lng })
  }
  const { confirmations, walletTxId } = transaction
  const minConfirmations = MIN_CONFIRMATIONS_FOR_DEPOSIT
  const approximateETA = (MIN_CONFIRMATIONS_FOR_DEPOSIT - confirmations) * 8
  return i18next.t('depositPending', { amount, confirmations, minConfirmations, approximateETA, walletTxId, lng })
}

// todo this might cause race conditions
// todo select input type
// todo backtest language code switching with historical transactions
export const parseIncomingTransaction = async (transaction: any): Promise<void> => {
  // for staking: const balances = [...all(active).accounts.balance];
  //              const initial = 0;
  //              const sum = balances.reduce((acc, val) => acc+val, initial);
  //              const splitReward = balances.map(n => (n/sum)*stake-reward);
  if (transaction === null) return
  if (txq.has(transaction.walletTxId)) return
  const receive = transaction.rawTxRpc.details.find(({ category }: { category: string }) => category === 'receive') // fixme this does not account for multiple outputs
  if (receive === null) return // console.log('ignoring tx: ', transaction);
  txq.set(transaction.walletTxId, transaction)
  const t = await sequelize.transaction()
  const results = []
  try {
    const toUser = await getUserByWalletAddress(receive.address) // todo meh
    transaction.type = toUser != null ? 'DEPOSIT' : 'DEPOSIT_UNKNOWN'
    transaction.userId = toUser != null ? toUser.userId : null
    transaction.amount = BigNumber(receive.amount).multipliedBy(g.COIN).toNumber()
    transaction.transactionTime = new Date(transaction.rawTxRpc.time * 1000)
    transaction.confirmations = transaction.rawTxRpc.confirmations
    transaction.walletAddress = receive.address
    if (transaction.status === 'DOESNT_EXIST' && transaction.confirmations >= MIN_CONFIRMATIONS_FOR_DEPOSIT) {
      transaction.status = 'CONFIRMED'
      if (toUser != null) { results.push([toUser.userId, 'new_deposit_confirmed', transaction.amount]) }
    } else if (transaction.status === 'DOESNT_EXIST' && transaction.confirmations < MIN_CONFIRMATIONS_FOR_DEPOSIT) {
      transaction.status = 'UNCONFIRMED'
      if (toUser != null) {
        results.push([toUser.userId, 'new_deposit_unconfirmed', transaction.amount])
      }
    } else if (transaction.status === 'UNCONFIRMED' && transaction.confirmations >= MIN_CONFIRMATIONS_FOR_DEPOSIT) {
      transaction.status = 'CONFIRMED'
      if (toUser != null) {
        results.push([toUser.userId, 'deposit_confirmed', transaction.amount])
      }
    }
    if (toUser !== null) {
      try {
        const post = await Post.findOne({ where: { status: transaction.walletTxId } })
        const lastPost = await dbHelper.getLastPostMadeByUser(toUser)
        const text = templateIncoming(transaction, lastPost != null ? lastPost.message.from?.language_code : undefined)
        const extra = {
          parse_mode: 'HTML' as ParseMode, // ???
          reply_markup: {
            inline_keyboard: [
              [{
                text: i18next.t('lookupOnExplorer', { lng: lastPost != null ? lastPost.message.from?.language_code : undefined }),
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                url: `https://chainz.cryptoid.info/ppc${g.CHAIN === 'main' ? '' : '-test'}/tx.dws?${transaction?.walletTxId}.htm`
              }]
            ]
          }
        }
        if (post === null) {
          const res = await bot.telegram.sendMessage(toUser.userId, text, extra)
          const post = await dbHelper.createPostFromTelegramMessage(res)
          if (post !== null) {
            await post.update({ status: transaction.walletTxId })
          }
        } else {
          const message = await bot.telegram.editMessageText(post.chatId, post.messageId, undefined, text, extra)
          // todo update only if we got a response
          await post.update({ message })
        }
      } catch (e) {
        console.log('unable to PM')
        return
      }
    }
    // results.forEach(([a, b, c]) => bot.sendMessage(a, `${b} ${c}`)); // todo lift this up
    await transaction.save({ transaction: t })
    await transaction.reload({ transaction: t })
    await t.commit()
    setTimeout(() => txq.delete(transaction.walletTxId), 1000)
  } catch (e) {
    setTimeout(() => txq.delete(transaction.walletTxId), 1000)
    await t.rollback()
  }
}

// TODO before sending anything anywhere, we must also check if our inputs match up

// todo address better typing
// todo support block queue + multi-output
export const createFundedRawTransaction = async (amount: BigNumber, address: string): Promise<any> => {
  const target: any = {}
  target[address] = amount.div(g.COIN).toNumber()
  const notFunded = await walletClient.createRawTransaction([], target)
  const funded = await walletClient.fundRawTransaction(notFunded)
  funded.fee = BigNumber(funded.fee).abs().multipliedBy(g.COIN)
  return funded
}

export const createSignedRawTransaction = async (amount: BigNumber, address: string): Promise<{ hex: string, fee: BigNumber }> => {
  const funded = await createFundedRawTransaction(amount, address)
  const signed = await walletClient.signRawTransactionWithWallet(funded.hex)
  return { hex: signed.hex, fee: funded.fee }
}

// todo better typing
export const makeTransactionToAddress = async (user: User, amount: BigNumber, address: string): Promise<any> => {
  // todo: we're missing things like txtime and rawTxRpc here
  //       not truly necessary but would be nice to look up the sent tx after and archiving that
  const { hex, fee } = await createSignedRawTransaction(amount, address)
  if (!await dbHelper.checkFunds(user, amount, fee)) { return 'cant send that much, sorry' } // todo break / raise error
  const walletTxId = await walletClient.sendRawTransaction(hex)
  if (walletTxId === null) {
    console.log('no tx id')
    return 'no tx id'
  }
  const walletTx = await walletClient.getTransaction(walletTxId)
  if (walletTx === null) {
    console.log('no tx')
    return 'no tx'
  }
  console.log(walletTxId, walletTx)
  // todo: log this somewhere
  const wdTx = await dbHelper.createWithdrawTransaction(walletTx, address, walletTxId, amount, fee, user)
  if (wdTx === null) return 'something went wrong' // todo: error out
  return walletTx
}

export default {
  walletClient
}
