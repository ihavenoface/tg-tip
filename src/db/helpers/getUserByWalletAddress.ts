import { User, WalletAddress } from '../index.js'

export default async (walletAddress: string): Promise<User | null> => {
  try {
    const wa = await WalletAddress.findOne({
      where: {
        walletAddress
      },
      include: [
        'user'
      ]
    })
    if (wa === null) return null
    // @ts-expect-error
    return wa.user
  } catch (e) {
    return null
  }
}
