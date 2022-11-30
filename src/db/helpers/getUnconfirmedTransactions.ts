import { Transaction } from '../index.js'

export default async (): Promise<Transaction | null> => {
  try {
    const tx = await Transaction.findAll({
      where: {
        status: 'UNCONFIRMED'
      },
      order: [['createdAt', 'DESC']],
      limit: 100
    })
    if (tx === null) return null
    // @ts-expect-error
    return tx
  } catch (e) {
    return null
  }
}
