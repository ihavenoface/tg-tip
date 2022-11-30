/*
import Balance from './command/balance.js'
import { Context } from 'telegraf'
import createUserFromTelegramMessage from '../db/helpers/createUserFromTelegramMessage.js'
import createPostFromTelegramMessage from '../db/helpers/createPostFromTelegramMessage.js'

export default class FilterCommand {
  private readonly ctx: Context
  private readonly text: string
  command: any
  // private messageCommands = [Balance];
  constructor (ctx: Context) {
    /* this.ctx = ctx;
        if (!(this.ctx.message && "text" in this.ctx.message)) return;
        this.text = this.ctx.message.text;
        const maybeCommand = this.seekMatchingCommand();
        if (!maybeCommand) return;
        this.command = maybeCommand;

  }

  private seekMatchingCommand () {
    const commands = [Balance]
    return commands.find(klass => klass.REGEXP && this.text.match(klass.REGEXP))
  }

  // todo rename
  public async init (something: string) {
    if (!((this.ctx.message != null) && 'text' in this.ctx.message)) return
    const user = await createUserFromTelegramMessage(this.ctx.message)
    const post = await createPostFromTelegramMessage(this.ctx.message)
  }
}
*/
