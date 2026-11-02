/**
 * wagmi configuration — Arc Testnet + Arc Mainnet + Ethereum Mainnet (ENS)
 * Built with Arc Studio — https://studio.arc.io
 */

import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { arc, arcTestnet } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { registerChain } from './tracing'

// Pre-register chain RPC URLs for trace labelling
registerChain(arcTestnet.id, arcTestnet.rpcUrls.default.http[0])
registerChain(arc.id, arc.rpcUrls.default.http[0])

export const config = createConfig({
  // Prefer Arc Mainnet first so wallets default there for the live app.
  chains: [arc, arcTestnet, mainnet],
  // Plain injected + wagmi EIP-6963 multi-provider discovery (Rabby, MetaMask, etc.).
  // Do not target only metaMask — that hides Rabby as a first-class option.
  // Connect without forcing Arc here; ConnectKit initialChainId:0 avoids aborting
  // connect when the wallet has not added chain 5042 yet.
  connectors: [injected({ shimDisconnect: true })],
  multiInjectedProviderDiscovery: true,
  transports: {
    [arc.id]: http('https://rpc.mainnet.arc.io'),
    [arcTestnet.id]: http(),
    [mainnet.id]: http(), // ENS resolution
  },
})
