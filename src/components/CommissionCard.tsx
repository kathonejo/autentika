import { useReadContract } from 'wagmi'
import { formatAmount } from '@/onchain-money'
import {
  AUTENTIKA_V2_ABI, CommissionStatus, usdcAmount,
  isSupportedChain, getContractAddress,
} from '@/contract'
import { castCommission, useReadChainId } from '@/hooks/useCommissions'
import { StatusBadge } from './StatusBadge'
import type { Lang } from '@/i18n'
import { translations } from '@/i18n'
import { ArrowRight } from 'lucide-react'

interface Props {
  lang: Lang
  commissionId: bigint
  onClick: (id: bigint) => void
}

// 4 steps in the commission lifecycle
const TIMELINE_STEPS = [
  CommissionStatus.Created,
  CommissionStatus.Funded,
  CommissionStatus.Delivered,
  CommissionStatus.Released,
]
const STEP_COLORS = ['var(--yellow)', 'var(--sky)', 'var(--pink)', 'var(--green)']

export function CommissionCard({ lang, commissionId, onClick }: Props) {
  const t = translations[lang]
  const readChainId = useReadChainId()
  const contractAddr = isSupportedChain(readChainId) ? getContractAddress(readChainId) ?? undefined : undefined
  const { data, isLoading } = useReadContract({
    address: contractAddr,
    abi: AUTENTIKA_V2_ABI,
    functionName: 'getCommission',
    args: [commissionId],
    chainId: readChainId,
    query: { enabled: !!contractAddr },
  })
  const commission = castCommission(data)

  if (isLoading || !commission) {
    return (
      <div
        style={{
          border: '2px solid var(--border)',
          borderRadius: 4,
          padding: '1.25rem',
          background: '#FFFFFF',
          animation: 'pulse 1.5s infinite',
        }}
      >
        <div style={{ height: 16, width: '45%', background: 'var(--border)', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 12, width: '30%', background: 'var(--border)', borderRadius: 4 }} />
      </div>
    )
  }

  const amount = formatAmount(readChainId, usdcAmount(commission.amount, readChainId))
  const deadline = new Date(Number(commission.deadline) * 1000)

  // Active step index: Refunded / Cancelled → show 0
  const isClosed = commission.status === CommissionStatus.Refunded || commission.status === CommissionStatus.Cancelled
  const activeIdx = isClosed ? -1 : TIMELINE_STEPS.indexOf(commission.status)

  return (
    <div
      className="framed-card-sm"
      style={{
        cursor: 'pointer',
        transition: 'transform 0.12s ease',
        overflow: 'visible',
        margin: '8px 4px', // room for box-shadow frames
      }}
      onClick={() => onClick(commissionId)}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
    >
      <div style={{ padding: '1.25rem 1.25rem 1rem' }}>

        {/* Top row: title + badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h3
            className="display"
            style={{
              fontSize: '1rem',
              color: 'var(--blue)',
              margin: 0,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {commission.title}
          </h3>
          <StatusBadge status={commission.status} lang={lang} />
        </div>

        {/* Amount + deadline row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span
            className="poster"
            style={{ fontSize: '1.5rem', color: 'var(--blue)' }}
          >
            {amount}
            <span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: '0.25rem', color: 'var(--muted)' }}>USDC</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>
            {t.deadline}: {deadline.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Mini timeline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {TIMELINE_STEPS.map((step, i) => {
            const isActive = i === activeIdx
            const isDone = activeIdx > i
            const col = STEP_COLORS[i]
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < TIMELINE_STEPS.length - 1 ? 1 : 'unset' }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: `2px solid var(--blue)`,
                    background: isActive || isDone ? col : '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: isActive ? `0 0 0 2px ${col}` : 'none',
                    transition: 'all 0.15s ease',
                  }}
                />
                {i < TIMELINE_STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: isDone ? 'var(--blue)' : 'var(--border)',
                      minWidth: 16,
                      transition: 'background 0.15s ease',
                    }}
                  />
                )}
              </div>
            )
          })}
          {isClosed && (
            <span
              className="sticker"
              data-status={commission.status === CommissionStatus.Refunded ? 'refunded' : 'cancelled'}
              style={{ marginLeft: '0.75rem', fontSize: '0.6rem' }}
            >
              {commission.status === CommissionStatus.Refunded ? t.statusRefunded : t.statusCancelled}
            </span>
          )}
        </div>
      </div>

      {/* Footer: id + arrow */}
      <div
        style={{
          borderTop: '1.5px solid var(--border)',
          padding: '0.5rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '0.7rem', color: 'var(--subtle)', fontFamily: 'JetBrains Mono, monospace' }}>
          #{commissionId.toString()}
        </span>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.75rem',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            color: 'var(--blue)',
          }}
        >
          {lang === 'es' ? 'Ver' : 'View'} <ArrowRight size={13} />
        </div>
      </div>
    </div>
  )
}
