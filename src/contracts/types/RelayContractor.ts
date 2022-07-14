/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import type BN from "bn.js";
import type { ContractOptions } from "web3-eth-contract";
import type { EventLog } from "web3-core";
import type { EventEmitter } from "events";
import type {
  Callback,
  PayableTransactionObject,
  NonPayableTransactionObject,
  BlockType,
  ContractEventLog,
  BaseContract,
} from "./types";

export interface EventOptions {
  filter?: object;
  fromBlock?: BlockType;
  topics?: string[];
}

export type ExecutedRelayCall = ContractEventLog<{
  profile: string;
  keyManager: string;
  gasUsed: string;
  gasPrice: string;
  0: string;
  1: string;
  2: string;
  3: string;
}>;
export type Initialized = ContractEventLog<{
  version: string;
  0: string;
}>;
export type OwnershipTransferred = ContractEventLog<{
  previousOwner: string;
  newOwner: string;
  0: string;
  1: string;
}>;

export interface RelayContractor extends BaseContract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: ContractOptions
  ): RelayContractor;
  clone(): RelayContractor;
  methods: {
    executeRelayCall(
      keyManager: string,
      gasPrice: number | string | BN,
      signature: string | number[],
      nonce: number | string | BN,
      payload: string | number[]
    ): PayableTransactionObject<{
      success: boolean;
      result: string;
      0: boolean;
      1: string;
    }>;

    fee(): NonPayableTransactionObject<string>;

    initialize(
      owner: string,
      rewardToken: string,
      fee_: number | string | BN
    ): NonPayableTransactionObject<void>;

    owner(): NonPayableTransactionObject<string>;

    quota(profile: string): NonPayableTransactionObject<{
      used: string;
      remaining: string;
      0: string;
      1: string;
    }>;

    renounceOwnership(): NonPayableTransactionObject<void>;

    setFee(newFee: number | string | BN): NonPayableTransactionObject<void>;

    setRewardToken(newRewardToken: string): NonPayableTransactionObject<void>;

    transferOwnership(newOwner: string): NonPayableTransactionObject<void>;
  };
  events: {
    ExecutedRelayCall(cb?: Callback<ExecutedRelayCall>): EventEmitter;
    ExecutedRelayCall(
      options?: EventOptions,
      cb?: Callback<ExecutedRelayCall>
    ): EventEmitter;

    Initialized(cb?: Callback<Initialized>): EventEmitter;
    Initialized(
      options?: EventOptions,
      cb?: Callback<Initialized>
    ): EventEmitter;

    OwnershipTransferred(cb?: Callback<OwnershipTransferred>): EventEmitter;
    OwnershipTransferred(
      options?: EventOptions,
      cb?: Callback<OwnershipTransferred>
    ): EventEmitter;

    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };

  once(event: "ExecutedRelayCall", cb: Callback<ExecutedRelayCall>): void;
  once(
    event: "ExecutedRelayCall",
    options: EventOptions,
    cb: Callback<ExecutedRelayCall>
  ): void;

  once(event: "Initialized", cb: Callback<Initialized>): void;
  once(
    event: "Initialized",
    options: EventOptions,
    cb: Callback<Initialized>
  ): void;

  once(event: "OwnershipTransferred", cb: Callback<OwnershipTransferred>): void;
  once(
    event: "OwnershipTransferred",
    options: EventOptions,
    cb: Callback<OwnershipTransferred>
  ): void;
}
