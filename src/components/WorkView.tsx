import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { toast } from 'sonner'
import {
  KATHONEJO_ABI,
  getContractAddress,
  usdcAmount,
  explorerAddr,
  explorerTx,
  ARC_MAINNET_CHAIN_ID,
  getExplorerBase,
} from '@/contract'
import { useReadChainId } from '@/hooks/useCommissions'
import { usePhysicalByCommission, useDirectoryContractAddress } from '@/hooks/useDirectory'
import { DIRECTORY_ABI, isDirectoryConfigured } from '@/directory'
import { translations } from '@/i18n'
import type { Lang } from '@/i18n'

interface Props {
  lang: Lang
  tokenId: bigint
  onBack: () => void
  onOpenArtist: (addr: `0x${string}`) => void
  onTokenizeHelp: () => void
}

type Cert = {
  commissionId: bigint
  artworkTitle: string
  artistName: string
  technique: string
  dimensions: string
  photoUrl: string
  amountPaid: bigint
  collector: string
  currentOwner: string
  id: string
  paymentTxHash?: string
}

const ZERO_HASH = '0x' + '0'.repeat(64)

function normalizeTxHash(raw: unknown): string | null {
  if (raw == null) return null
  let hex = typeof raw === 'string' ? raw : `0x${BigInt(raw as bigint).toString(16).padStart(64, '0')}`
  if (!hex.startsWith('0x')) hex = `0x${hex}`
  if (hex.toLowerCase() === ZERO_HASH) return null
  if (/^0x0+$/i.test(hex)) return null
  return hex
}

