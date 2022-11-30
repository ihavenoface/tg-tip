import createUserFromTelegramMessage from './createUserFromTelegramMessage.js'
import { User } from '../index.js'

// todo
// @ts-expect-error
export default async (mention): Promise<User | null> => {
  // eslint-disable-next-line
  if (!mention?.user?.id) return null
  // @ts-expect-error
  return await createUserFromTelegramMessage({ from: mention.user })
}
