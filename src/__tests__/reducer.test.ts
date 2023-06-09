import { MetaMaskState } from '../metamask-context'
import { reducer } from '../reducer'
import { Status } from '../constants'

describe('state reducer, edge cases', () => {
  test('transition from "initializing" to "connecting" is not allowed', () => {
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {})
    const initialState: MetaMaskState = {
      account: null,
      chainId: null,
      status: Status.INITIALIZING
    }
    const state = reducer(initialState, { type: 'metaMaskConnecting' })
    expect(initialState).toEqual(state)
  })
  test('transition from "unavailable" to "connecting" is not allowed', () => {
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {})
    const initialState: MetaMaskState = {
      account: null,
      chainId: null,
      status: Status.UNAVAILABLE
    }
    const state = reducer(initialState, { type: 'metaMaskConnecting' })
    expect(initialState).toEqual(state)
  })

  test('transition from "initializing" to "notConnected" is not allowed', () => {
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {})
    const initialState: MetaMaskState = {
      account: null,
      chainId: null,
      status: Status.INITIALIZING
    }
    const state = reducer(initialState, { type: 'metaMaskPermissionRejected' })
    expect(initialState).toEqual(state)
  })
  test('transition from "unavailable" to "notConnected" is not allowed', () => {
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {})
    const initialState: MetaMaskState = {
      account: null,
      chainId: null,
      status: Status.UNAVAILABLE
    }
    const state = reducer(initialState, { type: 'metaMaskPermissionRejected' })
    expect(initialState).toEqual(state)
  })
  test('change of accounts when not in status "connected" is not allowed', () => {
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {})
    const initialState: MetaMaskState = {
      account: null,
      chainId: null,
      status: Status.UNAVAILABLE
    }
    const state = reducer(initialState, {
      type: 'metaMaskAccountsChanged',
      payload: ['0x123']
    })
    expect(initialState).toEqual(state)
  })
  test('change of chain ID when in status "initializing" is not allowed', () => {
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {})
    const initialState: MetaMaskState = {
      account: null,
      chainId: null,
      status: Status.INITIALIZING
    }
    const state = reducer(initialState, {
      type: 'metaMaskChainChanged',
      payload: '0x1'
    })
    expect(initialState).toEqual(state)
  })
  test('change of chain ID when in status "unavailable" is not allowed', () => {
    jest.spyOn(console, 'warn').mockImplementationOnce(() => {})
    const initialState: MetaMaskState = {
      account: null,
      chainId: null,
      status: Status.UNAVAILABLE
    }
    const state = reducer(initialState, {
      type: 'metaMaskChainChanged',
      payload: '0x1'
    })
    expect(initialState).toEqual(state)
  })
})
