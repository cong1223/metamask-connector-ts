import { useReducer, useEffect, useCallback, useMemo } from 'react'
import { ethers } from 'ethers'

import {
  IMetaMaskContext,
  MetaMaskState,
  MetamaskContext,
  type AddEthereumChainParameter,
  type TransferParameter,
  type CallContractMethodParameter,
  type TransactionRequest
} from './metamask-context'
import { Action, reducer } from './reducer'
import { useSafeDispatch } from './utils/useSafeDispatch'
import { Status } from './constants'

type ErrorWithCode = {
  code: number
  [key: string]: any
}
// MetaMask - RPC Error: Request of type 'wallet_requestPermissions' already pending for origin [origin]. Please wait.
const ERROR_CODE_REQUEST_PENDING = -32002

type WindowInstanceWithEthereum = Window &
  typeof globalThis & { ethereum?: any }

function getMetaMaskProvider() {
  const ethereum = (window as WindowInstanceWithEthereum).ethereum
  if (!ethereum) return null
  // The `providers` field is populated
  // - when CoinBase Wallet extension is also installed
  // - when user is on Brave and Brave Wallet is not deactivated
  // The expected object is an array of providers, the MetaMask provider is inside
  // See https://docs.cloud.coinbase.com/wallet-sdk/docs/injected-provider-guidance for more information
  // See also https://metamask.zendesk.com/hc/en-us/articles/360038596792-Using-Metamask-wallet-in-Brave-browser
  if (Array.isArray(ethereum.providers)) {
    const metaMaskProvider = ethereum.providers.find(
      (p: any) => p.isMetaMask && !p.isBraveWallet
    )
    if (metaMaskProvider) return metaMaskProvider
    const braveWalletProvider = ethereum.providers.find(
      (p: any) => p.isMetaMask && p.isBraveWallet
    )
    if (!braveWalletProvider) return null
    return braveWalletProvider
  }
  if (!ethereum.isMetaMask) return null
  return ethereum
}

function getSafeMetaMaskProvider() {
  const ethereum = getMetaMaskProvider()
  if (!ethereum) {
    throw new Error(
      'MetaMask provider must be present in order to use this method'
    )
  }
  return ethereum
}

async function getSigner() {
  const ethereum = getMetaMaskProvider()
  if (!ethereum) {
    return Promise.reject('metaMaskUnavailable')
  }
  const signer = await new ethers.providers.Web3Provider(ethereum).getSigner()
  return signer
}

async function synchronize(dispatch: (action: Action) => void) {
  const ethereum = getMetaMaskProvider()
  if (!ethereum) {
    dispatch({ type: 'metaMaskUnavailable' })
    return
  }

  const chainId: string = await ethereum.request({
    method: 'eth_chainId'
  })

  const accessibleAccounts: string[] = await ethereum.request({
    method: 'eth_accounts'
  })

  if (accessibleAccounts.length === 0) {
    dispatch({ type: 'metaMaskNotConnected', payload: { chainId } })
  } else {
    dispatch({
      type: 'metaMaskConnected',
      payload: { accounts: accessibleAccounts, chainId }
    })
  }
}

function subscribeToManualConnection(dispatch: (action: Action) => void) {
  const ethereum = getSafeMetaMaskProvider()
  const onAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) return
    const chainId: string = await ethereum.request({
      method: 'eth_chainId'
    })
    dispatch({
      type: 'metaMaskConnected',
      payload: {
        accounts,
        chainId
      }
    })
  }
  ethereum.on('accountsChanged', onAccountsChanged)
  return () => {
    ethereum.removeListener('accountsChanged', onAccountsChanged)
  }
}

function subsribeToAccountsChanged(dispatch: (action: Action) => void) {
  const ethereum = getSafeMetaMaskProvider()
  const onAccountsChanged = (accounts: string[]) =>
    dispatch({ type: 'metaMaskAccountsChanged', payload: accounts })
  ethereum.on('accountsChanged', onAccountsChanged)
  return () => {
    ethereum.removeListener('accountsChanged', onAccountsChanged)
  }
}

function subscribeToChainChanged(dispatch: (action: Action) => void) {
  const ethereum = getSafeMetaMaskProvider()
  const onChainChanged = (chainId: string) =>
    dispatch({ type: 'metaMaskChainChanged', payload: chainId })
  ethereum.on('chainChanged', onChainChanged)
  return () => {
    ethereum.removeListener('chainChanged', onChainChanged)
  }
}

function requestAccounts(
  dispatch: (action: Action) => void
): Promise<string[]> {
  const ethereum = getSafeMetaMaskProvider()

  dispatch({ type: 'metaMaskConnecting' })

  /**
   * Note about the pattern
   * Instead of only relying on the RPC Request response, the resolve of the promise may happen based from a polling
   * using the eth_accounts rpc endpoint.
   * The reason for this change is in order to handle pending connection request on MetaMask side.
   * See https://github.com/VGLoic/metamask-react/issues/13 for the full discussion.
   * Any improvements on MetaMask side on this behaviour that could allow to go back to the previous, simple and safer, pattern
   * should trigger the update of this code.
   */

  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      const accounts = await ethereum.request({
        method: 'eth_accounts'
      })
      if (accounts.length === 0) return
      clearInterval(intervalId)
      const chainId: string = await ethereum.request({
        method: 'eth_chainId'
      })
      dispatch({ type: 'metaMaskConnected', payload: { accounts, chainId } })
      resolve(accounts)
    }, 200)
    ethereum
      .request({
        method: 'eth_requestAccounts'
      })
      .then(async (accounts: string[]) => {
        clearInterval(intervalId)
        const chainId: string = await ethereum.request({
          method: 'eth_chainId'
        })
        dispatch({ type: 'metaMaskConnected', payload: { accounts, chainId } })
        resolve(accounts)
      })
      .catch((err: unknown) => {
        if ('code' in (err as { [key: string]: any })) {
          if ((err as ErrorWithCode).code === ERROR_CODE_REQUEST_PENDING) return
        }
        dispatch({ type: 'metaMaskPermissionRejected' })
        clearInterval(intervalId)
        reject(err)
      })
  })
}

