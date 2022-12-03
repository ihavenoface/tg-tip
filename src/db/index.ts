import { Sequelize } from 'sequelize-typescript'
import g from '../static/global.js'
import Config from './models/config.js'
import User from './models/user.js'
import Post from './models/post.js'
import CallbackQuery from './models/callbackquery.js'
import WalletAddress from './models/walletaddress.js'
import Tip from './models/tip.js'
import Transaction from './models/transaction.js'
import InlineQuery from './models/inlinequery.js'

const sequelize = new Sequelize({
  host: g.DB_HOST,
  database: 'postgres',
  username: 'postgres',
  password: undefined,
  dialect: 'postgres',
  models: [Config, User, CallbackQuery, InlineQuery, Post, Tip, Transaction, WalletAddress],
  logging: false
})

export {
  sequelize as default,
  Sequelize,
  CallbackQuery,
  InlineQuery,
  Post,
  Tip,
  Transaction,
  User,
  WalletAddress
}
