import './env'

import Web3 from 'web3'
import { EventEmitter } from 'events'

const provider = new Web3.providers.WebsocketProvider(
  process.env.NETWORK_RPC_ENDPOINT as string,
  {
    timeout: 30_000,
    clientConfig: {
      keepalive: true,
      keepaliveInterval: 5_000,
    },
    reconnect: {
      auto: true,
      delay: 5_000,
      maxAttempts: 10,
      onTimeout: false
    }
  },
)

provider.on('connect', () => console.log('[Web3] connected'))
provider.on('closed', () => console.log('[Web3] closed'))
provider.on('error', () => console.log('[Web3] error'))

export const web3 = new Web3(provider)

const oracles = web3.eth.accounts.wallet.add({
  privateKey: process.env.ORACLES_KEY as string,
  address: process.env.ORACLES_ADDRESS as string,
})

web3.eth.defaultAccount = oracles.address

export const debuggableSubscription = (tag: any, emitter: EventEmitter) =>
  emitter
    .on('connected', (id) => console.log(
      `[${tag}] connected (${id})`
    ))
    .on('error', (error) => console.error(
      `[${tag}] error: (${error})`
    ))

export const getFeeData = async () => {
  const block = await web3.eth.getBlock('latest')
  if (!block || !block.baseFeePerGas) {
    return {}
  }
  const maxPriorityFeePerGas = Web3.utils.toBN(Web3.utils.toWei('1.5', 'gwei'))
  const maxFeePerGas = Web3.utils
    .toBN(block.baseFeePerGas)
    .mul(Web3.utils.toBN(2))
    .add(maxPriorityFeePerGas)
  return { maxFeePerGas, maxPriorityFeePerGas }
}
