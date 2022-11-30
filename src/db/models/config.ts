import { AfterSync, Column, DataType, Is, IsInt, IsNumeric, Min, Model, Table } from 'sequelize-typescript'
import g from '../../static/global.js'

@Table
export default class Config extends Model {
  @Is('has all members', (obj: { messagePrefix: string }): void => {
    const hasEveryMember = [
      'messagePrefix',
      'bech32',
      'bip32',
      'pubKeyHash',
      'scriptHash',
      'wif'
    ].every(value => { return value in obj })
    if (!hasEveryMember) {
      throw new Error('NETWORK config malformed.')
    }
    if (!obj.messagePrefix.includes(g.COIN_NAME)) {
      throw new Error('You\'re probably using the wrong message prefix.')
    }
  })
  @Column(DataType.JSONB)
    coinNetwork: object

  @IsNumeric
  @IsInt
  @Min(0)
  @Column
    blockHeight: number

  @AfterSync
  static async checkEnv (): Promise<void> {
    if (g.NETWORK == null) {
      throw new Error('NETWORK environment variable not defined.')
    }
    const dbConfig = await Config.findOne()
    if (dbConfig != null) {
      // todo add more checks, eg actually check with daemon we're on the expected version / network
      //      right now we're just expecting g.NETWORK to be sane
      // todo add bot check. are we booting with the same bot?
      const left = JSON.stringify(g.NETWORK, Object.keys(g.NETWORK).sort())
      const right = JSON.stringify(dbConfig.coinNetwork, Object.keys(dbConfig.coinNetwork).sort())
      if (left !== right) {
        throw new Error('db is not compatible with daemon')
      }
    } else {
      await Config.create({
        coinNetwork: g.NETWORK
      })
    }
  }
}
