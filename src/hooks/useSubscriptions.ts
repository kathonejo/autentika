import { useReadContract } from 'wagmi'
import { SUBSCRIPTIONS_ABI, getSubscriptionsAddress } from '@/subscriptions'
import { useReadChainId } from '@/hooks/useCommissions'

export function useSubscriptionsContractAddress() {
  const chainId = useReadChainId()
  return getSubscriptionsAddress(chainId) ?? undefined
}

export function useArtistPlan(artist: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getSubscriptionsAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: SUBSCRIPTIONS_ABI,
    functionName: 'getPlan',
    args: artist ? [artist] : undefined,
    chainId,
    query: { enabled: !!artist && !!address },
  })
}

export function useSubscription(artist: `0x${string}` | undefined, subscriber: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getSubscriptionsAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: SUBSCRIPTIONS_ABI,
    functionName: 'getSubscription',
    args: artist && subscriber ? [artist, subscriber] : undefined,
    chainId,
    query: { enabled: !!artist && !!subscriber && !!address },
  })
}

export function useClaimable(artist: `0x${string}` | undefined, subscriber: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getSubscriptionsAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: SUBSCRIPTIONS_ABI,
    functionName: 'claimable',
    args: artist && subscriber ? [artist, subscriber] : undefined,
    chainId,
    query: { enabled: !!artist && !!subscriber && !!address },
  })
}

export function useDiscountedMonthlyFee(artist: `0x${string}` | undefined) {
  const chainId = useReadChainId()
  const address = getSubscriptionsAddress(chainId) ?? undefined
  return useReadContract({
    address,
    abi: SUBSCRIPTIONS_ABI,
    functionName: 'discountedMonthlyFee',
    args: artist ? [artist] : undefined,
    chainId,
    query: { enabled: !!artist && !!address },
  })
}
