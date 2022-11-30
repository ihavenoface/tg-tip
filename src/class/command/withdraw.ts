import Command from './command.js'
import { checkFunds } from '../../db/helpers/index.js'
import { WalletAddress, CallbackQuery, Post, User } from '../../db/index.js'
import g from '../../static/global.js'
import BigNumber from '../../static/bignumber.js'
import { createFundedRawTransaction, isAddressValid, makeTransactionToAddress } from '../../wallet.js'
import { Context } from 'telegraf'

// todo add up all transactions + tips before sending to ensure balance integrity

export default class Withdraw extends Command {
  // todo prefixed from global
  static REGEXP = /^\/(?<topic>w(?:d|ithdraw))(?:@[A-Za-z0-9_]{5,32})?(?:\s+(?:peercoin:|PEERCOIN:)?(?<address>(?:pc|tpc|pcrt|PC|TPC|PCRT)1[A-Za-z0-9]{39,59}|[APnm][a-km-zA-HJ-NP-Z1-9]{26,33})(?:\s+(?<amount>[\d.]+))?(?<kilo>k)?)?/
  static HELP_COMMAND = 'withdraw'
  static SHORT_HELP_TEXT = 'Send funds to address.'

  obtainNewAddress: boolean
  fee: BigNumber
  minAmount: BigNumber
  constructor (props: { ctx: Context, user: User, post: Post }) {
    super({ ...props, REGEXP: Withdraw.REGEXP })
    this.fee = BigNumber(g.COIN).multipliedBy(1)
    this.minAmount = BigNumber(g.COIN).multipliedBy(1)
  }

  async handleCallbackQuery (post: Post, callbackQuery: CallbackQuery): Promise<void> {
    const { data } = callbackQuery
    // if (['target_address', 'set_new_target_address'].includes(data))
    //    this[data] = post;
    if (data === 'target_address' && post?.message?.reply_markup != null) {
      this.address = post.message.reply_markup.inline_keyboard[0][1].text
      this.obtainNewAddress = false
      /*
      if (await isAddressValid(this.address)) {
        this.obtainNewAddress = false
        return
      }
      */
      if (post.status === 'edited' || this.address === null) return
      await this.tryEditMessageReplyMarkup(
        post,
        {
          inline_keyboard: [[{ text: `✅ ${this.address}`, callback_data: 'null' }]]
        }
      )
    } else if (data === 'set_new_target_address') {
      // TODO we need to update and maybe negate this on later posts
      this.obtainNewAddress = true // todo make this stateless?
      try {
        if (!post.deleted) {
          await this.ctx.telegram.deleteMessage(post.chatId, post.messageId)
          await post.update({ deleted: true })
          await post.reload()
          this.address = null
        }
      } catch (e) {}
    }
  }

