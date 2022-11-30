import { AllowNull, BelongsTo, Column, DataType, Model, PrimaryKey, Table, Unique } from 'sequelize-typescript'
import User from './user.js'
import Post from './post.js'
import { Update } from 'typegram'
import CallbackQueryUpdate = Update.CallbackQueryUpdate

@Table
export default class CallbackQuery extends Model {
  @Unique
  @PrimaryKey
  @AllowNull(false)
  @Column
  declare id: string

  @Column('varchar generated always as (message::jsonb ->> \'chat_instance\') stored')
  readonly chatInstance: string

  @Column('varchar generated always as (message::jsonb ->> \'data\') stored')
  readonly data: string

  @AllowNull(false)
  @Column(DataType.JSONB)
    message: CallbackQueryUpdate

  @BelongsTo(() => User, 'userId')
    user: User[]

  @BelongsTo(() => Post, 'postId')
    post: Post[]

  @BelongsTo(() => Post, 'rootPostId')
    rootPost: Post[]
}
