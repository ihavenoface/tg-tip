import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  IsDecimal,
  IsInt,
  IsNumeric,
  Max,
  Min,
  Model,
  NotIn,
  Table
} from 'sequelize-typescript'
import g from '../../static/global.js'
import BigNumber from '../../static/bignumber.js'
import User from './user.js'

@Table
export default class Tip extends Model {
  /*
    @Is('is not target user', (value: number) => {
        if (!this?.toUser || value === this.toUser)
            throw 'userId cannot match toUser';
    })
    */
  @NotIn([[0]])
  @AllowNull(false)
  @Column(DataType.BIGINT)
  get userId (): number {
    return parseInt(this.getDataValue('userId'))
  }

  /*
    @Is('is not source user', (value: number) => {
        if (!this?.userId || value === this.userId)
            throw 'toUser cannot match userId';
    })
    */
  @NotIn([[0]])
  @AllowNull(false)
  @Column(DataType.BIGINT)
  get toUser (): number {
    return parseInt(this.getDataValue('toUser'))
  }

  /*
    @Is('lower than max amount', async (value: number) => {
        const user = await this.$get("user");

        const balance = await user.balance;
        if (!balance)
            throw new Error('User does not exist.');
        if (BigNumber(value).gt(balance))
            throw new Error('Tip amount exceeds user balance');
    })
    */
  @IsNumeric
  @IsInt
  @IsDecimal
  @Min(g.CENT) // todo
  @Max(g.MAX_COIN)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  get amount (): BigNumber {
    return BigNumber(this.getDataValue('amount'))
  };

  @BelongsTo(() => User, 'userId')
    user: User[]

  @BelongsTo(() => User, 'toUser')
    recipient: User[]
}
