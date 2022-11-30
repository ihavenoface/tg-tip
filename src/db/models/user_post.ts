import { Column, ForeignKey, Model, Table } from 'sequelize-typescript'
import Post from './post.js'
import User from './user.js'

@Table
export default class UserPost extends Model {
  @ForeignKey(() => Post)
  @Column
    postId: number

  @ForeignKey(() => User)
  @Column
    userId: number
}