async function addEthereumChain(parameters: AddEthereumChainParameter) {
  const ethereum = getSafeMetaMaskProvider()
  try {
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [parameters]
    })
  } catch (err: unknown) {
    if ('code' in (err as { [key: string]: any })) {
      if ((err as ErrorWithCode).code === ERROR_CODE_REQUEST_PENDING) return
    }
    throw err
  }
}

async function sendTransaction(tx: TransactionRequest) {
  try {
    const signer = await getSigner()
    return await signer.sendTransaction(tx)
  } catch (error) {
    return Promise.reject(error)
  }
}

async function switchEthereumChain(chainId: string) {
  const ethereum = getSafeMetaMaskProvider()
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }]
    })
  } catch (err: unknown) {
    if ('code' in (err as { [key: string]: any })) {
      if ((err as ErrorWithCode).code === ERROR_CODE_REQUEST_PENDING) return
    }
    throw err
  }
}

const initialState: MetaMaskState = {
  status: Status.INITIALIZING,
  account: null,
  chainId: null
}

export function MetaMaskProvider(props: any) {
  const [state, unsafeDispatch] = useReducer(reducer, initialState)
  const dispatch = useSafeDispatch(unsafeDispatch)

  const { status } = state

  const isInitializing = status === Status.INITIALIZING
  useEffect(() => {
    if (isInitializing) {
      synchronize(dispatch)
    }
  }, [dispatch, isInitializing])

  const isConnected = status === Status.CONNECTED
  useEffect(() => {
    if (!isConnected) return () => {}
    const unsubscribe = subsribeToAccountsChanged(dispatch)
    return unsubscribe
  }, [dispatch, isConnected])

  const isAvailable =
    status !== Status.UNAVAILABLE && status !== Status.INITIALIZING
  useEffect(() => {
    if (!isAvailable) return () => {}
    const unsubscribe = subscribeToChainChanged(dispatch)
    return unsubscribe
  }, [dispatch, isAvailable])

  const isAvailableAndNotConnected = status === Status.NOT_CONNECTED
  useEffect(() => {
    if (!isAvailableAndNotConnected) return () => {}
    const unsubscribe = subscribeToManualConnection(dispatch)
    return unsubscribe
  }, [dispatch, isAvailableAndNotConnected])

  const connect = useCallback(() => {
    if (!isAvailable) {
      console.warn(
        '`enable` method has been called while MetaMask is not available or synchronising. Nothing will be done in this case.'
      )
      return Promise.resolve([])
    }
    return requestAccounts(dispatch)
  }, [dispatch, isAvailable])

  const addChain = useCallback(
    (parameters: AddEthereumChainParameter) => {
      if (!isAvailable) {
        console.warn(
          '`addChain` method has been called while MetaMask is not available or synchronising. Nothing will be done in this case.'
        )
        return Promise.resolve()
      }
      return addEthereumChain(parameters)
    },
    [isAvailable]
  )

  const switchChain = useCallback(
    (chainId: string) => {
      if (!isAvailable) {
        console.warn(
          '`switchChain` method has been called while MetaMask is not available or synchronising. Nothing will be done in this case.'
        )
        return Promise.resolve()
      }
      return switchEthereumChain(chainId)
    },
    [isAvailable]
  )

  const transfer = useCallback(
    (parameters: TransferParameter) => {
      if (!isAvailable) {
        return Promise.reject(
          '`transfer` method has been called while MetaMask is not available or synchronising. Nothing will be done in this case.'
        )
      }
      return sendTransaction(parameters)
    },
    [isAvailable]
  )

  const callContractMethod = useCallback(
    async (parameters: CallContractMethodParameter) => {
      const { abi, contractAddress, methodName, params, ...rest } = parameters
      if (!isAvailable) {
        return Promise.reject(
          '`callContractMethod` method has been called while MetaMask is not available or synchronising. Nothing will be done in this case.'
        )
      }
      const signer = await getSigner()
      const contract = new ethers.Contract(contractAddress, abi, signer)
      const tx = {
        to: contractAddress,
        data: contract.interface.encodeFunctionData(methodName, params),
        ...rest
      }
      return sendTransaction(tx)
    },
    [isAvailable]
  )

  const value: IMetaMaskContext = useMemo(
    () => ({
      ...state,
      getSigner,
      connect,
      addChain,
      switchChain,
      transfer,
      sendTransaction,
      callContractMethod,
      ethereum: isAvailable ? getSafeMetaMaskProvider() : null
    }),
    [
      connect,
      addChain,
      switchChain,
      state,
      isAvailable,
      transfer,
      callContractMethod
    ]
  )
  return <MetamaskContext.Provider value={value} {...props} />
}
