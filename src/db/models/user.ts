import {
  AllowNull,
  Column, DataType,
  HasMany,
  IsNumeric,
  Model,
  NotContains,
  NotIn,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript'
import WalletAddress from './walletaddress.js'
import Transaction from './transaction.js'
import Tip from './tip.js'
import Post from './post.js'
import CallbackQuery from './callbackquery.js'
import BigNumber from '../../static/bignumber.js'

@Table
export default class User extends Model {
  @IsNumeric
  @NotIn([[0]]) // todo check if this works
  @PrimaryKey
  @Unique
  @AllowNull(false)
  @Column(DataType.BIGINT)
  get userId (): number {
    return parseInt(this.getDataValue('userId'))
  }

  @NotContains('@')
  @Unique
  @Column
    name: string

  @Column
    firstName: string

  @Column
    lastName: string

  @Column(DataType.VIRTUAL)
  // todo add another field which update on every update to double check if we're too far off
  // eslint-disable-next-line
  get balance (): Promise<BigNumber> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises,no-async-promise-executor
    return new Promise(async (resolve) => {
      try { // todo
        let balance = this.getDataValue('balance')
        if (balance !== undefined) {
          resolve(balance)
        }
        // eslint-disable-next-line
        const sumOfIncomingTransactions = await Transaction.sum('amount', {
          where: {
            userId: this.userId,
            type: 'DEPOSIT',
            status: 'CONFIRMED'
          }
        }) || 0
        // eslint-disable-next-line
        const sumOfOutgoingTransactions = await Transaction.sum('amount', {
          where: {
            userId: this.userId,
            type: 'WITHDRAW'
          }
        }) || 0
        // eslint-disable-next-line
        const sumOfOutgoingFees = await Transaction.sum('fee', {where: {userId: this.userId, type: 'WITHDRAW'}}) || 0
        // eslint-disable-next-line
        const sumOfIncomingTips = await Tip.sum('amount', {where: {toUser: this.userId}}) || 0
        // eslint-disable-next-line
        const sumOfOutgoingTips = await Tip.sum('amount', {where: {userId: this.userId}}) || 0
        balance = BigNumber(sumOfIncomingTransactions).minus(sumOfOutgoingTransactions).minus(sumOfOutgoingFees).plus(sumOfIncomingTips).minus(sumOfOutgoingTips)
        this.setDataValue('balance', balance)
        resolve(balance)
      } catch (e) {
        resolve(BigNumber(0))
      }
    })
  }

  set balance (value) {
    throw new Error('Can\'t set `balance` directly.')
  }

  get pendingBalance (): Promise<BigNumber> {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises,no-async-promise-executor
    return new Promise(async (resolve) => {
      try {
        let balance = this.getDataValue('pendingBalance')
        if (balance !== undefined) {
          resolve(balance)
        }
        // eslint-disable-next-line
        const sumOfIncomingTransactions = await Transaction.sum('amount', {
          where: {
            userId: this.userId,
            type: 'DEPOSIT',
            status: 'UNCONFIRMED'
          }
        }) || 0
        balance = BigNumber(sumOfIncomingTransactions)
        this.setDataValue('pendingBalance', balance)
        resolve(balance)
      } catch (e) {
        resolve(BigNumber(0))
      }
    })
  }

  set pendingBalance (value) {
    throw new Error('Can\'t set `pendingBalance` directly.')
  }

  @Column(DataType.VIRTUAL)
  // eslint-disable-next-line
  get tippedAmount (): Promise<BigNumber> {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises,no-async-promise-executor
    return new Promise(async (resolve) => {
      try {
        let tippedAmount = this.getDataValue('tippedAmount')
        if (tippedAmount !== undefined) {
          resolve(tippedAmount)
        }
        // eslint-disable-next-line
        tippedAmount = await Tip.sum('amount', {where: {userId: this.userId}}) || 0
        tippedAmount = BigNumber(tippedAmount)
        this.setDataValue('tippedAmount', tippedAmount)
        resolve(tippedAmount)
      } catch (e) {
        resolve(BigNumber(0))
      }
    })
  }

  set tippedAmount (value) {
    throw new Error('Can\'t set `tippedAmount` directly.')
  }

  @HasMany(() => WalletAddress, 'userId')
    walletAddresses: WalletAddress[]

  @HasMany(() => Transaction, 'userId')
    transactions: Transaction[]

  @HasMany(() => Tip, 'userId')
    tips: Tip[]

  @HasMany(() => Tip, 'toUser')
    receivedTips: Tip[]

  @HasMany(() => Post, 'userId')
    posts: Post[]

  @HasMany(() => CallbackQuery, 'userId')
    callbackQueries: CallbackQuery[]

  // @BelongsToMany(() => Post, () => UserPost)
  // posts: Array<Post & {UserPost: UserPost}>;
}
