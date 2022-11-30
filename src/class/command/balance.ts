import g from '../../static/global.js'
import Command from './command.js'
import { Context } from 'telegraf'
import { Post, User } from '../../db/index.js'

export default class Balance extends Command {
  static REGEXP = /^\/(?<topic>balance)/
  static HELP_COMMAND = 'balance'
  static SHORT_HELP_TEXT = 'Check balance.'

  constructor (props: { ctx: Context, user: User, post: Post }) {
    super({ ...props, REGEXP: Balance.REGEXP })
  }

  async handleMessage (): Promise<void> {
    // todo this does nothing
    if (!this.isValidCommand) return
    await this.deletePublicMessage()
    const balance = (await this.user.balance).div(g.COIN).toFormat(g.BIGNUM_FORMAT)
    const pending = (await this.user.pendingBalance).div(g.COIN).toFormat(g.BIGNUM_FORMAT)
    const tipped = (await this.user.tippedAmount).div(g.COIN).toFormat(g.BIGNUM_FORMAT)
    const text = this.tl('balance', { balance, pending, tipped })
    await this.trySendMessage(this.user.userId, text, { parse_mode: 'HTML' })
  }
}
