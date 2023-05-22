import { createContext } from 'react'
import { type BigNumberish, utils, ethers } from 'ethers'

import { Status } from './constants'

export type AddEthereumChainParameter = {
  chainId: string
  blockExplorerUrls?: string[]
  chainName?: string
  iconUrls?: string[]
  nativeCurrency?: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrls?: string[]
}

export type TransactionRequest =
  utils.Deferrable<ethers.providers.TransactionRequest>

export type TransactionResponse = ethers.providers.TransactionResponse

export type TransferParameter = TransactionRequest & {
  to: string
  value: BigNumberish
}

export type CallContractMethodParameter = TransactionRequest & {
  contractAddress: string
  abi: any[]
  methodName: string
  params: any[]
}

type MetaMaskInitializing = {
  account: null
  chainId: null
  status: Status.INITIALIZING
}

type MetaMaskUnavailable = {
  account: null
  chainId: null
  status: Status.UNAVAILABLE
}

type MetaMaskNotConnected = {
  account: null
  chainId: string
  status: Status.NOT_CONNECTED
}

type MetaMaskConnecting = {
  account: null
  chainId: string
  status: Status.CONNECTING
}

type MetaMaskConnected = {
  account: string
  chainId: string
  status: Status.CONNECTED
}

export type MetaMaskState =
  | MetaMaskInitializing
  | MetaMaskUnavailable
  | MetaMaskNotConnected
  | MetaMaskConnecting
  | MetaMaskConnected

export type IMetaMaskContext = MetaMaskState & {
  getSigner: () => Promise<ethers.providers.JsonRpcSigner>
  /**
   * Connect the application to MetaMask
   * @returns Array of connected accounts when connection is successful, `null` if method not ready to be used
   */
  connect: () => Promise<string[] | null>
  /**
   * Request addition of a new network
   * @param parameters New chain parameters, see [EIP-3085](https://eips.ethereum.org/EIPS/eip-3085) for full description
   */
  addChain: (parameters: AddEthereumChainParameter) => Promise<void>
  /**
   * Request a switch of network
   * @param chainId Chain ID of the network in hexadecimal
   * @example ```ts
   * // Switch chain to Ethereum Mainnet
   * await context.switchChain("0x1");
   * ```
   */
  switchChain: (chainId: string) => Promise<void>
  transfer: (parameters: TransferParameter) => Promise<TransactionResponse>
  sendTransaction: (tx: TransactionRequest) => Promise<TransactionResponse>
  callContractMethod: (
    parameters: CallContractMethodParameter
  ) => Promise<TransactionResponse>
  ethereum: any
}

export const MetamaskContext = createContext<IMetaMaskContext | undefined>(
  undefined
)
