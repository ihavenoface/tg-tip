import { Post, User } from '../../db/index.js'
import BigNumber from '../../static/bignumber.js'
import g from '../../static/global.js'
import { Op } from '@sequelize/core'
import {
  createUserFromTelegramMessage,
  createUserFromTelegramMention,
  createPostFromTelegramMessage
} from '../../db/helpers/index.js'
import { Context, TelegramError } from 'telegraf'
import i18next from 'i18next'
import * as tt from 'telegraf/src/telegram-types.js'
import { FmtString } from 'telegraf/format.js'
import { InlineKeyboardMarkup } from 'typegram'

export default class Command {
  protected ctx: Context
  protected user: User
  protected post: Post
  public isValidCommand: boolean
  protected thread: Post[]
  protected mentions: User[]
  protected missingMentions: string[] | null
  protected lng: string
  protected match: RegExpMatchArray | null // todo
  protected amount: BigNumber | null
  protected address: string | null
  protected confirmed: Post | null // todo
  protected abort: Post | null // todo
  REGEXP: RegExp
  constructor (props: { ctx: Context, user: User, post: Post, REGEXP: RegExp }) {
    this.REGEXP = props.REGEXP
    this.ctx = props.ctx
    if (!this.isValid()) {
      return
    }
    this.user = props.user
    this.post = props.post
    this.lng = 'en'
    if (this.ctx.chat?.type === 'private' && ((this.ctx.from?.language_code) != null)) {
      this.lng = this.ctx.from.language_code
    }
    this.mentions = []
    this.missingMentions = null
    this.match = this.post.text.match(this.REGEXP)
    this.confirmed = null
    this.abort = null
    this.parseAmount(this.post.text, this.REGEXP)
    this.isValid()
  }

  private isValid (): boolean {
    // todo
    /* this.isValidCommand = (
      // this.REGEXP
      this.ctx.chat != null &&
        this.ctx.from != null &&
        this.ctx.message != null
    )
    return this.isValidCommand */
    this.isValidCommand = true
    return this.isValidCommand
  }

  protected tl (category: string, options?: object): string {
    return i18next.t(category, { lng: this.lng, ...options })
  }

  async handleUpdate (): Promise<void> {
    if (this.post.status === 'consumed') return
    const posts = this.thread = await this.post.$get('thread', {
      include: [
        'replies',
        'callbackQueries'
      ],
      order: [['id', 'ASC']]
    })
    // todo sort by postId / date of occurrence
    //      probably not needed since we can only have either reply or cbq per post?
    /*
    posts.map(post => {
      const merged = [...post.replies, ...post.callbackQueries]
      merged.forEach(rc => rc.post = post)
      return merged
    })
      .flat()
      .sort((a, b) => a.updatedAt - b.updatedAt)
    */
    for (const post of posts) {
      await this._handleReplies(post)
      this._handleCallbackQueries(post)
    }
    await this.handleMessage()
  }

  async _handleReplies (post: Post): Promise<void> {
    const { replies } = post
    for (const reply of replies) {
      const { message } = reply
      if (post.text.includes(this.tl('missingUsersSearch')) || post.text.includes(this.tl('missingUserWithMentionSearch'))) {
        await this.parseMentions(message)
      } else if (post.text.includes(this.tl('missingAmountSearch'))) {
        this.parseAmount(message.text, /\s*(?<amount>[\d.]+)(?<kilo>k)?/)
        // todo string vars
      } else if (post.text.includes(this.tl('missingAddressSearch'))) {
        this.address = message.text
      }
      this.handleReply(post, reply)
    }
  }

  handleReply (a: Post, b: Post): void {}

  _handleCallbackQueries (post: Post): void {
    const { callbackQueries } = post
    for (const callbackQuery of callbackQueries) {
      const { data } = callbackQuery
      if (data === null) continue
      if (data === 'confirmed') { this.confirmed = post }
      if (data === 'abort') { this.abort = post }
      this.handleCallbackQuery(post, callbackQuery)
    }
  }

  handleCallbackQuery (a: any, b: any): void {}

  async parseMentions (message = this.post.message): Promise<void> {
    // todo possibly filter out this.user
    this.mentions = []
    if (message.entities == null) return
    const mentions = [...new Set(
      message.entities
        .filter(({ type }) => type === 'mention')
        .map(({ length, offset }) => message.text.slice(offset, length + offset))
        .filter((mention) => mention)
        .map((mention) => mention.replace(/^@/, ''))
    )]
    const textMentions = message.entities
      .filter((mention) => mention.type === 'text_mention' && 'user' in mention)
    if (mentions.length <= 0 && textMentions.length <= 0) return
    // a bit weird that ts requires us to filter for *again*
    const textMentionIds = textMentions.map(mention => 'user' in mention && mention.user.id)

    let usersA: User[] = []
    let usersB: User[] = []
    if (textMentions.length > 0) {
      usersA = await User.findAll({
        where: {
          userId: textMentionIds
        }
      })
    }
    if (mentions.length > 0) {
      usersB = await User.findAll({
        where: {
          name: {
            [Op.iLike]: {
              [Op.any]: mentions
            }
          }
        }
      })
    }
    const users = [...usersA, ...usersB]
    // if (users.length === 0) return

    const foundMentions = users.filter(({ name }) => name)
    const foundTextMentions = users.filter(({ name }) => Boolean(name))

    const foundNames = foundMentions.map(({ name }) => name.toLowerCase())
    const missingMentions = mentions.filter(name => !foundNames.includes(name.toLowerCase()))
    const unableToCreate = []
    if (missingMentions[0] !== undefined) {
      for (const missing of missingMentions) {
        const post = await Post.findOne({
          where: {
            name: {
              [Op.iLike]: missing
            }
          },
          order: [['createdAt', 'DESC']],
          include: ['user']
        })
        if (post === null) {
          unableToCreate.push(missing)
        } else {
          const user = await createUserFromTelegramMessage(post.message)
          if (user != null) users.push(user)
        }
      }
    }

    const foundIds = foundTextMentions.map(({ id }) => id)
    const missingTextMentions = textMentions.filter((mention) => 'user' in mention && !foundIds.includes(mention.user.id))
    if (missingTextMentions[0] !== undefined) {
      for (const missing of missingTextMentions) {
        const user = await createUserFromTelegramMention(missing)
        if (user !== null) users.push(user)
        // todo in case we want to include this type we need to split / filter the text and compare it to the remaining missing users
      }
    }
    this.mentions = users
    this.missingMentions = unableToCreate
  }

