import '../utils/env'
import { abi as RewardTokenAbi } from '../contracts/abi/RewardToken.json'
import { abi as StakedTokenAbi } from '../contracts/abi/StakedToken.json'
import { RewardToken, StakedToken } from '../contracts/types'
import { debuggableSubscription, web3 } from '../utils/web3'
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

  debuggableSubscription(
    'AddedStake',
    stakedTokenContract.events.AddedStake(
      { fromBlock: 'genesis' },
      async (error, event) => {
        if (error) {
          console.error(error)
        } else {
          console.log(event)
          stakers.add(event.returnValues.account)
        }
      },
    ),
  )

  while (true) {
    console.log('Observing')
    await timeout(30 * 60 * 1000)
    for (const staker of Array.from(stakers.values())) {
      try {
        console.log(`Submitting rewards: ${staker}`)
        await rewardTokenContract.methods.submitRewards(
          staker,
          Web3.utils.toWei('0.01', 'ether'),
        ).send({
          gas: 100_000,
          from: web3.eth.defaultAccount as string,
        })
      } catch (e) {
        console.error(e)
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
