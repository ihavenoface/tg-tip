import i18next from 'i18next'
import g from '../static/global.js'

// https://core.telegram.org/bots/api#html-style

const coinTicker = g.COIN_TICKER
const coinName = g.COIN_NAME

const resources = {
  en: {
    translation: {
      balance: `š° Balance: <code>{{balance}}</code> ${coinTicker}.\nā Pending: <code>{{pending}}</code> ${coinTicker}.\nšø Total tipped: <code>{{tipped}}</code> ${coinTicker}.`,
      depositingAddressAlt: 'š Your depositing address is: <code>{{walletAddress}}</code>.',
      depositPending: `š° Incoming deposit (<code>{{amount}}</code> ${coinTicker}):\n{{confirmations}}/{{minConfirmations}} confirmations\nETA {{approximateETA}} min\n<code>{{walletTxId}}</code>.`,
      depositComplete: `š° Deposit complete: <code>{{amount}}</code> ${coinTicker}.`,
      unableToCreateWalletAddress: 'Unable to create address. Try again later?',
      missingUsersSearch: 'Enter one or more users.', // ...Search should be 1. unique and 2. match with similar strings
      missingUsers: 'š¤ Enter one or more users.',
      missingUserWithMentionSearch: 'Unable to find user',
      missingUserWithMention: 'š¤ Unable to find user: {{missingUsers}}.\n\nEnter one or more users.\n\n<i>Make sure the name is referenced properly, and the user has posted in any of the channels this bot is member of.</i>',
      missingUsersWithMention: 'š¤ Unable to find users:\n{{missingUsers}}\n\nEnter one or more users.\n\n<i>Make sure the names are referenced properly, and the users have posted in any of the channels this bot is member of.</i>',
      missingUsersDetailed: 'š¤ You have not entered any known telegram users.\nEnter one or more users.',
      missingAmountSearch: 'Enter an amount.',
      missingAmount: 'šÆ Enter an amount.',
      missingAmountDetailed: `šÆ Enter an amount. Available: <code>{{balance}}</code> ${coinTicker}.`,
      missingAddressSearch: `Enter a ${coinName} address.`,
      tipStopped: 'ā Tip stopped.',
      tipConfirm: `šø Use <code>{{amount}}</code> ${coinTicker} to tip {{- mention}}?`,
      tipSuccess: `ā Successfully tipped <code>{{amount}}</code> ${coinTicker} to:\n{{- mentions}}.`,
      tipFailed: `ā Failed to tip <code>{{amount}}</code> ${coinTicker} to:\n{{- mentions}}.`,
      tipUnexpectedError: 'ā Something went wrong while processing your tip.',
      tipConfirmMultiple: `šø Use <code>{{total}}</code> ${coinTicker} to tip \n{{- mentions}}\n<code>{{amount}}</code> ${coinTicker} each?`,
      tipNotify: `š {{- userMention}} has tipped <code>{{amount}}</code> ${coinTicker} to {{- mention}}.`,
      tipNotifyMultiple: `š {{- userMention}} has tipped <code>{{amount}}</code> ${coinTicker} to:\n{{- mentions}}.`,
      tipNotifyPrivate: `š {{- user}} has tipped <code>{{amount}}</code> ${coinTicker} to you.`,
      balanceAfterConfirm: `Balance after confirmation: <code>{{balance}}</code> ${coinTicker}.`,
      missingWithdrawalAddress: `š Enter a ${coinName} address.`,
      missingWithdrawalAddressDetailed: `š Enter a ${coinName} address. <code>{{address}}</code> is not valid.`,
      missingWithdrawalAmount: `šÆ Enter an amount.\nAvailable: <code>{{available}}</code> ${coinTicker}.\nBalance: <code>{{balance}}</code> ${coinTicker}.\n\n<i>Minimum withdrawal amount: <code>{{minWithdrawal}}</code> ${coinTicker}.</i>\n\n<i>Note that the available amount is deduced by a network fee of approximately <code>{{approxFee}}</code> ${coinTicker}.\nThe real fee can be predicted once you enter a valid amount.</i>`,
      withDrawConfirm: `šø Send <code>{{amount}}</code> ${coinTicker} + <code>{{fee}}</code> ${coinTicker} fee to <code>{{address}}</code>?.\n`,
      withdrawSuccess: `ā Successfully sent <code>{{amount}}</code> ${coinTicker} to <code>{{address}}</code> <code>{{txid}}</code>.`,
      withdrawError: 'ā Something went wrong while processing your withdrawal.',
      withdrawalStopped: 'ā Withdrawal stopped.',
      looksGood: 'ā Looks good.',
      nevermind: 'ā Never-mind.',
      lookupOnExplorer: 'š Look up on explorer.',
      signUp: 'š« {{- user}} to start, tap the following button and then tap <b>START</b>.',
      signUpSearch: 'to start, tap the following button and then tap',
      signUpShort: 'š« Sign up.'
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
