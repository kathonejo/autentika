import { useReadContract, useChainId } from 'wagmi'
import {
  AUTENTIKA_V2_ABI,
  ARC_TESTNET_CHAIN_ID,
  isSupportedChain,
  getContractAddress,
  type CommissionData,
  type CertificateData,
  type ArtistProfileData,
  type MilestoneData,
  type ListingData,
  type LegalRecord,
} from '@/contract'

/** Returns the contract address for the currently connected chain (or testnet fallback). */
export function useContractAddress() {
  const chainId = useChainId()
  const id = isSupportedChain(chainId) ? chainId : ARC_TESTNET_CHAIN_ID
  return getContractAddress(id) ?? undefined
}

/** Returns the chainId to use for reads — connected chain if supported, else testnet. */
export function useReadChainId() {
  const chainId = useChainId()
  return isSupportedChain(chainId) ? chainId : ARC_TESTNET_CHAIN_ID
}

export function useArtistCommissions(artist: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'getArtistCommissions',
    args: artist ? [artist] : undefined,
    chainId,
    query: { enabled: !!artist && !!address },
  })
}

export function useCollectorCommissions(collector: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'getCollectorCommissions',
    args: collector ? [collector] : undefined,
    chainId,
    query: { enabled: !!collector && !!address },
  })
}

export function useCommission(id: bigint | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'getCommission',
    args: id !== undefined ? [id] : undefined,
    chainId,
    query: { enabled: id !== undefined && id > 0n && !!address },
  })
}

export function useCertificate(id: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  const isZero = !id || id === '0x0000000000000000000000000000000000000000000000000000000000000000'
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'getCertificate',
    args: id ? [id] : undefined,
    chainId,
    query: { enabled: !!id && !isZero && !!address },
  })
}

export function usePendingWithdrawal(addr: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'pendingWithdrawals',
    args: addr ? [addr] : undefined,
    chainId,
    query: { enabled: !!addr && !!address },
  })
}

export function useArtistProfile(artist: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'getArtistProfile',
    args: artist ? [artist] : undefined,
    chainId,
    query: { enabled: !!artist && !!address },
  })
}

export function useMilestones(commissionId: bigint | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'getMilestones',
    args: commissionId !== undefined ? [commissionId] : undefined,
    chainId,
    query: { enabled: commissionId !== undefined && !!address },
  })
}

export function useCertTokenId(certId: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  const isZero = !certId || certId === '0x0000000000000000000000000000000000000000000000000000000000000000'
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'certTokenId',
    args: certId ? [certId] : undefined,
    chainId,
    query: { enabled: !!certId && !isZero && !!address },
  })
}

export function useActiveListing(tokenId: bigint | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'getActiveListing',
    args: tokenId !== undefined ? [tokenId] : undefined,
    chainId,
    query: { enabled: tokenId !== undefined && !!address },
  })
}

export function useLegalRecord(tokenId: bigint | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'legalRecords',
    args: tokenId !== undefined ? [tokenId] : undefined,
    chainId,
    query: { enabled: tokenId !== undefined && !!address },
  })
}

export function useTokenURI(tokenId: bigint | undefined) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [tokenId] : undefined,
    chainId,
    query: { enabled: tokenId !== undefined && tokenId > 0n && !!address },
  })
}

export function useRoyaltyInfo(tokenId: bigint | undefined, salePrice: bigint) {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'royaltyInfo',
    args: tokenId !== undefined ? [tokenId, salePrice] : undefined,
    chainId,
    query: { enabled: tokenId !== undefined && salePrice > 0n && !!address },
  })
}

export function usePlatformFeeBps() {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'platformFeeBps',
    chainId,
    query: { enabled: !!address },
  })
}

export function usePlatformResaleBps() {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'platformResaleBps',
    chainId,
    query: { enabled: !!address },
  })
}

export function useFeeRecipient() {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'feeRecipient',
    chainId,
    query: { enabled: !!address },
  })
}

export function useContractOwner() {
  const chainId = useReadChainId()
  const address = getContractAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'owner',
    chainId,
    query: { enabled: !!address },
  })
}

// ─── Type cast helpers ───────────────────────────────────────────────────────
export function castCommission(raw: unknown): CommissionData | undefined {
  if (!raw) return undefined
  return raw as CommissionData
}
export function castCertificate(raw: unknown): CertificateData | undefined {
  if (!raw) return undefined
  return raw as CertificateData
}
export function castArtistProfile(raw: unknown): ArtistProfileData | undefined {
  if (!raw) return undefined
  return raw as ArtistProfileData
}
export function castMilestones(raw: unknown): MilestoneData[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw as MilestoneData[]
}
export function castListing(raw: unknown): ListingData | undefined {
  if (!raw) return undefined
  return raw as ListingData
}
export function castLegalRecord(raw: unknown): LegalRecord | undefined {
  if (!raw) return undefined
  return raw as LegalRecord
}
