import QRCode from 'qrcode'
import Command from './command.js'
import { ensureWalletAddress } from '../../wallet.js'
import createPostFromTelegramMessage from '../../db/helpers/createPostFromTelegramMessage.js'
import { Context, TelegramError } from 'telegraf'
import { Post, User } from '../../db/index.js'

export default class Deposit extends Command {
  static REGEXP = /^\/(?<topic>g(?:w|etwallet)|deposit|address)/
  static HELP_COMMAND = 'deposit'
  static SHORT_HELP_TEXT = 'Deposit address.'

  constructor (props: { ctx: Context, user: User, post: Post }) {
    super({ ...props, REGEXP: Deposit.REGEXP })
  }

  async handleMessage (): Promise<void> {
    // todo add access / historic view of all addresses
    if (!this.isValidCommand) return
    // todo
    // if (!this.match) return;
    await this.deletePublicMessage()
    const walletAddress = await ensureWalletAddress(this.user)
    if (walletAddress === null) {
      await this.trySendMessage(this.user.userId, this.tl('unableToCreateWalletAddress'))
      return
    }
    const qr = await QRCode.toBuffer(walletAddress, { scale: 8, margin: 2 })
    const caption = this.tl('depositingAddressAlt', { walletAddress })
    try {
      const res = await this.ctx.telegram.sendPhoto(this.user.userId, {
        source: qr,
        filename: `${this.user.name}-${walletAddress}.png`
      }, {
        caption,
        parse_mode: 'HTML'
      })
      await createPostFromTelegramMessage(res, this.post)
      return
    } catch (e) {
      await this.handleError(e as TelegramError)
    }
  }
}
