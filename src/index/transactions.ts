import '../utils/env'
import { createClient } from '@supabase/supabase-js'
import { abi as RelayContractorAbi } from '../contracts/abi/RelayContractor.json'
import { RelayContractor } from '../contracts/types'
import { debuggableSubscription, web3 } from '../utils/web3'
import { definitions } from '../types/supabase'
import { Signal } from '../utils/signal'
import { timeout } from '../utils/timeout'
import { queryLastCheckedBlock, updateLastCheckedBlock } from '../utils/block'

const client = createClient(process.env.DATABASE_URL as string, process.env.DATABASE_KEY as string)

const contract = new web3.eth.Contract(
  RelayContractorAbi as any,
  process.env.CONTRACT_RELAY_CONTRACTOR,
) as any as RelayContractor

type PendingTransaction = {
  transactionHash: string
  blockNumber: number
}

const main = async () => {
  const pendingTransactions: PendingTransaction[] = []
  const signal = new Signal()

  let lastCheckedBlock = await queryLastCheckedBlock(client, contract.options.address)
  const blockNumber = await web3.eth.getBlockNumber()

  debuggableSubscription(
    'ExecutedRelayCall',
    contract.events.ExecutedRelayCall(
      { fromBlock: lastCheckedBlock > blockNumber ? 'latest' : lastCheckedBlock },
      async (error, event) => {
        if (error) {
          console.error(error)
        } else {
          pendingTransactions.push(event)
          signal.notify()
        }
      },
    ),
  )

  let lastProcssedBlock = lastCheckedBlock

  const mayCheckin = async () => {
    if (lastProcssedBlock > lastCheckedBlock) {
      console.log(`Block: ${lastProcssedBlock}`)
      await updateLastCheckedBlock(client, contract.options.address, lastProcssedBlock + 1)
      lastCheckedBlock = lastProcssedBlock
    }
  }

  let retry = 0

  while (true) {
    if (!pendingTransactions.length) {
      console.log('Waiting...')
      await signal.wait()
    }
    try {
      const tx = pendingTransactions[0]
      while (tx) {
        const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash)
        if (receipt) {
          const { data, error } = await client
            .from<definitions['tasks']>('tasks')
            .update({ status: receipt.status ? 'completed' : 'failed' })
            .eq('transaction_hash', tx.transactionHash.toLowerCase())
            .maybeSingle()
          if (error) {
            console.error(error)
          } else if (!data) {
            retry++
            console.log(`Not found (${retry}): ${tx.transactionHash}`)
            if (retry < 10) {
              const delay = 1000 * retry
              console.log(`Retrying in ${delay / 1000}s`)
              await timeout(delay)
              continue
            }
            retry = 0
          } else {
            console.log(`Confirmed: ${tx.transactionHash}`)
          }
          pendingTransactions.shift()
          lastProcssedBlock = tx.blockNumber
          await mayCheckin()
          break
        }
        await timeout(1_000)
      }
    } catch (e) {
      console.error(e)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => {
    client.removeAllSubscriptions()
  })
