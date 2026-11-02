import { useState, useEffect, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { toast } from 'sonner'
import { formatAmount, parseAmount, parseUsdc } from '@/onchain-money'
import {
  usdcAmount, AUTENTIKA_V2_ABI,
  isSupportedChain, getContractAddress, getUsdcAddress, getExplorerBase,
  ARC_TESTNET_CHAIN_ID,
} from '@/contract'
import {
  useCertificate, castCertificate, useCertTokenId, useActiveListing, castListing,
  useLegalRecord, castLegalRecord, useRoyaltyInfo, useReadChainId,
} from '@/hooks/useCommissions'
import type { Lang } from '@/i18n'
import { translations } from '@/i18n'
import { buildShareLink } from '@/lib/share'
import { Copy, ExternalLink, ArrowLeft, Award, Instagram, Send, Download, ShieldCheck } from 'lucide-react'

interface Props {
  lang: Lang
  certId: string          // hex bytes32
  onBack: () => void
  onLegalizeHelp: () => void
}

function formatAddrShort(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function fmtDate(ts: bigint, locale: string) {
  if (ts === 0n) return '—'
  return new Date(Number(ts) * 1000).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function CertificateView({ lang, certId, onBack, onLegalizeHelp }: Props) {
  const t = translations[lang]
  const locale = lang === 'es' ? 'es-ES' : 'en-US'
  const certIdHex = (certId.startsWith('0x') ? certId : `0x${certId}`) as `0x${string}`
  const { address, chainId } = useAccount()
  const readChainId = useReadChainId()
  const contractAddr = chainId !== undefined && isSupportedChain(chainId) ? getContractAddress(chainId) ?? undefined : undefined
  const usdcAddr = chainId !== undefined && isSupportedChain(chainId) ? getUsdcAddress(chainId) : getUsdcAddress(ARC_TESTNET_CHAIN_ID)
  const explorerBase = getExplorerBase(readChainId)
  const explorerAddr = (addr: string) => `${explorerBase}/address/${addr}`

  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [newOwner, setNewOwner] = useState('')
  const [transferPrice, setTransferPrice] = useState('')
  const [showListForm, setShowListForm] = useState(false)
  const [listPrice, setListPrice] = useState('')
  const [showLegalizeForm, setShowLegalizeForm] = useState(false)
  const [legalDocHash, setLegalDocHash] = useState('')
  const [legalNote, setLegalNote] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  const { data: rawCert, isLoading, isError, refetch } = useCertificate(certIdHex)
  const cert = castCertificate(rawCert)

  // NFT token ID for this cert
  const { data: tokenIdRaw } = useCertTokenId(certIdHex)
  const tokenId = tokenIdRaw !== undefined ? (tokenIdRaw as bigint) : undefined

  // Active listing
  const { data: listingRaw, refetch: refetchListing } = useActiveListing(tokenId)
  const listing = castListing(listingRaw)

  // Legal record
  const { data: legalRaw, refetch: refetchLegal } = useLegalRecord(tokenId)
  const legalRecord = castLegalRecord(legalRaw)

  // Royalty preview for listing price
  const previewPriceBn = listPrice ? parseUsdc(listPrice) : 0n
  const { data: royaltyInfoRaw } = useRoyaltyInfo(tokenId, previewPriceBn)
  const royaltyAmount = royaltyInfoRaw ? (royaltyInfoRaw as [string, bigint])[1] : 0n
  const resaleFeeAmount = previewPriceBn > 0n ? (previewPriceBn * 25n) / 10000n : 0n
  const sellerAmount = previewPriceBn > 0n ? previewPriceBn - royaltyAmount - resaleFeeAmount : 0n

  // USDC allowance for purchase
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: usdcAddr,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && contractAddr ? [address, contractAddr] : undefined,
    chainId: readChainId,
    query: { enabled: !!address && !!contractAddr },
  })

  useEffect(() => {
    void buildShareLink(`/?cert=${certId}`).then(setShareUrl)
  }, [certId])

  const { writeContract, data: txHash, isPending, error } = useWriteContract()
  const { writeContract: writeContract2, data: txHash2, isPending: isPending2 } = useWriteContract()
  const { writeContract: writeContract3, data: txHash3, isPending: isPending3 } = useWriteContract()
  const { writeContract: approveWC, data: approveHash, isPending: isApproving } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })
  const { isLoading: isConfirming2, isSuccess: isSuccess2 } = useWaitForTransactionReceipt({ hash: txHash2 })
  const { isLoading: isConfirming3, isSuccess: isSuccess3 } = useWaitForTransactionReceipt({ hash: txHash3 })
  const { isLoading: isApproving2, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  if (isSuccess) { toast.success(t.certificateTransferred); void refetch(); setShowTransfer(false) }
  if (isSuccess2) { toast.success(t.transactionConfirmed); void refetch(); void refetchListing(); setShowListForm(false); setListPrice('') }
  if (isSuccess3) { toast.success(t.legalizeSuccess); void refetchLegal(); setShowLegalizeForm(false) }
  if (approveSuccess) { toast.success(t.usdcApproved); void refetchAllowance() }
  if (error) {
    const msg = (error as Error).message
    if (msg && !msg.toLowerCase().includes('user rejected')) toast.error(msg.slice(0, 80))
  }

  async function copyLink() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function transfer() {
    if (!contractAddr) return
    if (!/^0x[0-9a-fA-F]{40}$/.test(newOwner)) { toast.error('Invalid address'); return }
    const price = transferPrice ? parseAmount(readChainId, transferPrice).raw : 0n
    writeContract({
      address: contractAddr,
      abi: AUTENTIKA_V2_ABI,
      functionName: 'transferCertificate',
      args: [certIdHex, newOwner as `0x${string}`, price],
    })
  }

  function listCertificate() {
    if (!contractAddr || tokenId === undefined || !listPrice) return
    const price = parseUsdc(listPrice)
    writeContract2({ address: contractAddr, abi: AUTENTIKA_V2_ABI, functionName: 'listCertificate', args: [tokenId, price] },
      { onError: e => toast.error((e as Error).message.slice(0, 80)) })
  }

  function cancelListing() {
    if (!contractAddr || tokenId === undefined) return
    writeContract2({ address: contractAddr, abi: AUTENTIKA_V2_ABI, functionName: 'cancelListing', args: [tokenId] },
      { onSuccess: () => { toast.success(t.listingCancelled); void refetchListing() }, onError: e => toast.error((e as Error).message.slice(0, 80)) })
  }

  function approveThenBuy() {
    if (!contractAddr || !listing?.active) return
    const allowance = (allowanceRaw) ?? 0n
    if (allowance < listing.priceUsdc) {
      approveWC({ address: usdcAddr, abi: erc20Abi, functionName: 'approve', args: [contractAddr, listing.priceUsdc] })
    } else {
      purchaseCertificate()
    }
  }

  function purchaseCertificate() {
    if (!contractAddr || tokenId === undefined) return
    writeContract2({ address: contractAddr, abi: AUTENTIKA_V2_ABI, functionName: 'purchaseCertificate', args: [tokenId] },
      { onSuccess: () => { toast.success(t.purchased); void refetch(); void refetchListing() }, onError: e => toast.error((e as Error).message.slice(0, 80)) })
  }

  function legalize() {
    if (!contractAddr || tokenId === undefined || !legalDocHash) return
    const padded = (legalDocHash.startsWith('0x') ? legalDocHash : '0x' + legalDocHash).padEnd(66, '0')
    writeContract3({ address: contractAddr, abi: AUTENTIKA_V2_ABI, functionName: 'legalize', args: [tokenId, padded as `0x${string}`, legalNote] },
      { onError: e => toast.error((e as Error).message.slice(0, 80)) })
  }

  async function downloadPdf() {
    if (!cert) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const W = 297, H = 210

    // ── Background ──────────────────────────────────────────────────────
    doc.setFillColor(253, 248, 244)
    doc.rect(0, 0, W, H, 'F')

    // Photo band (left, 60mm wide)
    if (cert.photoUrl) {
      try {
        doc.setFillColor(232, 196, 184)
        doc.rect(0, 0, 62, H, 'F')
        const img = await loadImageAsDataUrl(cert.photoUrl)
        doc.addImage(img, 'JPEG', 1, 1, 60, H - 2, '', 'FAST')
      } catch {
        doc.setFillColor(232, 196, 184)
        doc.rect(0, 0, 62, H, 'F')
        doc.setFontSize(8)
        doc.setTextColor(180, 140, 120)
        doc.text('Artwork photo', 31, H / 2, { align: 'center' })
      }
    }

    // Right area starts at x=70
    const X = 70

    // Decorative border line
    doc.setDrawColor(124, 58, 42)
    doc.setLineWidth(0.5)
    doc.line(X, 12, W - 10, 12)
    doc.line(X, H - 12, W - 10, H - 12)

    // Seal (top-right circle)
    if (cert.sealUrl) {
      try {
        const sealImg = await loadImageAsDataUrl(cert.sealUrl)
        const SX = W - 28, SY = 14
        doc.addImage(sealImg, 'PNG', SX, SY, 20, 20, '', 'FAST')
        // clip to circle with SVG is not trivially possible in jspdf, just add image
      } catch { /* no seal */ }
    }

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(45, 27, 14)
    const title = lang === 'es' ? 'Certificado de Autenticidad de Obra Original' : 'Certificate of Authenticity of Original Artwork'
    doc.text(title, X, 20)

    // Divider
    doc.setDrawColor(200, 160, 140)
    doc.setLineWidth(0.3)
    doc.line(X, 24, W - 10, 24)

    // Fields grid — two columns
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(92, 61, 46)

    const fields: [string, string][] = [
      [t.artworkTitle, cert.artworkTitle],
      [t.artistName, cert.artistName],
      [t.technique, cert.technique],
      [t.dimensions, cert.dimensions],
      [t.creationDate, fmtDate(cert.creationDate, locale)],
      [t.instagram, cert.instagramHandle ? `@${cert.instagramHandle}` : '—'],
    ]

    let row = 0
    fields.forEach(([label, value]) => {
      const col = row % 2
      const xPos = col === 0 ? X : X + (W - X - 12) / 2 + 4
      const yPos = 30 + Math.floor(row / 2) * 14
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(140, 107, 90)
      doc.text(label.toUpperCase(), xPos, yPos)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(45, 27, 14)
      doc.text(String(value || '—'), xPos, yPos + 5)
      row++
    })

    // Care instructions
    const careY = 68
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(140, 107, 90)
    doc.text((t.careInstructions ?? 'Care Instructions').toUpperCase(), X, careY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(92, 61, 46)
    const careLines: string[] = doc.splitTextToSize(cert.careInstructions || '—', W - X - 14) as string[]
    doc.text(careLines.slice(0, 2).join('\n'), X, careY + 5)

    // Payment record
    const payY = 92
    doc.setFillColor(250, 240, 232)
    doc.roundedRect(X, payY, W - X - 10, 24, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(124, 58, 42)
    doc.text(t.paymentRecord.toUpperCase(), X + 4, payY + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(45, 27, 14)
    const amtStr = formatAmount(readChainId, usdcAmount(cert.amountPaid, readChainId)) + ' USDC'
    doc.text(`${t.amountPaid}: ${amtStr}`, X + 4, payY + 12)
    doc.text(`${t.collector}: ${formatAddrShort(cert.collector)}`, X + 4, payY + 18)
    doc.setFontSize(7)
    doc.setTextColor(140, 107, 90)
    doc.text(`${t.releasedOn}: ${fmtDate(cert.releasedAt, locale)}`, X + 4, payY + 22)

    // Certificate ID
    doc.setFontSize(6.5)
    doc.setTextColor(180, 140, 120)
    doc.text(`ID: ${certId}`, X, H - 22)

    // Signature image
    const sigY = H - 38
    if (cert.signatureUrl) {
      try {
        const sigImg = await loadImageAsDataUrl(cert.signatureUrl)
        doc.addImage(sigImg, 'PNG', X, sigY, 50, 18, '', 'FAST')
      } catch { /* no signature */ }
    }
    doc.setDrawColor(200, 160, 140)
    doc.setLineWidth(0.3)
    doc.line(X, H - 18, X + 60, H - 18)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(92, 61, 46)
    doc.text(cert.artistName, X, H - 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(140, 107, 90)
    doc.text(t.artistSignature, X, H - 8)

    // Footer date + blockchain note
    doc.setFontSize(6.5)
    doc.setTextColor(180, 140, 120)
    doc.text(
      `${t.issuedWith}  ·  ${t.issuedOn}: ${fmtDate(cert.releasedAt, locale)}  ·  Arc Testnet blockchain`,
      W / 2, H - 6,
      { align: 'center' }
    )

    doc.save(`certificate-${certId.slice(0, 10)}.pdf`)
  }

  if (isLoading) return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.25rem', textAlign: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--blue)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (isError || !cert) return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.25rem', textAlign: 'center' }}>
      <button
        onClick={onBack}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '0.875rem', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={15} /> {t.back}
      </button>
      <p style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{t.certificateNotFound}</p>
    </div>
  )

  const creationDate = fmtDate(cert.creationDate, locale)
  const paymentTxRaw = cert.paymentTxHash ? String(cert.paymentTxHash) : ''
  const paymentTxExplorer =
    paymentTxRaw &&
    paymentTxRaw !== `0x${'0'.repeat(64)}` &&
    !/^0x0+$/i.test(paymentTxRaw)
      ? `${explorerBase}/tx/${paymentTxRaw}`
      : null
  const releasedDate = fmtDate(cert.releasedAt, locale)
  const isOwner = address?.toLowerCase() === cert.currentOwner.toLowerCase()
  const allowance = (allowanceRaw) ?? 0n
  const needsBuyApproval = listing?.active && allowance < listing.priceUsdc
  const isBusyMain = isPending || isConfirming
  const isBusyMarket = isPending2 || isConfirming2 || isApproving || isApproving2
  const isBusyLegal = isPending3 || isConfirming3

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.25rem' }}>

      {/* Back + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '0.875rem', padding: 0 }}
        >
          <ArrowLeft size={15} /> {t.back}
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {shareUrl && (
            <button onClick={() => { void copyLink() }} className="btn-outline" style={{ padding: '0.4rem 0.875rem', fontSize: '0.75rem', gap: '0.375rem' }}>
              <Copy size={12} /> {copied ? t.copied : t.copyLink}
            </button>
          )}
          <button onClick={() => { void downloadPdf() }} className="btn-primary" style={{ padding: '0.4rem 0.875rem', fontSize: '0.75rem', gap: '0.375rem' }}>
            <Download size={12} /> {t.downloadPdf}
          </button>
        </div>
      </div>

      {/* ── Certificate Sheet with nested frames ────────────────────────── */}
      <div
        ref={printRef}
        style={{
          position: 'relative',
          background: '#FFFFFF',
          /* Three concentric outlines: pink > yellow > sky */
          boxShadow: '0 0 0 3px var(--pink), 0 0 0 6px var(--yellow), 0 0 0 9px var(--sky)',
          borderRadius: 4,
          aspectRatio: '297/210',
          display: 'grid',
          gridTemplateColumns: '200px 1fr',
          overflow: 'hidden',
        }}
      >
        {/* Halftone corner on certificate */}
        <div
          style={{
            position: 'absolute',
            top: 0, right: 0,
            width: 80, height: 80,
            backgroundImage: 'radial-gradient(circle, var(--blue) 1.5px, transparent 1.5px)',
            backgroundSize: '8px 8px',
            opacity: 0.15,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0, left: 0,
            width: 80, height: 80,
            backgroundImage: 'radial-gradient(circle, var(--pink-dark) 1.5px, transparent 1.5px)',
            backgroundSize: '8px 8px',
            opacity: 0.18,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />

        {/* Left photo band */}
        <div style={{ position: 'relative', overflow: 'hidden', background: '#e8e0f0', borderRight: '3px solid var(--blue)' }}>
          {cert.photoUrl ? (
            <img src={cert.photoUrl} alt={cert.artworkTitle} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={36} color="var(--blue)" opacity={0.2} />
            </div>
          )}
        </div>

        {/* Right content */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div>
              <p
                style={{
                  fontSize: '0.65rem',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--blue)',
                  marginBottom: 4,
                }}
              >
                {lang === 'es' ? 'Certificado de Autenticidad de Obra Original' : 'Certificate of Authenticity of Original Artwork'}
              </p>
              <div style={{ width: 40, height: 2.5, background: 'var(--pink)', borderRadius: 2 }} />
            </div>
            {/* Seal */}
            {cert.sealUrl ? (
              <img src={cert.sealUrl} alt="seal" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--blue)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2.5px solid var(--blue)', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Award size={18} color="var(--blue)" />
              </div>
            )}
          </div>

          {/* Fields grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 1.5rem', marginBottom: '0.625rem' }}>
            <DetailCell label={t.artworkTitle} value={cert.artworkTitle} />
            <DetailCell label={t.artistName}   value={cert.artistName} />
            <DetailCell label={t.technique}    value={cert.technique} />
            <DetailCell label={t.dimensions}   value={cert.dimensions} />
            <DetailCell label={t.creationDate} value={creationDate} />
            {cert.instagramHandle && (
              <DetailCell label={t.instagram} value={`@${cert.instagramHandle}`} icon={<Instagram size={10} />} />
            )}
          </div>

          {/* Care instructions */}
          {cert.careInstructions && (
            <div
              style={{
                marginBottom: '0.5rem',
                padding: '0.375rem 0.625rem',
                background: 'var(--blue-light)',
                borderLeft: '3px solid var(--blue)',
                fontSize: '0.6rem',
                fontFamily: "'Inter', sans-serif",
                color: 'var(--ink-2)',
                lineHeight: 1.4,
              }}
            >
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, textTransform: 'uppercase', fontSize: '0.55rem', color: 'var(--blue)', marginRight: 4, letterSpacing: '0.08em' }}>{t.careInstructions}:</span>
              {cert.careInstructions}
            </div>
          )}

          {/* Payment record */}
          <div
            style={{
              marginBottom: '0.5rem',
              padding: '0.375rem 0.625rem',
              background: '#F0FAF0',
              border: '1.5px solid var(--green)',
              borderRadius: 3,
              fontSize: '0.6rem',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, textTransform: 'uppercase', fontSize: '0.55rem', color: 'var(--green)', letterSpacing: '0.08em', marginBottom: 3 }}>{t.paymentRecord}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 1.25rem' }}>
              <span><strong>{t.amountPaid}:</strong> {formatAmount(readChainId, usdcAmount(cert.amountPaid, readChainId))} USDC</span>
              <span><strong>{t.releasedOn}:</strong> {releasedDate}</span>
              <a href={explorerAddr(cert.collector)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--blue)', textDecoration: 'none' }}>
                <ExternalLink size={8} /> {t.collector}: {formatAddrShort(cert.collector)}
              </a>
            </div>
          </div>

          {/* Signature + cert ID */}
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div>
              {cert.signatureUrl ? (
                <img src={cert.signatureUrl} alt="signature" style={{ maxHeight: 32, maxWidth: 100, objectFit: 'contain' }} />
              ) : (
                <div style={{ height: 24, width: 80, borderBottom: '2px solid var(--blue)' }} />
              )}
              <div style={{ borderTop: '1.5px solid var(--border)', paddingTop: 3, marginTop: 3 }}>
                <p style={{ fontSize: '0.65rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: 'var(--ink)' }}>{cert.artistName}</p>
                <p style={{ fontSize: '0.55rem', color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{t.artistSignature}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: '0.55rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--subtle)', lineHeight: 1.5 }}>
                {t.certificateId}:<br />{certId.slice(0, 18)}…
              </p>
              <a href={contractAddr ? explorerAddr(contractAddr) : '#'} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.55rem', color: 'var(--blue)', textDecoration: 'none', marginTop: 2 }}>
                <Send size={7} /> {readChainId === ARC_TESTNET_CHAIN_ID ? 'Arc Testnet' : 'Arc Mainnet'}
              </a>
              <p style={{ fontSize: '0.55rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: 'var(--blue)', marginTop: 2 }}>{t.issuedWith}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Verified on blockchain */}
      <div
        className="framed-card-sm"
        style={{
          marginTop: '1.5rem',
          padding: '1.15rem 1.35rem',
          borderColor: 'var(--green)',
          background: '#F0FAF0',
        }}
      >
        <p style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 800,
          textTransform: 'uppercase',
          fontSize: '0.65rem',
          color: 'var(--green)',
          letterSpacing: '0.08em',
          margin: '0 0 0.45rem',
        }}>{t.verifiedOnChainTitle}</p>
        <p style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--ink)', margin: '0 0 0.85rem' }}>
          {t.verifiedOnChainBody}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
          {contractAddr && (
            <a href={explorerAddr(contractAddr)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>
              {t.verifiedContract} →
            </a>
          )}
          {tokenId !== undefined && tokenId > 0n && contractAddr && (
            <a href={`${explorerBase}/token/${contractAddr}?a=${tokenId.toString()}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>
              {t.verifiedToken} #{tokenId.toString()} →
            </a>
          )}
          {paymentTxExplorer && (
            <a href={paymentTxExplorer} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)' }}>
              {t.verifiedPayment} →
            </a>
          )}
          <a href={explorerBase} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>
            {t.verifiedOpenExplorer}
          </a>
        </div>
      </div>

      {/* Provenance */}
      {cert.owners.length > 0 && (
        <div
          className="framed-card-sm"
          style={{ marginTop: '1.75rem', padding: '1.25rem 1.5rem' }}
        >
          <h3 className="display" style={{ fontSize: '0.9rem', color: 'var(--blue)', marginBottom: '0.875rem', fontWeight: 700 }}>{t.provenance}</h3>
          <div>
            {cert.owners.map((owner, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
                  padding: '0.5rem 0',
                  borderBottom: i < cert.owners.length - 1 ? '1.5px solid var(--border)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <span
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: '2px solid var(--blue)', background: 'var(--yellow)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '0.65rem',
                      color: 'var(--blue)', flexShrink: 0,
                    }}
                  >{i + 1}</span>
                  <a href={explorerAddr(owner)} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--ink-2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner}</span>
                    <ExternalLink size={10} style={{ flexShrink: 0 }} />
                  </a>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, flexShrink: 0 }}>
                  {cert.prices[i] !== undefined && cert.prices[i] > 0n
                    ? `${formatAmount(readChainId, usdcAmount(cert.prices[i], readChainId))} USDC`
                    : lang === 'es' ? 'Inicial' : 'Initial'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NFT Token Info ──────────────────────────────────────────────── */}
      {tokenId !== undefined && tokenId > 0n && (
        <div className="framed-card-sm" style={{ marginTop: '1.5rem', padding: '1.25rem 1.5rem' }}>
          <h3 className="display" style={{ fontSize: '0.9rem', color: 'var(--blue)', marginBottom: '0.75rem' }}>
            {t.nftToken} #{tokenId.toString()}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.625rem', fontSize: '0.8rem' }}>
            <div>
              <p className="field-label">{t.nftOwner}</p>
              <a href={explorerAddr(cert.currentOwner)} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {formatAddrShort(cert.currentOwner)} <ExternalLink size={10} />
              </a>
            </div>
            <div>
              <p className="field-label">{t.viewOnChain}</p>
              <a href={contractAddr ? `${explorerBase}/token/${contractAddr}?a=${tokenId.toString()}` : '#'} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--blue)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                {readChainId === ARC_TESTNET_CHAIN_ID ? 'Arc Testnet' : 'Arc Mainnet'} <ExternalLink size={10} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Resale / legalize / transfer — roadmap only (not presented as live UI) */}
      {tokenId !== undefined && tokenId > 0n && (
        <div className="framed-card-sm" style={{ marginTop: '1rem', padding: '1.1rem 1.35rem', borderStyle: 'dashed' }}>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, textTransform: 'uppercase',
            fontSize: '0.65rem', color: 'var(--muted)', letterSpacing: '0.08em', margin: '0 0 0.4rem',
          }}>{t.roadmapBadge}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-2)', margin: 0, lineHeight: 1.55 }}>
            {t.certRoadmapNote}
          </p>
        </div>
      )}
    </div>
  )
}

function DetailCell({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: '0.58rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--blue)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
      <p style={{ fontSize: '0.7rem', fontFamily: "'Inter', sans-serif", fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {icon}{value || '—'}
      </p>
    </div>
  )
}

async function loadImageAsDataUrl(url: string): Promise<string> {
  const resp = await fetch(url, { mode: 'cors' })
  const blob = await resp.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
