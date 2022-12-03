// import rateLimit from 'telegraf-ratelimit'
import { walletClient } from './wallet.js'
import { Telegraf } from 'telegraf'
import g from './static/global.js'
import * as db from './db/index.js'
import loadLocales from './locales/loadLocales.js'
import Balance from './class/command/balance.js'
import Deposit from './class/command/deposit.js'
import Withdraw from './class/command/withdraw.js'
import Tip from './class/command/tip.js'
import createUserFromTelegramMessage from './db/helpers/createUserFromTelegramMessage.js'
import createPostFromTelegramMessage from './db/helpers/createPostFromTelegramMessage.js'
import { Post, User } from './db/index.js'
import { Message } from 'typegram'
import TextMessage = Message.TextMessage
import createCallbackQueryFromTelegramMessage from './db/helpers/createCallbackQueryFromTelegramMessage.js'
import { listenZmq } from './zeromq.js'

let initDone = false

if (process.env.TELEGRAM_TOKEN == null) {
  throw (new Error('TELEGRAM_TOKEN is not set.'))
}

const bot = new Telegraf(process.env.TELEGRAM_TOKEN)
/*
const limitConfig = {
  window: 3000,
  limit: 1,
  // todo translate
  onLimitExceeded: (ctx: any) => ctx.reply('Rate limit exceeded')
}
bot.use(rateLimit(limitConfig))
*/
void (async () => {
  await db.default.sync({ force: false })
  await loadLocales()
  let walletLoaded = false
  try {
    await walletClient.createWallet('tipbot')
    await walletClient.setHdSeed(true, g.HD_SEED)
    await walletClient.rescanBlockchain()
    walletLoaded = true
  } catch (e) {
    console.log(e)
  }
  if (!walletLoaded) {
    try {
      await walletClient.loadWallet('tipbot')
    } catch (e) {
      console.log(e)
    }
  }
  await walletClient.getWalletInfo()
  await listenZmq()
  initDone = true
})()

const commands = [Balance, Deposit, Tip, Withdraw].map(klass => {
  return { command: klass.HELP_COMMAND, description: klass.SHORT_HELP_TEXT }
})

void bot.telegram.setMyCommands(commands)

bot.on('text', async (ctx) => {
  if (!initDone) return
  // todo
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  await createUserFromTelegramMessage({ from: { ...ctx.botInfo } } as unknown as TextMessage)
  // todo we're currently double storing / querying these
  const user = await createUserFromTelegramMessage(ctx.message)
  const post = await createPostFromTelegramMessage(ctx.message)
  if (user === null || post === null) return
  if ('reply_to_message' in ctx.message) return await handleReplyToMessage(ctx)
  const Klass = [Balance, Deposit, Tip, Withdraw]
    .find((klass) => ctx.message.text.match(klass.REGEXP))
  if (Klass == null) return
  const instance = new Klass({ ctx, user, post })
  await instance.handleMessage()
})

const handleReplyToMessage = async (ctx: any): Promise<void> => {
  // todo possibly disable past commands once entering a new conversation
  if (ctx.message?.reply_to_message === null) return
  const post = await Post.findOne({
    where: {
      // todo we can probably just search by primary key as well
      messageId: ctx.message.reply_to_message.message_id,
      chatId: ctx.message.reply_to_message.chat.id
    }
  })
  // todo better error handling
  if (post === null) return console.error('something went wrong')
  const root = await post.$get('rootPost')
  if (root === null) return console.error('something went wrong')
  // todo somewhere in there Post model there's a circular dependency, so we force User here for the time being
  const user = await root.$get('user') as unknown as User | null
  if (user === null) return
  await createPostFromTelegramMessage(ctx.message, root)
  const Klass = [Tip, Withdraw]
    .find((klass) => root.message.text.match(klass.REGEXP))
  if (Klass == null) return
  // todo const instance = new Klass({ ctx, user, post: root, message: root.message })
  //      note how the extra message assignment is missing here. i'm not sure at this point if it's even needed
  const instance = new Klass({ ctx, user, post: root })
  await instance.handleUpdate()
}

bot.on('callback_query', async (ctx) => {
  const callbackQuery = await createCallbackQueryFromTelegramMessage(ctx.update.callback_query)
  if (callbackQuery == null) return console.error('something went wrong')
  const user = await callbackQuery.$get('user')
  if (user === null) return console.error('something went wrong')
  const root = await callbackQuery.$get('rootPost')
  if (root === null) return console.error('something went wrong')
  const Klass = [Tip, Withdraw]
  // @ts-expect-error
    .find((klass) => root.message.text.match(klass.REGEXP))
  // @ts-expect-error
  const instance = new Klass({ ctx, user, post: root })
  await instance.handleUpdate()
})

/*
bot.on('inline_query', async (ctx) => {
  console.log(ctx)
  const user = await createUserFromTelegramMessage({ from: { ...ctx.update.inline_query.from } } as unknown as TextMessage)
  if (user == null) return
  const inlineQuery = await InlineQuery.create({
    id: ctx.update.update_id,
    message: ctx.update.inline_query,
    userId: user.userId
  })
  await ctx.answerInlineQuery([
    {
      type: 'article',
      id: 'grammy-website',
      title: 'grammY',
      input_message_content: {
        message_text: 'test here',
        parse_mode: 'HTML'
      },
      url: 'https://some.url/',
      description: 'something.'
    }
  ])
  console.log(inlineQuery)
})
*/

void bot.launch()
/*
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
*/

export {
  bot
}
