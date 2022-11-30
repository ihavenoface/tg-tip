import zmq from 'zeromq'
import { walletClient, tryToConfirmTransaction, tryToConfirmTransactions } from './wallet.js'

export const listenZmq = async (): Promise<NodeJS.Timeout | undefined> => {
  try {
    const blockchainInfo = await walletClient.getBlockchainInfo()
    if (blockchainInfo.verificationprogress < 0.97) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      return setTimeout(listenZmq, 1000)
    }
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return setTimeout(listenZmq, 1000)
  }
  const sock = zmq.socket('sub')
  // todo get from env
  sock.connect('tcp://peercoind:29000')
  sock.subscribe('hashblock')
  sock.subscribe('hashtx')
  // todo
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  sock.on('message', async (topic: { toString: () => string }, message: { toString: (arg0: string) => string }) => {
    if (topic.toString() === 'hashtx') {
      await tryToConfirmTransaction(message.toString('hex'))
    }
    if (topic.toString() === 'hashblock') {
      await tryToConfirmTransactions()
    }
    // todo this does too much, and we end up spamming quite a bit
    //      maybe filter it out or something
    //      would also be nice to make the input usable at some point
    //      right now we're just poking the detection queue without much behind it
  })
}
