import '../utils/env'
import { createClient } from '@supabase/supabase-js'
import { abi as RelayContractorAbi } from '../contracts/abi/RelayContractor.json'
import { RelayContractor } from '../contracts/types'
import { debuggableSubscription, web3 } from '../utils/web3'
import { definitions } from '../types/supabase'
import { Signal } from '../utils/signal'
import { timeout } from '../utils/timeout'
import { queryLastCheckedBlock, updateLastCheckedBlock } from '../utils/block'
import Web3 from 'web3'

const client = createClient(process.env.DATABASE_URL as string, process.env.DATABASE_KEY as string)

const contract = new web3.eth.Contract(
  RelayContractorAbi as any,
  process.env.CONTRACT_RELAY_CONTRACTOR,
) as any as RelayContractor

type ExecutedTransaction = {
  profile: string
  transactionHash: string
  blockNumber: number
}

const main = async () => {
  const executedTransactions: ExecutedTransaction[] = []
  const signal = new Signal()

  let lastCheckedBlock = await queryLastCheckedBlock(client, contract.options.address)
  const blockNumber = await web3.eth.getBlockNumber()

  debuggableSubscription(
    'Executed',
    contract.events.Executed(
      { fromBlock: lastCheckedBlock > blockNumber ? 'latest' : lastCheckedBlock },
      async (error, event) => {
        if (error) {
          console.error(error)
        } else {
          executedTransactions.push({
            profile: event.returnValues.profile,
            transactionHash: Web3.utils.toHex(event.returnValues.transaction),
            blockNumber: event.blockNumber,
          })
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

  let retryUpdate = 0

  while (true) {
    if (!executedTransactions.length) {
      console.log('Waiting...')
      await signal.wait()
    }
    try {
      const tx = executedTransactions[0]
      const transaction = await web3.eth.getTransaction(tx.transactionHash)
      if (!transaction) {
        console.error(`Invalid transaction: ${tx.transactionHash}`)
        executedTransactions.shift()
        continue
      }
      while (transaction) {
        const receipt = await web3.eth.getTransactionReceipt(transaction.hash)
        if (receipt) {
          const { data, error } = await client
            .from<definitions['tasks']>('tasks')
            .update({ status: receipt.status ? 'completed' : 'failed' })
            .eq('transaction_hash', transaction.hash.toLowerCase())
            .maybeSingle()
          if (error) {
            console.error(error)
          } else if (!data) {
            retryUpdate++
            console.log(`Not found (${retryUpdate}): ${transaction.hash}`)
            if (retryUpdate < 10) {
              const delay = 1000 * retryUpdate
              console.log(`Retrying in ${delay / 1000}s`)
              await timeout(delay)
              continue
            }
            retryUpdate = 0
          } else {
            const used = Web3.utils.toBN(receipt.gasUsed).mul(Web3.utils.toBN(receipt.effectiveGasPrice))
            console.log(`Submitting usage: ${transaction.hash} (fee: ${Web3.utils.fromWei(used)})`)
            try {
              await contract.methods.submitUsage(transaction.hash, used).send({
                gas: 100_000,
                from: web3.eth.defaultAccount as string,
              })
            } catch (e) {
              console.error(e)
            }
            console.log(`Confirmed: ${transaction.hash}`)
          }
          executedTransactions.shift()
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
