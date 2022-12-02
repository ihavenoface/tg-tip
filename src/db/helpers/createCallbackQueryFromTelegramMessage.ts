import { Post } from '../index.js'
import CallbackQuery from '../models/callbackquery.js'

export default async (callbackQuery: any): Promise<CallbackQuery | null> => {
  // todo
  // eslint-disable-next-line
  if (!(callbackQuery.message && callbackQuery.message.message_id)) return null
  try {
    const post = await Post.findOne({
      where: {
        // eslint-disable-next-line
        id: `${callbackQuery.message.chat.id}:${callbackQuery.message.message_id}`
      }
    })
    if (post === null) return null
    return await CallbackQuery.create({
      id: callbackQuery.id,
      userId: callbackQuery.from.id,
      postId: post.postId,
      // @ts-expect-error
      rootPostId: post.rootPostId,
      message: callbackQuery
    })
  } catch (e) {
    return null
  }
}
