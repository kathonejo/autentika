import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { toast } from 'sonner'
import { formatAmount } from '@/onchain-money'
import { KATHONEJO_ABI, isSupportedChain, getContractAddress, usdcAmount } from '@/contract'
import { useReadChainId } from '@/hooks/useCommissions'
import type { Lang } from '@/i18n'
import { translations } from '@/i18n'

interface Props { lang: Lang }

export function WithdrawBanner({ lang }: Props) {
  const t = translations[lang]
  const { address, chainId } = useAccount()
  const readChainId = useReadChainId()
  const contractAddr = chainId !== undefined && isSupportedChain(chainId) ? getContractAddress(chainId) ?? undefined : undefined

  const { data: rawPending, refetch } = useReadContract({
    address: contractAddr,
    abi: KATHONEJO_ABI,
    functionName: 'pendingWithdrawals',
    args: address ? [address] : undefined,
    chainId: readChainId,
    query: { enabled: !!address && !!contractAddr, refetchInterval: 30_000 },
  })

  const pending = typeof rawPending === 'bigint' ? rawPending : 0n

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  if (isSuccess) { toast.success(t.withdrawing); void refetch() }

  if (pending === 0n) return null

  const amount = formatAmount(readChainId, usdcAmount(pending, readChainId))

  return (
    <div
      style={{
        background: 'var(--green)',
        borderBottom: '2.5px solid var(--blue)',
        padding: '0.875rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {/* Pulsing dot */}
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--blue)',
            display: 'inline-block',
            flexShrink: 0,
            animation: 'pulse 1.8s ease-in-out infinite',
          }}
        />
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: '0.9rem',
            color: 'var(--blue)',
          }}
        >
          {t.pendingWithdrawal}: <strong>{amount} USDC</strong>
        </span>
      </div>
      <button
        className="btn-primary"
        style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}
        onClick={() => contractAddr && writeContract({ address: contractAddr, abi: KATHONEJO_ABI, functionName: 'withdraw', args: [] })}
        disabled={isPending || isConfirming}
      >
        {isPending || isConfirming ? '...' : t.withdrawAll}
      </button>
    </div>
  )
}
