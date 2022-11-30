import migrate from '../../mount/migrate.json' assert { type: 'json' }
import { Op } from '@sequelize/core'
import Post from '../models/post.js'
import User from '../models/user.js'
import { Message } from 'typegram'
import TextMessage = Message.TextMessage
import { Transaction } from '../index.js'
import BigNumber from '../../static/bignumber.js'
import { makeTransactionToUser } from '../../wallet.js'
import { bot } from '../../index.js'

export default async (message: TextMessage): Promise<User | null> => {
  try {
    // eslint-disable-next-line
    if (!message.from?.id) return null
    // todo
    // @ts-expect-error
    // eslint-disable-next-line
    let migrateBalance = migrate[message.from.id] || migrate[message.from.username && message.from.username.toLowerCase()] || 0
    if (migrateBalance < 0) migrateBalance = 0
    const [user, created] = await User.findOrCreate({
      where: {
        userId: message.from.id
      },
      defaults: {
        name: message.from.username,
        firstName: message.from.first_name,
        lastName: message.from.last_name
      }
    })
    // todo implement waitForBotInfo(). while it shouldn't be needed we still want to make sure we're not pushing bogus
    if (bot.botInfo?.id !== null && bot.botInfo?.id !== undefined && created && migrateBalance > 0) {
      if (user.userId === bot.botInfo?.id) {
        const seedTx = await Transaction.create({
          id: -1,
          type: 'DEPOSIT',
          walletAddress: '0',
          walletTxId: '0',
          amount: migrateBalance,
          userId: user.userId,
          transactionTime: new Date(),
          rawTxRpc: { seedTx: true },
          status: 'CONFIRMED'
        }, {
          // @ts-expect-error
          skip: ['walletAddress', 'walletTxId']
        })
        if (seedTx === null) {
          console.log(new Error('Unable to create seed tx for bot.'))
          return null
        }
      } else if ((await user.balance).eq(0)) {
        const botUser = await User.findByPk(bot.botInfo.id)
        if (botUser === null) return null
        await makeTransactionToUser(botUser, BigNumber(migrateBalance), user)
        await user.reload()
      }
    }
    const posts = await Post.findAll({
      where: {
        userId: null,
        'message.from.id': {
          [Op.eq]: message.from.id
        }
      }
    })
    for (const post of posts) {
      await post.update({ userId: message.from.id })
      // await post.reload()
    }
    return user
  } catch (e) {
    console.log(e)
  }
  return null
}
