import { AllowNull, BelongsTo, Column, DataType, Model, PrimaryKey, Table, Unique } from 'sequelize-typescript'
import User from './user.js'
import { Update } from 'typegram'
import InlineQueryUpdate = Update.InlineQueryUpdate

@Table
export default class InlineQuery extends Model {
  @Unique
  @PrimaryKey
  @AllowNull(false)
  @Column
  declare id: string

  @Column('varchar generated always as (message::jsonb ->> \'chat_type\') stored')
  readonly chatType: string

  @AllowNull(false)
  @Column(DataType.JSONB)
    message: InlineQueryUpdate

  @BelongsTo(() => User, 'userId')
    user: User[]
}
