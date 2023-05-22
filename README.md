# metamask-connector-ts

Simplistic Context provider and consumer hook in order to manage MetaMask in the browser.

## Installation

The recommend way to use MetaMask React with a React app is to install it as a dependency.

If you use `npm`:
```console
npm install metamask-connetor-ts
```

Or if you use `yarn`:
```console
yarn add metamask-connetor-ts
```

## Quick Start

The first step is to wrap you `App` or any React subtree with the `MetaMaskProvider`
```TypeScript
// index.js
import { MetaMaskProvider } from "metamask-connetor-ts";

...

ReactDOM.render(
  <React.StrictMode>
    <MetaMaskProvider>
      <App />
    </MetaMaskProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
```

In any React child of the provider, one can use the `useMetaMask` hook in order to access the state and methods.
```tsx
// app.js
import { useMetaMask, Status } from "metamask-connetor-ts";

...

function App() {
    const { status, connect, account, chainId, ethereum } = useMetaMask();

    if (status === Status.INITIALIZING) return <div>Synchronisation with MetaMask ongoing...</div>

    if (status === Status.UNAVAILABLE) return <div>MetaMask not available :(</div>

    if (status === Status.NOT_CONNECTED) return <button onClick={connect}>Connect to MetaMask</button>

    if (status === Status.CONNECTING) return <div>Connecting...</div>

    if (status === Status.CONNECTED) return <div>Connected account {account} on chain ID {chainId}</div>

    return null;
}
```

## Statuses and behaviour

The `MetaMaskProvider` will first initialise the state with `initializing` status, the `account` and `chainId` will be `null`. A synchronization is performed in order to derive the MetaMask state.

If the `ethereum` object is not present or if it is not the one associated to MetaMask, the synchronisation will change the status to `unavailable`.

Otherwise, a check is performed in order to detect if MetaMask has already connected accounts for the application.

In case of no connected accounts, the status will be `notConnected`, otherwise the status will be `connected`.

Here is an abstract on the different statuses:
- `initializing`: the provider is currently initializing by synchronizing with MetaMask
- `unavailable`: MetaMask is not available, nothing will be done
- `notConnected`: MetaMask is available but not connected to the application
- `connected`: MetaMask is connected to the application
- `connecting`: the connection of your accounts to the application is ongoing

## Chain utils

The context exposes two methods in order to facilitate the management of the networks. These methods are wrappers around the JSON RPC requests handled by MetaMask, see [MetaMask documentation](https://docs.metamask.io/guide/rpc-api.html#table-of-contents) for additonal informations.

Request a switch to a different network
```tsx
function WrongNetwork() {
  const { switchChain } = useMetaMask();
  // Request a switch to Ethereum Mainnet
  return (
    <button onClick={() => switchChain("0x1")}>Switch to Ethereum Mainnet</button>
  )
}
```

Request to add to MetaMask a network and then connect to it
```tsx
function WrongNetwork() {
  const { addChain } = useMetaMask();
  const gnosisChainNetworkParams = {
    chainId: "0x64",
    chainName: "Gnosis Chain",
    rpcUrls: ["https://rpc.gnosischain.com/"],
    nativeCurrency: {
      name: "xDAI",
      symbol: "xDAI",
      decimals: 18,
    },
    blockExplorerUrls: ["https://blockscout.com/xdai/mainnet/"]
  };
  // Request to add Gnosis chain and then switch to it
  return (
    <button onClick={() => addChain(gnosisChainNetworkParams)}>Add Gnosis chain</button>
  )
}
```

Call metamask to sign a transaction
```tsx
function TransferHandler() {
  const { transfer, getSigner } = useMetaMask();
  
  const handleTransfer = async () => {
    const signer = await getSigner()
    const contract = new ethers.Contract(
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      TOKEN_ABI,
      signer
    )
    const decimals = await contract.decimals()
    const tx = {
      to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      value: 0,
      data: contract.interface.encodeFunctionData('transfer', [
        '0x479A641d2d037a46fb68d9d0d0Ac8183d911c8B1',
        utils.parseUnits('500', decimals)
      ]),
      gasLimit: 100000
    }
    await signer.sendTransaction(tx)
  }
  return (
    <button onClick={handleTransfer}>Handle Tranfer</button>
  )
}
```

Call metamask to send a transfer
```tsx
function TransferHandler() {
  const { transfer } = useMetaMask();
  const onTransfer = async () => {
    const tx = {
      to: '0x479A641d2d037a46fb68d9d0d0Ac8183d911c8B1',
      value: utils.parseEther('1')
    }
    const txResponse = await transfer(tx)
    console.log(txResponse.hash)
  }
  return (
    <button onClick={onTransfer}>Call a Transfer</button>
  )
}
```

Call metamask to invoke the contract method
```tsx
function ContractMethodHandler() {
  const { callContractMethod } = useMetaMask();
  const call = async () => {
    callContractMethod({
      contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      methodName: 'transfer',
      params: [],
      abi: []
    })
  }
  return (
    <button onClick={call}>Call Contract Method</button>
  )
}
```

Finally, here is a non exhaustive list of the networks and their chain IDs
```TypeScript
const networks = {
  mainnet: "0x1", // 1
  // Test nets
  goerli: "0x5", // 5
  ropsten: "0x3", // 3
  rinkeby: "0x4", // 4
  kovan: "0x2a", // 42
  mumbai: "0x13881", // 80001
  // Layers 2
  arbitrum: "0xa4b1", // 42161
  optimism: "0xa", // 10
  // Side chains
  polygon: "0x89", // 137
  gnosisChain: "0x64", // 100
  // Alt layer 1
  binanceSmartChain: "0x38", // 56
  avalanche: "0xa86a", // 43114
  cronos: "0x19", // 25
  fantom: "0xfa" // 250
}
```
## Type safe hook

Most of the time, the application will use the state when the user is connected, i.e. with status `connected`. Therefore the hook `useConnectedMetaMask` is additionally exposed, it is the same hook as `useMetaMask` but is typed with the connected state, e.g. the `account` or the `chainId` are necessarily not `null`. This hook is only usable when the status is equal to `connected`, it will throw otherwise.
```tsx
function MyComponent() {
  const {
    // typed as string - can not be null
    account,
    // typed as string - can not be null
    chainId
  } = useConnectedMetaMask();

  return <div>Connected account {account} on chain ID {chainId}</div>
}
```

## Special Thanks

This project is based on the [metamask-react](https://github.com/VGLoic/metamask-react), which provides a solid foundation for our work. We would like to express our sincere gratitude to the contributors and maintainers of the original project for their hard work and dedication.

## Why Fork?

We originally started our development work on the [metamask-react](https://github.com/VGLoic/metamask-react), but soon realized that some aspects of the original repository didn't align with our needs. Despite submitting pull requests and opening issues to address these concerns, we weren't able to reach a resolution with the project maintainers.
As a result, we decided to fork the original repository and create this new project. This allows us to make the necessary modifications to the codebase and tailor it to our specific use case, while still benefiting from the ongoing improvements and bug fixes in the upstream repository.
We understand that forking a repository can be seen as a last resort, and we want to emphasize that we made every effort to work with the original project before taking this step. Ultimately, we believe that this was the best course of action to ensure that our project meets the needs of our users and stakeholders.
