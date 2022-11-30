import BigNumber from '../../static/bignumber.js'
import { checkFunds } from './index.js'
import { User, Tip } from '../index.js'

export default async (user: User, amount: BigNumber, targetUser: User): Promise<Tip | null> => {
  if (!await checkFunds(user, amount, BigNumber(0))) {
    return null
  }
  try {
    return await Tip.create({
      userId: user.userId,
      toUser: targetUser.userId,
      amount
    })
  } catch (e) {
    return null
  }
}
