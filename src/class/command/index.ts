/* todo
import Balance from './balance.js'
import { Context } from 'telegraf'
import createUserFromTelegramMessage from '../../db/helpers/createUserFromTelegramMessage.js'
import createPostFromTelegramMessage from '../../db/helpers/createPostFromTelegramMessage.js'

export default () => {
  let instance: Balance | false

  const create = async (props: { ctx: Context }) => {
    if (!((props.ctx.message != null) && 'text' in props.ctx.message)) return false
    const user = await createUserFromTelegramMessage(props.ctx.message)
    const post = await createPostFromTelegramMessage(props.ctx.message)
    if (!((user != null) && (post != null))) return false
    return new Balance({ ctx: props.ctx, user, post })
  }

  return {
    init: async (props: { ctx: Context }) => {
      if (!instance) {
        instance = await create(props)
      }
      return instance
    }
  }
}
*/
