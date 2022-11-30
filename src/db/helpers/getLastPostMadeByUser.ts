import { User, Post } from '../index.js'

export default async (user: User): Promise<Post | null> => {
  try {
    const [post] = await user.$get('posts', {
      order: [['createdAt', 'DESC']],
      limit: 1
    })
    if (post === null) return null
    return post
  } catch (e) {
    return null
  }
}
