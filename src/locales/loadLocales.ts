import i18next from 'i18next'
import g from '../static/global.js'

// https://core.telegram.org/bots/api#html-style

const coinTicker = g.COIN_TICKER
const coinName = g.COIN_NAME

const resources = {
  en: {
    translation: {
      balance: `💰 Balance: <code>{{balance}}</code> ${coinTicker}.\n⌛ Pending: <code>{{pending}}</code> ${coinTicker}.\n💸 Total tipped: <code>{{tipped}}</code> ${coinTicker}.`,
      depositingAddressAlt: '📖 Your depositing address is: <code>{{walletAddress}}</code>.',
      depositPending: `💰 Incoming deposit (<code>{{amount}}</code> ${coinTicker}):\n{{confirmations}}/{{minConfirmations}} confirmations\nETA {{approximateETA}} min\n<code>{{walletTxId}}</code>.`,
      depositComplete: `💰 Deposit complete: <code>{{amount}}</code> ${coinTicker}.`,
      unableToCreateWalletAddress: 'Unable to create address. Try again later?',
      missingUsersSearch: 'Enter one or more users.', // ...Search should be 1. unique and 2. match with similar strings
      missingUsers: '👤 Enter one or more users.',
      missingUserWithMentionSearch: 'Unable to find user',
      missingUserWithMention: '👤 Unable to find user: {{missingUsers}}.\n\nEnter one or more users.\n\n<i>Make sure the name is referenced properly, and the user has posted in any of the channels this bot is member of.</i>',
      missingUsersWithMention: '👤 Unable to find users:\n{{missingUsers}}\n\nEnter one or more users.\n\n<i>Make sure the names are referenced properly, and the users have posted in any of the channels this bot is member of.</i>',
      missingUsersDetailed: '👤 You have not entered any known telegram users.\nEnter one or more users.',
      missingAmountSearch: 'Enter an amount.',
      missingAmount: '💯 Enter an amount.',
      missingAmountDetailed: `💯 Enter an amount. Available: <code>{{balance}}</code> ${coinTicker}.`,
      missingAddressSearch: `Enter a ${coinName} address.`,
      tipStopped: '❌ Tip stopped.',
      tipConfirm: `💸 Use <code>{{amount}}</code> ${coinTicker} to tip {{- mention}}?`,
      tipSuccess: `✅ Successfully tipped <code>{{amount}}</code> ${coinTicker} to:\n{{- mentions}}.`,
      tipFailed: `❌ Failed to tip <code>{{amount}}</code> ${coinTicker} to:\n{{- mentions}}.`,
      tipUnexpectedError: '❌ Something went wrong while processing your tip.',
      tipConfirmMultiple: `💸 Use <code>{{total}}</code> ${coinTicker} to tip \n{{- mentions}}\n<code>{{amount}}</code> ${coinTicker} each?`,
      tipNotify: `🎉 {{- userMention}} has tipped <code>{{amount}}</code> ${coinTicker} to {{- mention}}.`,
      tipNotifyMultiple: `🎉 {{- userMention}} has tipped <code>{{amount}}</code> ${coinTicker} to:\n{{- mentions}}.`,
      tipNotifyPrivate: `🎉 {{- user}} has tipped <code>{{amount}}</code> ${coinTicker} to you.`,
      balanceAfterConfirm: `Balance after confirmation: <code>{{balance}}</code> ${coinTicker}.`,
      missingWithdrawalAddress: `📖 Enter a ${coinName} address.`,
      missingWithdrawalAddressDetailed: `📖 Enter a ${coinName} address. <code>{{address}}</code> is not valid.`,
      missingWithdrawalAmount: `💯 Enter an amount.\nAvailable: <code>{{available}}</code> ${coinTicker}.\nBalance: <code>{{balance}}</code> ${coinTicker}.\n\n<i>Minimum withdrawal amount: <code>{{minWithdrawal}}</code> ${coinTicker}.</i>\n\n<i>Note that the available amount is deduced by a network fee of approximately <code>{{approxFee}}</code> ${coinTicker}.\nThe real fee can be predicted once you enter a valid amount.</i>`,
      withDrawConfirm: `💸 Send <code>{{amount}}</code> ${coinTicker} + <code>{{fee}}</code> ${coinTicker} fee to <code>{{address}}</code>?.\n`,
      withdrawSuccess: `✅ Successfully sent <code>{{amount}}</code> ${coinTicker} to <code>{{address}}</code> <code>{{txid}}</code>.`,
      withdrawError: '❌ Something went wrong while processing your withdrawal.',
      withdrawalStopped: '❌ Withdrawal stopped.',
      looksGood: '✅ Looks good.',
      nevermind: '❌ Never-mind.',
      lookupOnExplorer: '🔎 Look up on explorer.',
      signUp: '🛫 {{- user}} to start, tap the following button and then tap <b>START</b>.',
      signUpSearch: 'to start, tap the following button and then tap',
      signUpShort: '🛫 Sign up.'
    }
  }
}

export default async function (): Promise<void> {
  await i18next.init({
    lng: 'en',
    fallbackLng: 'en',
    resources,
    debug: false
  }, (err) => {
    const hasError = Boolean(err)
    if (hasError) {
      throw new Error('something went wrong loading')
    }
    // t('key') // -> same as i18next.t
  })
}
