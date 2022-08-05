import '../utils/env'
import { abi as RewardTokenAbi } from '../contracts/abi/RewardToken.json'
import { abi as StakedTokenAbi } from '../contracts/abi/StakedToken.json'
import { RewardToken, StakedToken } from '../contracts/types'
import { debuggableSubscription, web3, getFeeData } from '../utils/web3'
import { timeout } from '../utils/timeout'
import Web3 from 'web3'

const rewardTokenContract = new web3.eth.Contract(
  RewardTokenAbi as any,
  process.env.CONTRACT_REWARD_TOKEN,
) as any as RewardToken

const stakedTokenContract = new web3.eth.Contract(
  StakedTokenAbi as any,
  process.env.CONTRACT_STAKED_TOKEN,
) as any as StakedToken

const main = async () => {
  const stakers = new Set<string>()

  let nonce = await web3.eth.getTransactionCount(web3.eth.defaultAccount as string)
  console.log(`Nonce: ${nonce}`)

  const submitRewards = async (account: string) => {
    try {
      const amount = Web3.utils.toWei('0.01', 'ether')
      const submitRewards = rewardTokenContract.methods.submitRewards(account, amount)
      const { maxFeePerGas, maxPriorityFeePerGas } = await getFeeData()
      console.log(`Submitting rewards: ${account} (${Web3.utils.fromWei(amount, 'ether')} rLYX), fees: ${maxFeePerGas} (${maxPriorityFeePerGas})`)
      const { transactionHash } = await submitRewards.send({
        from: web3.eth.defaultAccount as string,
        gas: 100_000,
        nonce: nonce++,
        maxFeePerGas,
        maxPriorityFeePerGas
      })
      console.log(`Tx hash: ${account} - ${transactionHash}`)
    } catch (e) {
      console.error(e)
    }
  }

  debuggableSubscription(
    'AddedStake',
    stakedTokenContract.events.AddedStake(
      { fromBlock: 'genesis' },
      async (error, event) => {
        if (error) {
          console.error(error)
        } else {
          const staker = event.returnValues.account.toLowerCase()
          if (!stakers.has(staker)) {
            console.log(`New staker: ${staker}`)
            stakers.add(staker)
          }
        }
      },
    ),
  )

  console.log('Warming up...')
  await timeout(10 * 1000)

  while (true) {
    console.log('Waiting...')
    Array.from(stakers.values()).forEach((account) => submitRewards(account))
    await timeout(60 * 60 * 1000)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
