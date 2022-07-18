import '../utils/env'
import express, { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import Web3 from 'web3'
import { abi as RelayContractorAbi } from '../contracts/abi/RelayContractor.json'
import { RelayContractor } from '../contracts/types'
import { web3 } from '../utils/web3'
import { definitions } from '../types/supabase'

const client = createClient(process.env.DATABASE_URL as string, process.env.DATABASE_KEY as string)

const contract = new web3.eth.Contract(
  RelayContractorAbi as any,
  process.env.CONTRACT_RELAY_CONTRACTOR,
) as any as RelayContractor

const app = express()
app.use(express.json())

const signed = (request: Request, response: Response, next: NextFunction) => {
  const data = request.body?.data
  const signature = request.body?.signature
  if (!data || !signature) {
    response.status(401).json({ error: 'invalid data' })
    return
  }
  const signer = web3.eth.accounts.recover(
    Web3.utils.soliditySha3(JSON.stringify(data)) as string,
    signature,
  )
  if (signer !== process.env.RELAYER_ADDRESS) {
    response.status(401).json({ error: 'invalid signature' })
    return
  }
  next()
}

const submitTransaction = async (profile: string, transactionHash: string) => {
  try {
    const receipt = await web3.eth.getTransactionReceipt(transactionHash)
    if (!receipt) {
      console.error(`No transaction receipt found: ${transactionHash}`)
      return
    }
    const { error } = await client
      .from<definitions['tasks']>('tasks')
      .update({ status: receipt.status ? 'completed' : 'failed' })
      .eq('transaction_hash', transactionHash.toLowerCase())
      .maybeSingle()
    if (error) {
      console.error(error)
    } else {
      const used = Web3.utils.toBN(receipt.gasUsed).mul(Web3.utils.toBN(receipt.effectiveGasPrice))
      console.log(`Submitting usage: ${transactionHash} (fee: ${Web3.utils.fromWei(used)})`)
      await contract.methods.submitUsage(profile, transactionHash, used)
        .send({
          gas: 200_000,
          from: web3.eth.defaultAccount as string,
        })
      console.log(`Confirmed: ${transactionHash}`)
    }
  } catch (e) {
    console.error('Failed to submit transaction', e)
  }
}

const monitorTransaction = async (profile: string, transactionHash: string) => {
  const receipt = await web3.eth.getTransactionReceipt(transactionHash)
  if (receipt) {
    await submitTransaction(profile, transactionHash)
    return
  }
  console.log(`Waiting on transaction: ${transactionHash}`)
  const subscription = web3.eth.subscribe('newBlockHeaders')
  subscription
    .on('error', (error) => {
      console.error('Failed to subscribe to block headers', error)
      subscription.unsubscribe()
    })
    .on('data', async (header) => {
      try {
        const block = await web3.eth.getBlock(header.number)
        const match = block.transactions.find((hash) => hash.toLowerCase() === transactionHash.toLowerCase()) !== undefined
        if (match) {
          subscription.unsubscribe()
          await submitTransaction(profile, transactionHash)
        }
      } catch (e) {
        console.error('Failed to retrieve transaction', e)
        subscription.unsubscribe()
      }
    })
}

app.put('/transaction', signed, (request, response) => {
  const { transactionHash, profile } = request.body?.data
  if (!transactionHash || !profile) {
    response.status(400).json({ error: 'invalid request' })
    return
  }
  monitorTransaction(profile, transactionHash)
  response.status(200).json({})
})

app.use((_request, response) => {
  response.status(404).json({ error: 'invalid route' })
})

app.listen(process.env.OBSERVER_PORT, () => {
  console.log(`Started on ${process.env.OBSERVER_PORT}`)
})
