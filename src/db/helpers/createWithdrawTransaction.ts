import { User, Transaction } from '../index.js'
import BigNumber from '../../static/bignumber.js'

// todo bettter typing
// todo better return
export default async (walletTx: any, walletAddress: string, walletTxId: string, amount: BigNumber, fee: BigNumber, fromUser: User): Promise<boolean> => {
  // todo check if amounts are sane?
  try {
    await Transaction.create({
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
    })
    return true
  } catch (e) {
    return false
  }
}
