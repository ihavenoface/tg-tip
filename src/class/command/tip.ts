import Command from './command.js'
import { makeTransactionToUser } from '../../wallet.js'
import g from '../../static/global.js'
import { checkFunds } from '../../db/helpers/index.js'
import { Context } from 'telegraf'
import BigNumber from '../../static/bignumber.js'
import { Post, User } from '../../db/index.js'

// todo add redeem feature. if the person does not have a user id visible for us, we can simply withhold the tip until they decide to sign up
//      this gets rid of creating empty entries

export default class Tip extends Command {
  static REGEXP = /^\/(?<topic>tip|send|give(?:points)?)(?:@[A-Za-z0-9_]{5,32})?(?:.*?\s+(?<amount>[\d.]+)(?<kilo>k)?)?$/
  static HELP_COMMAND = 'tip'
  static SHORT_HELP_TEXT = 'Send funds to user.'

  finalAmount: BigNumber
  constructor (props: { ctx: Context, user: User, post: Post }) {
    super({ ...props, REGEXP: Tip.REGEXP })
  }

  async handleMessage (): Promise<void> {
    // todo reject things like self, certain blocked usernames
    // todo notify user when id is not present / saved. that way one could avoid void tips
    if (!this.isValidCommand) return
    if (this.post.status === 'consumed') return
    if (this.abort !== null) {
      await this.tryEditMessageText(this.abort, this.tl('tipStopped'))
      return
    }
    await this.deletePublicMessage()
    if (this.mentions.length === 0) {
      await this.parseMentions()
    }
    if (this.confirmed === null && this.missingMentions !== null && this.missingMentions.length > 0) {
      // todo only @ted users supported currently
      let category
      let missingUsers
      if (this.missingMentions.length === 1) {
        category = 'missingUserWithMention'
        missingUsers = `@${this.missingMentions[0]}`
      } else {
        category = 'missingUsersWithMention'
        missingUsers = this.missingMentions.reduce((acc, m) => {
          acc += `@${m}\n`
          return acc
        }, '').trim()
      }
      await this.trySendMessage(
        this.user.userId,
        this.tl(category, { missingUsers }),
        {
          parse_mode: 'HTML',
          reply_markup: { force_reply: true }
        }
      )
      return
    }
    if (this.confirmed === null && this.mentions.length === 0) {
      // todo move parsed users here
      await this.trySendMessage(
        this.user.userId,
        this.tl('missingUsers'),
        { reply_markup: { force_reply: true } }
      )
      return
    }
    if (this.confirmed == null && (this.amount === null || (Boolean(this.amount.lt(g.COIN))) || !await checkFunds(this.user, this.amount, BigNumber(0)))) {
      let balance
      try {
        balance = (await this.user.balance).div(g.COIN).toFormat(g.BIGNUM_FORMAT)
      } catch (e) {
        await this.handleError(e as Error)
        return
      }
      await this.trySendMessage(
        this.user.userId,
        this.tl('missingAmountDetailed', { balance }),
        {
          parse_mode: 'HTML',
          reply_markup: { force_reply: true }
        })
    }
    if (this.amount === null) return
    this.finalAmount = this.amount.multipliedBy(this.mentions.length)
    if (this.confirmed === null) {
      let message
      const amount = this.amount.div(g.COIN).toFormat(g.BIGNUM_FORMAT)
      if (this.mentions.length > 1) {
        const total = this.finalAmount.div(g.COIN).toFormat(g.BIGNUM_FORMAT)
        const mentions = this.mentions.reduce((acc, m) => {
          acc += `${this.mentionHTMLString(m)}\n`
          return acc
        }, '').trim()
        message = this.tl('tipConfirmMultiple', { total, mentions, amount })
      } else {
        const mention = this.mentionHTMLString(this.mentions[0])
        message = this.tl('tipConfirm', { amount, mention })
      }
      const balanceAfterConfirm = (await this.user.balance).minus(this.finalAmount).div(g.COIN).toFormat(g.BIGNUM_FORMAT)
      message += `\n${this.tl('balanceAfterConfirm', { balance: balanceAfterConfirm })}`
      // todo include users to remove tick off the list (lule)
      await this.trySendMessage(
        this.user.userId,
        message,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{
                text: this.tl('looksGood'),
                callback_data: 'confirmed'
              }, {
                text: this.tl('nevermind'),
                callback_data: 'abort'
              }] // this.mentions.map(m => {return { text: m.name, callback_data: m.name }}), todo
            ]
          }
        }
      )
      return
    }
    await this.post.update({ status: 'consumed' })
    const success = []
    const failed = []
    let aggSuccessPost = null
    for (const targetUser of this.mentions) {
      if ((await makeTransactionToUser(this.user, this.amount, targetUser)) != null) {
        success.push(targetUser)
      } else {
        failed.push(targetUser)
      }
      let message = ''
      const amount = this.amount.div(g.COIN).toFormat(g.BIGNUM_FORMAT)
      const mentionsSuccess = success.reduce((acc, t) => {
        acc += `${this.mentionHTMLString(t)}\n`
        return acc
      }, '')
      const mentionsFailed = failed.reduce((acc, t) => {
        acc += `${this.mentionHTMLString(t)}\n`
        return acc
      }, '')
      if (success.length > 0) message += this.tl('tipSuccess', { amount, mentions: mentionsSuccess })
      if (failed.length > 0) message += `\n${this.tl('tipFailed', { amount, mentions: mentionsFailed })}`
      if (message.length === 0) message = this.tl('tipUnexpectedError')
      await this.tryEditMessageText(
        this.confirmed,
        message,
        { parse_mode: 'HTML' }
      )
      if (failed.some((target) => target === targetUser)) continue
      let notifyMsg = ''
      const userMention = this.mentionHTMLString(this.user)
      if (success.length > 1) {
        notifyMsg = this.tl('tipNotify', { userMention, amount, mentions: mentionsSuccess })
      } else if (success.length === 1) {
        notifyMsg = this.tl('tipNotify', { userMention, amount, mention: this.mentionHTMLString(targetUser) })
      } else {
        continue
      }
      if (this.post.message.chat.type === 'group' || this.post.message.chat.type === 'supergroup') {
        if (aggSuccessPost === null) {
          aggSuccessPost = await this.trySendMessage(this.post.chatId, notifyMsg, {
            parse_mode: 'HTML',
            disable_notification: true
          })
        } else {
          await this.tryEditMessageText(
            aggSuccessPost,
            notifyMsg,
            { parse_mode: 'HTML' }
          )
        }
        // todo fix typing
      } else if (this.post.message.chat.type === 'private' && Boolean(targetUser?.id)) {
        const post = await targetUser.$get('posts', { limit: 1 })
        // todo do we check for bots?
        if (post === null) return
        await this.trySendMessage(
          targetUser.userId,
          this.tl('tipNotifyPrivate', { user: this.mentionHTMLString(this.user), amount })
        )
      }
    }
  }
}
