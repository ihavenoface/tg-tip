import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Is,
  IsAlphanumeric,
  IsInt,
  IsNumeric,
  Length,
  Max,
  Min,
  Model,
  Table,
  Unique
} from 'sequelize-typescript'
import BigNumber from '../../static/bignumber.js'
import g from '../../static/global.js'
import User from './user.js'
import { isAddressValid } from '../../wallet.js'

// todo create test transaction before sending them anywhere, to benefit from validity checking
// todo status could be made virtual type
@Table
export default class Transaction extends Model {
  @Column
    type: string

  @Is('valid address', async (value: string) => {
    if (!await isAddressValid(value)) {
      throw new Error('Invalid address.')
    }
  })
  @Length({ min: 26, max: 59 })
  @Column
    walletAddress: string

  @AllowNull(false)
  @Unique
  @Length({ min: 64, max: 64 })
  @IsAlphanumeric
  @Column
    walletTxId: string

  @IsInt
  @IsNumeric
  @Min(1) // todo
  @Max(g.MAX_COIN)
  @Column(DataType.BIGINT)
  get amount (): BigNumber {
    return BigNumber(this.getDataValue('amount'))
  }

  @IsInt
  @IsNumeric
  @Min(100) // todo
  @Max(g.COIN * 20) // todo
  @Column(DataType.BIGINT)
  get fee (): BigNumber {
    return BigNumber(this.getDataValue('fee'))
  }

  @Column
    transactionTime: Date

  @Column(DataType.JSONB)
  // todo needs better typing
    rawTxRpc: { details: [ { address: string } ] }

  @AllowNull(false)
  @Column
    status: string

  @BelongsTo(() => User, 'userId')
    user: User[]
}
