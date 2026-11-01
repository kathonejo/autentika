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
  chains: [arcTestnet, arc, mainnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
    [arc.id]: http('https://rpc.mainnet.arc.io'),
    [mainnet.id]: http(), // ENS resolution
  },
})