  async handleMessage (): Promise<void> {
    if (this.match == null) return
    if (this.post.status === 'consumed') return
    // eslint-disable-next-line
    if (this.abort) {
      try {
        if (this.abort.status !== 'edited') {
          await this.tryEditMessageText(this.abort, this.tl('withdrawalStopped'))
          await this.abort.update({ status: 'edited' })
        }
      } catch (e) {
      }
      return
    }
    await this.deletePublicMessage()
    // todo possibly check if "owned" address is supplied. while not inherently wrong, it just makes no sense to self-send here
    // todo we want to store the message id on withdraw, in case we ever crash
    // @ts-expect-error
    // eslint-disable-next-line
    if (!this.confirmed && !this.address || !await isAddressValid(this.address) && !await isAddressValid(this.address = this.address.toLowerCase())) { // todo we should have a reason to even lower case the address
      let replyMarkup
      let lastAddress
      if (!this.obtainNewAddress) {
        try {
          const [{ rawTxRpc }] = await this.user.$get('transactions', {
            attributes: ['rawTxRpc'],
            where: { status: 'SENT' },
            order: [['createdAt', 'DESC']],
            limit: 1
          })
          lastAddress = rawTxRpc.details[0].address
        } catch (e) {
        }
      }
      if (lastAddress !== null && lastAddress !== undefined) {
        replyMarkup = {
          inline_keyboard: [[
            { text: 'New address', callback_data: 'set_new_target_address' },
            { text: lastAddress, callback_data: 'target_address' }
          ]]
        }
      } else {
        replyMarkup = { force_reply: true as true } // ??????????
      }
      const replacement = this.address !== null ? 'missingWithdrawalAddress' : 'missingWithdrawalAddressDetailed'
      await this.trySendMessage(
        this.user.userId,
        this.tl(replacement, { address: this.address }),
        {
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        }
      )
      return
    }
    // eslint-disable-next-line
    if (this.amount) {
      try {
        // @ts-expect-error
        const { fee } = await createFundedRawTransaction(this.amount, this.address)
        this.fee = fee
      } catch (e) {
      }
    }
    // @ts-expect-error
    // eslint-disable-next-line
    if (!this.confirmed && !this.amount || this.amount.lt(this.minAmount) || !await checkFunds(this.user, this.amount, this.fee)) { // todo fix fee, pre-emptively calculate and show it to user
      let userBalance
      try {
        userBalance = await this.user.balance
      } catch (e) {}
      if (userBalance === null || userBalance === undefined) return
      const strAvailable = userBalance.minus(this.fee).div(g.COIN).toFormat(g.BIGNUM_FORMAT)
      const strBalance = userBalance.div(g.COIN).toFormat(g.BIGNUM_FORMAT)
      const strMinWithdrawal = this.minAmount.div(g.COIN).toFormat(g.BIGNUM_FORMAT)
      const strApproxFee = this.fee.div(g.COIN).toFormat(g.BIGNUM_FORMAT)
      const str = this.tl('missingWithdrawalAmount', {
        available: strAvailable,
        balance: strBalance,
        minWithdrawal: strMinWithdrawal,
        approxFee: strApproxFee
      })
      await this.trySendMessage(
        this.user.userId,
        str,
        {
          parse_mode: 'HTML',
          // todo force_reply seems to be kept open, until you delete it which is annoying on older messages
          reply_markup: {
            force_reply: true
          }
        }
      )
      return
    }
    // todo improve
    // @ts-expect-error
    // eslint-disable-next-line
    if (!this.confirmed && await WalletAddress.count({  where: { walletAddress: this.address }, limit: 1 })) {
      await this.trySendMessage(this.user.userId, '[Incomplete] Don\'t use your deposit address as target address.')
      return
    }
    // eslint-disable-next-line
    if (!this.confirmed) {
      // @ts-expect-error
      // eslint-disable-next-line
      const strAmount = this.amount.div(g.COIN).toFormat(g.BIGNUM_FORMAT)
      const strFee = this.fee.div(g.COIN).toFormat(g.BIGNUM_FORMAT)
      const str = this.tl('withDrawConfirm', { amount: strAmount, fee: strFee, address: this.address })
      await this.trySendMessage(
        this.user.userId,
        str,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{
                text: this.tl('looksGood'),
                callback_data: 'confirmed'
              }, {
                text: this.tl('nevermind'),
                callback_data: 'abort'
              }]
            ]
          }
        }
      )
      return
    }
    await this.post.update({ status: 'consumed' })
    if (this.amount !== null && this.confirmed !== null && this.address !== null) {
      let txRes
      try {
        txRes = await makeTransactionToAddress(this.user, this.amount, this.address)
      } catch (e) {
        await this.handleError(e as Error)
      }
      let message
      // eslint-disable-next-line
      if (txRes && txRes.txid) {
        // todo explorer url
        message = this.tl('withdrawSuccess', { amount: this.amount.div(g.COIN).toFormat(g.BIGNUM_FORMAT), address: this.address, txid: txRes?.txid })
      } else {
        message = this.tl('withdrawError')
      }
      await this.tryEditMessageText(this.confirmed, message, { parse_mode: 'HTML' })
    }
  }
}
