import BigNumber from '../../static/bignumber.js'
import { User } from '../index.js'

export default async (user: User, amount: BigNumber, fee: BigNumber): Promise<boolean> => {
  // todo rework this
  //      in an ideal case we'd double check with a separate record instead of solely relying on .balance
  const balance = await user.balance
  const product = balance.minus(amount).minus(fee)
  return (
    !(
      Boolean(amount.isNegative()) ||
      Boolean(fee.isNaN()) ||
      Boolean(amount.isNegative()) ||
      Boolean(amount.isZero()) ||
      Boolean(amount.isNaN()) ||
      Boolean(product.isNegative()) ||
      Boolean(product.isZero()) ||
      Boolean(product.isNaN()) ||
      Boolean(balance.isNegative()) ||
      Boolean(balance.isZero()) ||
      Boolean(balance.isNaN())
    )
  )
}
