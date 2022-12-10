import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  HasMany,
  Is,
  Model,
  Table,
  Unique
} from 'sequelize-typescript'
import User from './user.js'
import CallbackQuery from './callbackquery.js'
import { Message } from 'typegram'
import TextMessage = Message.TextMessage

@Table
export default class Post extends Model {
  @Is(/\d+:\d+/)
  @AllowNull(false)
  @Unique
  @Column
  declare postId: string

  @Column('varchar generated always as (message::jsonb -> \'from\' ->> \'username\') stored')
  readonly name: string | null

  @Column('varchar generated always as (message::jsonb -> \'from\' ->> \'first_name\') stored')
  readonly firstName: string

  @Column('varchar generated always as (message::jsonb -> \'from\' ->> \'last_name\') stored')
  readonly lastName: string | null

  @Column('integer generated always as ((message::jsonb ->> \'message_id\')::int) stored')
  readonly messageId: number

  @Column('bigint generated always as ((message::jsonb -> \'chat\' ->> \'id\')::bigint) stored')
  get chatId (): number {
    return parseInt(this.getDataValue('chatId'))
  }

  set chatId (value: number) {
    throw new Error('Can\'t set `chatId` directly.')
  }

  @Column('text generated always as (message::jsonb ->> \'text\') stored')
  readonly text: string

  @Column
    status: 'consumed' | 'edited' // todo adjust / limit

  @Default(false)
  @Column
    deleted: boolean

  // todo add validate and check for chat + message id and others
  @AllowNull(false)
  @Column(DataType.JSONB)
    message: TextMessage

  @BelongsTo(() => User, 'userId')
    user: User[]

  @BelongsTo(() => Post, 'rootPostId')
    rootPost: Post

  @BelongsTo(() => Post, 'replyToPostId')
    reply: Post

  @HasMany(() => Post, 'replyToPostId')
    replies: Post[]

  @HasMany(() => Post, 'rootPostId')
    thread: Post[]

  @HasMany(() => CallbackQuery, 'postId')
    callbackQueries: CallbackQuery[]

  // @BelongsToMany(() => User, () => UserPost)
  // users: Array<Post & {UserPost: UserPost}>
}