export function WorkView({ lang, tokenId, onBack, onOpenArtist, onTokenizeHelp }: Props) {
  const t = translations[lang]
  const { address } = useAccount()
  const chainId = useReadChainId()
  const autentika = getContractAddress(chainId) ?? undefined
  const dirAddr = useDirectoryContractAddress()
  const explorerBase = getExplorerBase(chainId)

  const { data: certRaw, isLoading, isError } = useReadContract({
    address: autentika,
    abi: KATHONEJO_ABI,
    functionName: 'getCertificateByTokenId',
    args: [tokenId],
    chainId,
    query: { enabled: !!autentika && tokenId > 0n },
  })
  const cert = certRaw as Cert | undefined

  const { data: commissionRaw } = useReadContract({
    address: autentika,
    abi: KATHONEJO_ABI,
    functionName: 'getCommission',
    args: cert?.commissionId !== undefined ? [cert.commissionId] : undefined,
    chainId,
    query: { enabled: !!autentika && cert?.commissionId !== undefined },
  })
  const artistAddr = (commissionRaw as { artist?: string } | undefined)?.artist as `0x${string}` | undefined

  const { data: ownerRaw } = useReadContract({
    address: autentika,
    abi: KATHONEJO_ABI,
    functionName: 'ownerOf',
    args: [tokenId],
    chainId,
    query: { enabled: !!autentika },
  })
  const owner = ownerRaw as string | undefined

  const { data: physicalRaw, refetch: refetchPhysical } = usePhysicalByCommission(cert?.commissionId)
  const physical = physicalRaw as
    | { accompaniesPhysical: boolean; redeemed: boolean; shipped: boolean; artist: string }
    | undefined

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })
  if (isSuccess) {
    toast.success(t.physicalRedeemed)
    void refetchPhysical()
  }

  function redeem() {
    if (!dirAddr) return
    writeContract({
      address: dirAddr,
      abi: DIRECTORY_ABI,
      functionName: 'redeemPhysical',
      args: [tokenId],
    }, { onError: e => toast.error(e.message.slice(0, 100)) })
  }

  function markShipped() {
    if (!dirAddr) return
    writeContract({
      address: dirAddr,
      abi: DIRECTORY_ABI,
      functionName: 'markShipped',
      args: [tokenId],
    }, {
      onSuccess: () => toast.success(t.physicalShipped),
      onError: e => toast.error(e.message.slice(0, 100)),
    })
  }

  if (isLoading) {
    return <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>{t.loading}</p>
  }
  if (isError || !cert) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <button className="btn-outline" onClick={onBack}>← {t.back}</button>
        <p style={{ marginTop: '1.5rem', color: 'var(--muted)' }}>{t.workNotFound}</p>
      </div>
    )
  }

  const isOwner = !!address && !!owner && address.toLowerCase() === owner.toLowerCase()
  const isArtist = !!address && !!artistAddr && address.toLowerCase() === artistAddr.toLowerCase()
  const paymentTx = normalizeTxHash(cert.paymentTxHash)
  const contractLink = autentika
    ? explorerAddr(autentika, chainId)
    : explorerAddr('0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4', ARC_MAINNET_CHAIN_ID)
  const tokenLink = autentika
    ? `${explorerBase}/token/${autentika}?a=${tokenId.toString()}`
    : '#'

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <button className="btn-outline" onClick={onBack} style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', marginBottom: '1.25rem' }}>
        ← {t.back}
      </button>

      <div className="framed-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem' }}>
        {cert.photoUrl ? (
          <img src={cert.photoUrl} alt={cert.artworkTitle} style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ height: 200, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="poster" style={{ color: 'var(--blue)', fontSize: '3rem' }}>{cert.artworkTitle.slice(0, 1)}</span>
          </div>
        )}
        <div style={{ padding: '1.25rem' }}>
          <h1 className="poster" style={{ fontSize: '1.6rem', color: 'var(--blue)', margin: 0 }}>{cert.artworkTitle}</h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--ink-2)' }}>
            {cert.artistName}
            {cert.technique ? ` · ${cert.technique}` : ''}
            {cert.dimensions ? ` · ${cert.dimensions}` : ''}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            {t.amountPaid}: {usdcAmount(cert.amountPaid, chainId).toString()} USDC · Token #{tokenId.toString()}
          </p>
        </div>
      </div>

      <div
        className="framed-card"
        style={{
          padding: '1.15rem 1.35rem',
          marginBottom: '1rem',
          borderColor: 'var(--green)',
          background: '#F0FAF0',
        }}
      >
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 800,
            textTransform: 'uppercase',
            fontSize: '0.65rem',
            color: 'var(--green)',
            letterSpacing: '0.08em',
            margin: '0 0 0.45rem',
          }}
        >
          {t.verifiedOnChainTitle}
        </p>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--ink)', margin: '0 0 0.85rem' }}>
          {t.verifiedOnChainBody}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
          <a href={contractLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>
            {t.verifiedContract} →
          </a>
          <a href={tokenLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>
            {t.verifiedToken} #{tokenId.toString()} →
          </a>
          {paymentTx && (
            <a href={explorerTx(paymentTx, chainId)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>
              {t.verifiedPayment} →
            </a>
          )}
          <a href={explorerBase} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
            {t.verifiedOpenExplorer}
          </a>
        </div>
      </div>

      {artistAddr && (
        <button
          className="btn-primary"
          style={{ width: '100%', marginBottom: '0.75rem' }}
          onClick={() => onOpenArtist(artistAddr)}
        >
          {t.commissionThisArtist}
        </button>
      )}

      <button className="btn-outline" style={{ width: '100%', marginBottom: '1rem' }} onClick={onTokenizeHelp}>
        {t.tokenizeCta}
      </button>

      {isDirectoryConfigured() && physical?.accompaniesPhysical && (
        <div className="framed-card" style={{ padding: '1.25rem' }}>
          <h2 className="display" style={{ fontSize: '1rem', color: 'var(--blue)', margin: '0 0 0.5rem' }}>{t.physicalTitle}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-2)', margin: '0 0 0.75rem' }}>{t.physicalHint}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0 0 0.75rem' }}>
            {physical.redeemed
              ? (physical.shipped ? t.physicalStatusShipped : t.physicalStatusRedeemed)
              : t.physicalStatusAvailable}
          </p>
          {isOwner && !physical.redeemed && (
            <button className="btn-primary" disabled={isPending || confirming} onClick={redeem} style={{ width: '100%' }}>
              {isPending || confirming ? t.redeeming : t.redeemPhysical}
            </button>
          )}
          {isArtist && physical.redeemed && !physical.shipped && dirAddr && (
            <button className="btn-outline" disabled={isPending || confirming} onClick={markShipped} style={{ width: '100%' }}>
              {t.markShipped}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
