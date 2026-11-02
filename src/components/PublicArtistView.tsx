import { useMemo, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi'
import { toast } from 'sonner'
import { useArtistProfile, castArtistProfile, useArtistCommissions, useReadChainId, castCommission } from '@/hooks/useCommissions'
import { useArtistListing, useDirectoryContractAddress } from '@/hooks/useDirectory'
import { DIRECTORY_ABI, MAX_REQUEST_CHARS, isDirectoryConfigured } from '@/directory'
import { KATHONEJO_ABI, getContractAddress, usdcAmount, type CommissionData, CommissionStatus } from '@/contract'
import { artistSharePath } from '@/lib/hashRoute'
import { translations } from '@/i18n'
import type { Lang } from '@/i18n'
import { Copy, Check } from 'lucide-react'

interface Props {
  lang: Lang
  artist: `0x${string}`
  onBack: () => void
  onOpenWork: (tokenId: bigint) => void
  onOpenCommission: (id: bigint) => void
  onSubscribe?: (artist: `0x${string}`) => void
}

export function PublicArtistView({ lang, artist, onBack, onOpenCommission, onSubscribe }: Props) {
  const t = translations[lang]
  const { address, isConnected } = useAccount()
  const chainId = useReadChainId()
  const autentika = getContractAddress(chainId) ?? undefined
  const dirAddr = useDirectoryContractAddress()
  const { data: rawProfile } = useArtistProfile(artist)
  const profile = castArtistProfile(rawProfile)
  const { data: listingRaw } = useArtistListing(artist)
  const listing = listingRaw as { bio: string; basePriceUsdc: bigint; pitch: string; registered: boolean } | undefined
  const { data: commissionIdsRaw } = useArtistCommissions(artist)
  const commissionIds = (commissionIdsRaw as bigint[] | undefined) ?? []

  const commissionReads = useMemo(() => commissionIds.map(id => ({
    address: autentika as `0x${string}`,
    abi: KATHONEJO_ABI,
    functionName: 'getCommission' as const,
    args: [id] as const,
    chainId,
  })), [commissionIds, autentika, chainId])

  const { data: commissionsRaw } = useReadContracts({
    contracts: (autentika && commissionIds.length ? commissionReads : []) as any,
    query: { enabled: !!autentika && commissionIds.length > 0 },
  })

  const commissions: CommissionData[] = useMemo(() => {
    if (!commissionsRaw) return []
    return commissionsRaw
      .map(r => castCommission(r.result))
      .filter((c): c is CommissionData => !!c)
      .reverse()
  }, [commissionsRaw])

  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })
  if (isSuccess) toast.success(t.requestSent)

  const shareUrl = `${window.location.origin}${window.location.pathname}${artistSharePath(artist)}`
  const remaining = MAX_REQUEST_CHARS - new TextEncoder().encode(message).length
  const canRequest = isDirectoryConfigured() && !!dirAddr && !!listing?.registered && remaining >= 0 && message.trim().length > 0

  function copyShare() {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      toast.success(t.linkCopied)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function sendRequest() {
    if (!dirAddr || !canRequest) return
    const bytes = new TextEncoder().encode(message.trim())
    if (bytes.length === 0 || bytes.length > MAX_REQUEST_CHARS) {
      toast.error(t.requestTooLong)
      return
    }
    writeContract({
      address: dirAddr,
      abi: DIRECTORY_ABI,
      functionName: 'requestCommission',
      args: [artist, message.trim()],
    }, {
      onError: (e) => toast.error(e.message.slice(0, 100)),
    })
  }

  const displayName = profile?.displayName || `${artist.slice(0, 6)}…${artist.slice(-4)}`

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <button className="btn-outline" onClick={onBack} style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', marginBottom: '1.25rem' }}>
        ← {t.back}
      </button>

      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <div className="halftone-corner" style={{ top: 0, right: 0, width: 70, height: 70 }} />
        <h1 className="poster" style={{ fontSize: '1.85rem', color: 'var(--blue)', margin: 0 }}>{displayName}</h1>
        {profile?.instagramHandle && (
          <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)' }}>@{profile.instagramHandle}</p>
        )}
        <p className="mono" style={{ fontSize: '0.7rem', color: 'var(--subtle)', marginTop: 6, wordBreak: 'break-all' }}>{artist}</p>
      </div>

      <div className="framed-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <label className="field-label">{t.shareProfileLink}</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="field-input mono" readOnly value={shareUrl} style={{ flex: 1, fontSize: '0.75rem' }} />
          <button className="btn-outline" type="button" onClick={copyShare} style={{ padding: '0.45rem 0.75rem' }}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {(listing?.bio || listing?.pitch || (listing?.basePriceUsdc !== undefined && listing.registered)) && (
        <div className="framed-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          {listing?.bio && <p style={{ margin: 0, color: 'var(--ink-2)' }}>{listing.bio}</p>}
          {listing?.registered && (
            <p style={{ margin: '0.75rem 0 0', fontWeight: 700 }}>
              {t.fromPrice}: {usdcAmount(listing.basePriceUsdc ?? 0n, chainId).toString()} USDC
            </p>
          )}
          {listing?.pitch && <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>{listing.pitch}</p>}
        </div>
      )}

      
      {onSubscribe && (
        <button
          className="btn-primary"
          onClick={() => onSubscribe(artist)}
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          {t.subscribeCta}
        </button>
      )}

      <div className="framed-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 className="display" style={{ fontSize: '1.05rem', color: 'var(--blue)', margin: '0 0 0.5rem' }}>{t.requestCommissionTitle}</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 0.75rem' }}>{t.requestCommissionHint}</p>

        {!isDirectoryConfigured() && (
          <p style={{ fontSize: '0.85rem', color: 'var(--warning)', margin: 0 }}>{t.directoryNotDeployed}</p>
        )}

        {isDirectoryConfigured() && !listing?.registered && (
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>{t.artistNotInDirectory}</p>
        )}

        {isDirectoryConfigured() && listing?.registered && (
          <>
            <textarea
              className="field-input"
              rows={4}
              maxLength={400}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t.requestPlaceholder}
              style={{ width: '100%', resize: 'vertical', fontFamily: "'Inter', sans-serif" }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: remaining < 0 ? 'var(--danger)' : 'var(--muted)' }}>
                {t.requestCounter.replace('{n}', String(Math.max(0, remaining))).replace('{max}', String(MAX_REQUEST_CHARS))}
              </span>
              <button
                className="btn-primary"
                disabled={!isConnected || !canRequest || isPending || confirming || address?.toLowerCase() === artist.toLowerCase()}
                onClick={sendRequest}
              >
                {isPending || confirming ? t.sendingRequest : t.sendRequest}
              </button>
            </div>
          </>
        )}
      </div>

      <h2 className="display" style={{ fontSize: '1.05rem', color: 'var(--blue)', margin: '0 0 0.75rem' }}>{t.previousCommissions}</h2>
      {commissions.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t.noPreviousCommissions}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {commissions.map(c => (
            <button
              key={c.id.toString()}
              type="button"
              className="framed-card"
              onClick={() => onOpenCommission(c.id)}
              style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'var(--bg-alt)' }}
            >
              <div className="display" style={{ fontSize: '0.95rem', color: 'var(--blue)' }}>{c.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>
                {usdcAmount(c.amount, chainId).toString()} USDC · {statusLabel(c.status, t)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function statusLabel(status: CommissionStatus, t: typeof translations[Lang]) {
  switch (status) {
    case CommissionStatus.Created: return t.statusCreated
    case CommissionStatus.Funded: return t.statusFunded
    case CommissionStatus.Delivered: return t.statusDelivered
    case CommissionStatus.Released: return t.statusReleased
    case CommissionStatus.Refunded: return t.statusRefunded
    case CommissionStatus.Cancelled: return t.statusCancelled
    default: return String(status)
  }
}
