import { User, Transaction } from '../index.js'
import BigNumber from '../../static/bignumber.js'

// todo bettter typing
// todo better return
export default async (walletTx: any, walletAddress: string, walletTxId: string, amount: BigNumber, fee: BigNumber, fromUser: User): Promise<boolean> => {
  const values = {
    type: 'WITHDRAW',
    walletTxId,
    walletAddress,
    amount,
    fee,
    // fromUser, // todo: check what this is supposed to be
    userId: fromUser.userId,
    transactionTime: new Date(walletTx.time * 1000),
    rawTxRpc: walletTx,
    status: 'SENT' // todo change to staged, so that we can store transactions that have been pre-constructed. more of a fail-safe (in case sendrawtx goes wrong) than anything. also lets us check if our validation matches before sending
  }
  // todo check if amounts are sane?
  try {
    await Transaction.create(values)
    return true
  } catch (e) {
    // @ts-expect-error
    // eslint-disable-next-line
    if (e && e.errors[0].message === 'walletTxId must be unique') {
      try {
        const tx = await Transaction.findOne({ where: { walletTxId } })
        await tx?.update(values)
      } catch (e) {
        return false
      }
      return true
    }
    return false
  }
}
