import User from '../models/user.js'
import { Message } from 'typegram'
import TextMessage = Message.TextMessage
import PhotoMessage = Message.PhotoMessage

// todo!
const updateUserFromTelegramMessage = async (message: TextMessage | PhotoMessage, user: User): Promise<User | false> => {
  try {
    /* todo
        return await user.update({
            name: message.from.username,
            firstName: message.from.first_name,
            lastName: message.from.last_name,
        });
        */
  } catch (e) {}
  return false
}

export default updateUserFromTelegramMessage
