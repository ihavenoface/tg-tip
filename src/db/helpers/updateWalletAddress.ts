import { User, WalletAddress } from '../index.js'

export default async (user: User, walletAddress: string): Promise<WalletAddress | null> => {
  const userExists = Boolean(user)
  if (!userExists) return null
  try {
    return await WalletAddress.create({
      userId: user.userId,
      walletAddress
    })
  } catch (e) {
    console.error(e)
    return null
  }
}