  parseAmount (str: string, regexp: RegExp): void {
    const match = str.match(regexp)
    if (match === null || match.groups === null || match.groups === undefined) {
      this.amount = null
      return
    }
    const { amount, kilo } = match.groups
    this.amount = BigNumber(amount).abs().dp(g.COIN_DP).multipliedBy(g.COIN)
    if (!this.amount.isPositive() || this.amount.isNegative() || this.amount.isZero() || this.amount.isNaN()) {
      this.amount = null
      return
    }
    // todo more ops here
    if (kilo === 'k') {
      this.amount = this.amount.multipliedBy(1000)
    }
  }

  async deletePublicMessage (): Promise<boolean> {
    if (!this.isValidCommand) return false
    if (this.ctx.chat == null) return false
    if (this.post.deleted || this.ctx.chat.type === 'private') {
      return false
    }
    try {
      await this.ctx.telegram.deleteMessage(this.post.chatId, this.post.messageId)
      await this.post.update({ deleted: true })
      return true
    } catch (e) {
      // todo forward for error inspection
      // console.log('meh');
      return false
    }
  }

  // todo rework
  mentionHTMLString (user: User): string {
    return `<a href="tg://user?id=${user.userId}">${(user.name !== '') ? '@' : ''}${((user.name !== '') ? user.name : `${user.firstName}${(user.lastName !== '') ? ` ${user.lastName}` : ''}`)}</a>`
  }

  async askUserToSignup (): Promise<void> {
    if (this.post.chatId == null) return
    try {
      const prevSignupMessage = await Post.findOne({
        where: {
          chatId: this.post.chatId,
          name: this.ctx.me,
          text: {
            // todo this breaks on lng swap, since it's public
            [Op.like]: `%${this.tl('signUpSearch')}%`
          }
        },
        attributes: ['messageId'],
        order: [['createdAt', 'DESC']]
      })
      if ((prevSignupMessage != null) && !prevSignupMessage.deleted) {
        try {
          await this.ctx.telegram.deleteMessage(this.post.chatId, prevSignupMessage.messageId)
          await prevSignupMessage.update({ deleted: true })
        } catch (e) {}
      }
      const res = await this.ctx.telegram.sendMessage(
        this.post.chatId,
        this.tl('signUp', { user: this.mentionHTMLString(this.user) }),
        {
          parse_mode: 'HTML',
          disable_notification: true,
          reply_markup: {
            inline_keyboard: [[{
              text: this.tl('signUpShort'),
              url: `https://t.me/${this.ctx.me}?start`
            }]]
          }
        }
      )
      await createPostFromTelegramMessage(res, this.post)
    } catch (e) {}
  }

  async handleMessage (): Promise<void> {}

  async handleError (e: Error | TelegramError): Promise<void> {
    // todo error forwarding
    if (
      (this.post.message.chat.type === 'group' || this.post.message.chat.type === 'supergroup') &&
      /(ETELEGRAM: )?403:? Forbidden: bot (was blocked by the|can't initiate conversation with a) user/.test(e.message)
    ) {
      await this.askUserToSignup()
    }
    console.error(e)
  }

  async trySendMessage (
    chatId: number | string,
    text: string | FmtString,
    extra?: tt.ExtraReplyMessage
  ): Promise<Post | null> {
    try {
      const res = await this.ctx.telegram.sendMessage(chatId, text, extra)
      return await createPostFromTelegramMessage(res, this.post)
    } catch (e) {
      await this.handleError(e as TelegramError)
      return null
    }
  }

  async tryEditMessageText (
    post: Post,
    text: string | FmtString,
    extra?: tt.ExtraEditMessageText
  ): Promise<boolean> {
    try {
      const res = await this.ctx.telegram.editMessageText(post.chatId, post.messageId, undefined, text, extra)
      if (typeof res === 'object' && res.text.length > 0) {
        await post.update({ message: res })
        await post.reload()
        return true
      } else {
        return false
      }
    } catch (e) {
      await this.handleError(e as TelegramError)
      return false
    }
  }

  async tryEditMessageReplyMarkup (
    post: Post,
    markup: InlineKeyboardMarkup | undefined
  ): Promise<boolean> {
    try {
      const res = await this.ctx.telegram.editMessageReplyMarkup(post.chatId, post.messageId, undefined, markup)
      // todo update post
      return typeof res === 'object'
    } catch (e) {
      await this.handleError(e as TelegramError)
      return false
    }
  }
}
