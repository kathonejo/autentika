import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { toast } from 'sonner'
import { formatAmount } from '@/onchain-money'
import {
  KATHONEJO_ABI, CommissionStatus, usdcAmount,
  isSupportedChain, getContractAddress, getUsdcAddress, getExplorerBase,
  ARC_TESTNET_CHAIN_ID,
} from '@/contract'
import type { MilestoneData } from '@/contract'
import {
  useCommission, castCommission, useMilestones, castMilestones, useReadChainId,
} from '@/hooks/useCommissions'
import { StatusBadge } from './StatusBadge'
import { DeliveryCertificateForm } from './DeliveryCertificateForm'
import type { Lang } from '@/i18n'
import { translations } from '@/i18n'
import { buildShareLink } from '@/lib/share'
import { Copy, ExternalLink, ArrowLeft } from 'lucide-react'
import { usePhysicalByCommission, useDirectoryContractAddress } from '@/hooks/useDirectory'
import { DIRECTORY_ABI, isDirectoryConfigured } from '@/directory'

const RENDER_TIMESTAMP = Date.now()

interface Props {
  lang: Lang
  commissionId: bigint
  onBack: () => void
  onViewCert: (certId: string) => void
}

export function CommissionDetailView({ lang, commissionId, onBack, onViewCert }: Props) {
  const t = translations[lang]
  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const readChainId = useReadChainId()
  const contractAddr = chainId !== undefined && isSupportedChain(chainId) ? getContractAddress(chainId) ?? undefined : undefined
  const usdcAddr = chainId !== undefined && isSupportedChain(chainId) ? getUsdcAddress(chainId) : getUsdcAddress(ARC_TESTNET_CHAIN_ID)
  const explorerBase = getExplorerBase(readChainId)

  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isWrong = !!address && chainId !== undefined && !isSupportedChain(chainId)
  const { data: rawCommission, isLoading, refetch } = useCommission(commissionId)
  const commission = castCommission(rawCommission)

  const { data: rawMilestones, refetch: refetchMs } = useMilestones(commissionId)
  const milestones = castMilestones(rawMilestones)
  const hasMilestones = milestones.length > 0

  useEffect(() => {
    void buildShareLink(`/?commission=${commissionId.toString()}`).then(setShareUrl)
  }, [commissionId])

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddr,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && contractAddr ? [address, contractAddr] : undefined,
    chainId: readChainId,
    query: { enabled: !!address && !!contractAddr },
  })

  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract()
  const { isLoading: isApprovingConfirming, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })
  if (approveSuccess) { toast.success(t.usdcApproved); void refetchAllowance() }

  const { writeContract, data: actionHash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: actionHash })
  if (isSuccess) { toast.success(t.transactionConfirmed); void refetch(); void refetchMs() }
  if (error) {
    const msg = (error as Error).message
    if (msg && !msg.toLowerCase().includes('user rejected')) toast.error(msg.slice(0, 80))
  }

  if (isWrong) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <BackBtn onClick={onBack} label={t.myCommissions} />
      <div className="framed-card" style={{ padding: '2rem', textAlign: 'center', marginTop: '1rem' }}>
        <p className="display" style={{ color: 'var(--blue)', marginBottom: '1rem' }}>{t.wrongNetwork}</p>
        <button className="btn-primary" onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}>
          {t.switchNetwork}
        </button>
      </div>
    </div>
  )

  if (isLoading || !commission) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <div style={{ height: 20, width: 120, background: 'var(--border)', borderRadius: 4, marginBottom: '1.5rem' }} />
      <div className="framed-card" style={{ padding: '2rem' }}>
        {[80, 48, 60, 40].map((w, i) => (
          <div key={i} style={{ height: 14, width: `${w}%`, background: 'var(--border)', borderRadius: 4, marginBottom: 12 }} />
        ))}
      </div>
    </div>
  )

  const amount = formatAmount(readChainId, usdcAmount(commission.amount, readChainId))
  const deadline = new Date(Number(commission.deadline) * 1000)
  const isArtist = address?.toLowerCase() === commission.artist.toLowerCase()
  const isCollector = address?.toLowerCase() === commission.collector.toLowerCase()
  const deadlinePassed = RENDER_TIMESTAMP > Number(commission.deadline) * 1000
  const autoClaimReady = commission.deliveredAt > 0n && RENDER_TIMESTAMP > (Number(commission.deliveredAt) + 14 * 86400) * 1000
  const needsApproval = commission.status === CommissionStatus.Created
    && isCollector
    && (allowance === undefined || (allowance) < commission.amount)

  function call(fn: string, args: unknown[]) {
    if (!contractAddr) return
    writeContract({ address: contractAddr, abi: KATHONEJO_ABI, functionName: fn, args: args })
  }
  function fund()      { call('fundCommission', [commissionId]) }
  function confirm()   { call('confirmReceipt', [commissionId]) }
  function autoClaim() { call('autoClaimAfterDelivery', [commissionId]) }
  function refund()    { call('refundCollector', [commissionId]) }
  function cancel()    { call('cancelCommission', [commissionId]) }
  function doApprove() {
    if (!contractAddr) return
    approve({ address: usdcAddr, abi: erc20Abi, functionName: 'approve', args: [contractAddr, commission!.amount] })
  }

  async function copyLink() {
    if (!shareUrl) return
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { toast.error('Copy failed') }
  }

  const isBusy = isPending || isConfirming

  // Milestones progress
  const approvedCount = milestones.filter(m => m.collectorApproved).length
  const releasedAmt = milestones.filter(m => m.collectorApproved).reduce((s, m) => s + m.amount, 0n)
  const releasedPct = commission.amount > 0n ? Number((releasedAmt * 100n) / commission.amount) : 0

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <BackBtn onClick={onBack} label={t.myCommissions} />

      <div className="framed-card" style={{ marginTop: '1rem', overflow: 'visible', position: 'relative' }}>
        <div className="halftone-corner" style={{ top: 0, right: 0, width: 60, height: 60, transform: 'scaleX(-1)', borderRadius: '0 4px 0 8px' }} aria-hidden="true" />

        {/* Header strip */}
        <div style={{ padding: '1.5rem 1.5rem 1.25rem', borderBottom: '2px solid var(--blue)', background: 'var(--blue-light)', borderRadius: '4px 4px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h2 className="poster" style={{ fontSize: '1.375rem', color: 'var(--blue)', margin: 0 }}>
              {commission.title}
            </h2>
            <StatusBadge status={commission.status} lang={lang} />
          </div>
          <div className="poster" style={{ fontSize: '2.25rem', color: 'var(--blue)' }}>
            {amount} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--muted)' }}>USDC</span>
          </div>
        </div>

        {/* Info rows */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <InfoRow label={t.artist}    value={commission.artist}    explorer={`${explorerBase}/address/${commission.artist}`}    mono />
          <InfoRow label={t.collector} value={commission.collector} explorer={`${explorerBase}/address/${commission.collector}`} mono />
          <InfoRow label={t.deadline}  value={deadline.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
          <InfoRow label="Commission #" value={commissionId.toString()} />
        </div>

        {/* ── Milestones progress bar ─────────────────────────────── */}
        {hasMilestones && (
          <div style={{ padding: '0 1.5rem 1.25rem' }}>
            <hr className="rule-blue" style={{ marginBottom: '1rem' }} />
            <p className="field-label" style={{ marginBottom: '0.625rem' }}>{t.milestoneProgress}</p>
            {/* Progress bar */}
            <div style={{ height: 10, background: 'var(--border)', borderRadius: 9999, overflow: 'hidden', marginBottom: '0.375rem' }}>
              <div style={{ height: '100%', width: `${releasedPct}%`, background: 'var(--green)', borderRadius: 9999, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted)' }}>
              <span>{approvedCount}/{milestones.length} {t.milestoneReleased}</span>
              <span>{releasedPct}%</span>
            </div>

            {/* Milestone rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.875rem' }}>
              {milestones.map((m, i) => (
                <MilestoneRow
                  key={i}
                  index={i}
                  milestone={m}
                  commissionId={commissionId}
                  isArtist={isArtist}
                  isCollector={isCollector}
                  status={commission.status}
                  lang={lang}
                  contractAddr={contractAddr}
                  isBusy={isBusy}
                  onAction={() => { void refetch(); void refetchMs() }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div style={{ padding: '0 1.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {commission.status === CommissionStatus.Created && isCollector && <Note>{t.approvalNeeded}</Note>}
          {commission.status === CommissionStatus.Delivered && isArtist && autoClaimReady && <Note>{t.autoClaimNote}</Note>}
          {commission.status === CommissionStatus.Funded && isCollector && deadlinePassed && <Note>{t.refundNote}</Note>}
          {commission.status === CommissionStatus.Created && <Note dim>{t.cancelNote}</Note>}
          {commission.status === CommissionStatus.Delivered && !autoClaimReady && <Note dim>{t.deadline14}</Note>}
        </div>

        {/* Actions */}
        <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {commission.status === CommissionStatus.Created && isCollector && needsApproval && (
            <button className="btn-primary" style={{ width: '100%' }} onClick={doApprove} disabled={isApproving || isApprovingConfirming}>
              {isApproving || isApprovingConfirming ? '…' : t.approve}
            </button>
          )}
          {commission.status === CommissionStatus.Created && isCollector && !needsApproval && (
            <button className="btn-primary" style={{ width: '100%' }} onClick={fund} disabled={isBusy}>
              {isBusy ? '…' : t.fund}
            </button>
          )}
          {/* confirmReceipt only valid for no-milestone commissions */}
          {commission.status === CommissionStatus.Delivered && isCollector && !hasMilestones && (
            <button className="btn-primary" style={{ width: '100%' }} onClick={confirm} disabled={isBusy}>
              {isBusy ? '…' : t.confirmReceipt}
            </button>
          )}
          {commission.status === CommissionStatus.Delivered && isArtist && autoClaimReady && !hasMilestones && (
            <button className="btn-outline" style={{ width: '100%' }} onClick={autoClaim} disabled={isBusy}>
              {isBusy ? '…' : t.autoClaim}
            </button>
          )}
          {commission.status === CommissionStatus.Funded && isCollector && deadlinePassed && (
            <button className="btn-primary" style={{ width: '100%' }} onClick={refund} disabled={isBusy}>
              {isBusy ? '…' : t.refund}
            </button>
          )}
          {commission.status === CommissionStatus.Created && (isArtist || isCollector) && (
            <button className="btn-danger" style={{ width: '100%' }} onClick={cancel} disabled={isBusy}>
              {isBusy ? '…' : t.cancel}
            </button>
          )}
          {commission.status === CommissionStatus.Released &&
            commission.certificateId &&
            commission.certificateId !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
            <button className="btn-outline" style={{ width: '100%' }} onClick={() => onViewCert(commission.certificateId)}>
              {t.viewCert}
            </button>
          )}
        </div>
      </div>

      {/* Delivery form */}
      {commission.status === CommissionStatus.Funded && isArtist && !deadlinePassed && (
        <div style={{ marginTop: '1.25rem' }}>
          <DeliveryCertificateForm lang={lang} commissionId={commissionId} onDelivered={() => { void refetch() }} />
        </div>
      )}

      {isDirectoryConfigured() && isArtist && (
        <PhysicalFlagSection lang={lang} commissionId={commissionId} />
      )}

      {/* Share link */}
      {shareUrl && (
        <div style={{ marginTop: '1rem' }}>
          <button onClick={() => { void copyLink() }} className="btn-outline" style={{ gap: '0.5rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
            <Copy size={13} />
            {copied ? t.linkCopied : t.shareCommission}
          </button>
        </div>
      )}
    </div>
  )
}

function PhysicalFlagSection({ lang }: { lang: Lang; commissionId: bigint }) {
  const t = translations[lang]
  return (
    <div className="framed-card-sm" style={{ padding: '1rem 1.25rem', marginTop: '1rem', borderStyle: 'dashed' }}>
      <p style={{
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, textTransform: 'uppercase',
        fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.08em', margin: '0 0 0.35rem',
      }}>{t.roadmapBadge}</p>
      <h3 className="display" style={{ fontSize: '0.95rem', color: 'var(--ink-2)', margin: '0 0 0.4rem' }}>{t.howRoadmapPhysicalTitle}</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{t.howRoadmapPhysicalBody}</p>
    </div>
  )
}

// ── MilestoneRow ──────────────────────────────────────────────────────────────
interface MilestoneRowProps {
  index: number
  milestone: MilestoneData
  commissionId: bigint
  isArtist: boolean
  isCollector: boolean
  status: CommissionStatus
  lang: Lang
  contractAddr: `0x${string}` | undefined
  isBusy: boolean
  onAction: () => void
}

function MilestoneRow({ index, milestone, commissionId, isArtist, isCollector, status, lang, contractAddr, isBusy, onAction }: MilestoneRowProps) {
  const t = translations[lang]
  const { writeContract, isPending } = useWriteContract()
  const busy = isBusy || isPending

  function completeMilestone() {
    if (!contractAddr) return
    writeContract({ address: contractAddr, abi: KATHONEJO_ABI, functionName: 'completeMilestone', args: [commissionId, BigInt(index)] },
      { onSuccess: () => { toast.success(t.transactionConfirmed); onAction() }, onError: e => toast.error((e as Error).message.slice(0, 80)) })
  }
  function approveMilestone() {
    if (!contractAddr) return
    writeContract({ address: contractAddr, abi: KATHONEJO_ABI, functionName: 'approveMilestone', args: [commissionId, BigInt(index)] },
      { onSuccess: () => { toast.success(t.transactionConfirmed); onAction() }, onError: e => toast.error((e as Error).message.slice(0, 80)) })
  }

  const readChainId = ARC_TESTNET_CHAIN_ID // safe default for display
  const mAmt = formatAmount(readChainId, usdcAmount(milestone.amount, readChainId))

  return (
    <div style={{
      padding: '0.625rem 0.875rem',
      borderRadius: 6,
      border: milestone.collectorApproved ? '1.5px solid var(--green)' : milestone.artistDone ? '1.5px solid var(--yellow)' : '1.5px solid var(--border)',
      background: milestone.collectorApproved ? '#f0fff0' : 'var(--bg-alt)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--ink-2)' }}>
          {index + 1}. {milestone.description}
        </p>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--muted)' }}>{mAmt} USDC</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {milestone.collectorApproved ? (
          <span className="sticker" data-status="released" style={{ transform: 'rotate(1.5deg)', fontSize: '0.65rem' }}>{t.milestoneApproved}</span>
        ) : milestone.artistDone ? (
          <>
            <span className="sticker" data-status="delivered" style={{ transform: 'rotate(-1deg)', fontSize: '0.65rem' }}>{t.milestonePendingCollector}</span>
            {isCollector && status === CommissionStatus.Funded && (
              <button className="btn-primary" disabled={busy} onClick={approveMilestone} style={{ fontSize: '0.7rem', padding: '0.3rem 0.7rem' }}>
                {busy ? '…' : t.milestoneApprove}
              </button>
            )}
          </>
        ) : (
          <>
            <span className="sticker" data-status="created" style={{ transform: 'rotate(-1.5deg)', fontSize: '0.65rem' }}>{t.milestonePendingArtist}</span>
            {isArtist && status === CommissionStatus.Funded && (
              <button className="btn-outline" disabled={busy} onClick={completeMilestone} style={{ fontSize: '0.7rem', padding: '0.3rem 0.7rem' }}>
                {busy ? '…' : t.milestoneDone}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '0.875rem', padding: '0.25rem 0' }}>
      <ArrowLeft size={15} /> {label}
    </button>
  )
}

function InfoRow({ label, value, explorer, mono }: { label: string; value: string; explorer?: string; mono?: boolean }) {
  const short = mono && value.length > 20 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: 0 }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', fontFamily: mono ? 'JetBrains Mono, monospace' : "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{short}</span>
        {explorer && (<a href={explorer} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', flexShrink: 0 }}><ExternalLink size={12} /></a>)}
      </div>
    </div>
  )
}

function Note({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <div style={{ fontSize: '0.8rem', padding: '0.625rem 0.875rem', borderRadius: 4, borderLeft: `3px solid ${dim ? 'var(--border)' : 'var(--yellow)'}`, background: dim ? '#F8F8F6' : '#FFFBDE', color: dim ? 'var(--muted)' : 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>
      {children}
    </div>
  )
}
