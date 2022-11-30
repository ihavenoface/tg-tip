import { BelongsTo, Column, Is, Length, Model, Table } from 'sequelize-typescript'
import User from './user.js'
import { isAddressValid } from '../../wallet.js'

@Table
export default class WalletAddress extends Model {
  // todo validate
  @Is('valid address', async (value: string) => {
    if (!await isAddressValid(value)) {
      throw new Error('Invalid address.')
    }
  })
  @Length({ min: 26, max: 59 })
  @Column
    walletAddress: string

  @BelongsTo(() => User, 'userId')
    user: User[]
}
