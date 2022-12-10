import * as networks from './networks.js'
// todo probably move around stuff here. we're better off importing from outside for the most part

let NETWORK, PORT
const { CHAIN, HD_SEED, DB_HOST, WALLET_HOST, WEBHOOK_DOMAIN } = process.env

if (CHAIN === null) {
  // todo we can probably guess from NODE_ENV which chain we're on
  throw new Error('CHAIN is not configured. Go check your environment variables.')
} else {
  switch (CHAIN) {
    case 'main':
      NETWORK = networks.peercoin
      PORT = 9902
      break
    case 'test':
      NETWORK = networks.testnet
      PORT = 9904
      break
    case 'regtest':
      NETWORK = networks.regtest
      PORT = 18443
  }
}

if (HD_SEED === null) {
  throw new Error('HD_SEED is not configured. Go check your environment variables.')
}

if (WEBHOOK_DOMAIN === null) {
  throw new Error('WEBHOOK_DOMAIN is not configured. Go check your environment variables.')
}

const COIN = 1000000

export default {
  CHAIN,
  HD_SEED,
  DB_HOST,
  WALLET_HOST,
  WEBHOOK_DOMAIN,
  NETWORK,
  PORT,
  COIN_NAME: 'Peercoin',
  COIN_TICKER: 'PPC',
  COIN,
  MAX_COIN: 21000000 * COIN,
  CENT: 10000,
  COIN_DP: 6,
  CENT_DP: 4,
  BIGNUM_FORMAT: 6
}
