import { useReadContract, useReadContracts } from 'wagmi'
import { DIRECTORY_ABI, getDirectoryAddress } from '@/directory'
import { AUTENTIKA_V2_ABI, getContractAddress, isSupportedChain, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { useReadChainId } from '@/hooks/useCommissions'

export function useDirectoryContractAddress() {
  const chainId = useReadChainId()
  return getDirectoryAddress(chainId) ?? undefined
}

export function useDirectoryArtists() {
  const chainId = useReadChainId()
  const address = getDirectoryAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: DIRECTORY_ABI,
    functionName: 'getArtists',
    chainId,
    query: { enabled: !!address },
  })
}

export function useArtistListing(artist: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getDirectoryAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: DIRECTORY_ABI,
    functionName: 'getArtistListing',
    args: artist ? [artist] : undefined,
    chainId,
    query: { enabled: !!artist && !!address },
  })
}

export function usePhysicalByCommission(commissionId: bigint | undefined) {
  const chainId = useReadChainId()
  const address = getDirectoryAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: DIRECTORY_ABI,
    functionName: 'getPhysicalByCommission',
    args: commissionId !== undefined ? [commissionId] : undefined,
    chainId,
    query: { enabled: commissionId !== undefined && !!address },
  })
}

export function useRequestsToArtist(artist: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getDirectoryAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: DIRECTORY_ABI,
    functionName: 'getRequestsToArtist',
    args: artist ? [artist] : undefined,
    chainId,
    query: { enabled: !!artist && !!address },
  })
}

/** Probe certificate token ids 1..max on AutentikaV2 for the feed. */
export function useFeedCertificates(maxTokens = 24) {
  const chainId = useReadChainId()
  const autentika = (isSupportedChain(chainId) ? getContractAddress(chainId) : getContractAddress(ARC_TESTNET_CHAIN_ID)) ?? undefined
  const contracts = Array.from({ length: maxTokens }, (_, i) => ({
    address: autentika as `0x${string}`,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'getCertificateByTokenId' as const,
    args: [BigInt(i + 1)] as const,
    chainId,
  }))
  return useReadContracts({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: (autentika ? contracts : []) as any,
    query: { enabled: !!autentika },
  })
}

export type FeedItem = {
  tokenId: bigint
  commissionId: bigint
  artworkTitle: string
  artistName: string
  photoUrl: string
  technique: string
  dimensions: string
  collector: string
  currentOwner: string
  amountPaid: bigint
  /** Best-effort artist wallet from commission lookup (filled by caller). */
  artist?: string
}
