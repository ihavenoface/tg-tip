import Post from '../models/post.js'
import User from '../models/user.js'
import updateUserFromTelegramMessage from './updateUserFromTelegramMessage.js'
import { Message } from 'typegram'
import TextMessage = Message.TextMessage
import PhotoMessage = Message.PhotoMessage

export default async (message: TextMessage | PhotoMessage, root?: Post): Promise<Post | null> => {
  try {
    let user
    const userId = message.from?.id
    if (userId != null) {
      user = await User.findByPk(userId)
      if (user != null) {
        await updateUserFromTelegramMessage(message, user)
      }
    }
    let replyToPost
    if (message.reply_to_message != null) {
      replyToPost = await Post.findOne({
        where: {
          messageId: message.reply_to_message.message_id,
          chatId: message.reply_to_message.chat.id
        }
      })
    }
    // [post, created]
    const [post] = await Post.findOrCreate({
      where: {
        id: `${message.chat.id}:${message.message_id}`
      },
      defaults: {
        userId: user?.userId,
        rootPostId: root?.id,
        replyToPostId: replyToPost?.id,
        message
      }
    })
    return post
  } catch (e) {
    console.log(e)
  }
  return null
}
