import { useState, useRef } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { toast } from 'sonner'
import { KATHONEJO_ABI, getContractAddress, isSupportedChain, ARC_TESTNET_CHAIN_ID } from '@/contract'
import type { Lang } from '@/i18n'
import { translations } from '@/i18n'
import { useAccount } from 'wagmi'

interface Props {
  lang: Lang
  commissionId: bigint
  onDelivered: () => void
}

const DEFAULT_CARE = 'Store away from direct sunlight and humidity. Do not use chemical solvents.'

export function DeliveryCertificateForm({ lang, commissionId, onDelivered }: Props) {
  const t = translations[lang]
  const { chainId } = useAccount()
  const readChainId = chainId !== undefined && isSupportedChain(chainId) ? chainId : ARC_TESTNET_CHAIN_ID
  const contractAddr = getContractAddress(readChainId) ?? undefined

  const [artworkTitle, setArtworkTitle] = useState('')
  const [artistName, setArtistName] = useState('')
  const [technique, setTechnique] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [creationDateStr, setCreationDateStr] = useState('')
  const [careInstructions, setCareInstructions] = useState(DEFAULT_CARE)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoHash, setPhotoHash] = useState('')
  const [hashComputed, setHashComputed] = useState(false)
  const [hashBusy, setHashBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash })

  // ── Photo upload + SHA-256 ──────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setHashBusy(true)
    setHashComputed(false)
    try {
      const buf = await file.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', buf)
      const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
      setPhotoHash('0x' + hex)
      // If no URL set yet, use a local object URL as placeholder
      if (!photoUrl) setPhotoUrl(URL.createObjectURL(file))
      setHashComputed(true)
      toast.success(t.photoHashComputed)
    } catch {
      toast.error('Could not compute hash. Please use the manual field.')
    } finally {
      setHashBusy(false)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!contractAddr) return
    const normalHash = photoHash.startsWith('0x')
      ? photoHash.padEnd(66, '0')
      : ('0x' + photoHash).padEnd(66, '0')

    const creationDate = creationDateStr
      ? BigInt(Math.floor(new Date(creationDateStr).getTime() / 1000))
      : BigInt(Math.floor(Date.now() / 1000))

    writeContract({
      address: contractAddr,
      abi: KATHONEJO_ABI,
      functionName: 'markDelivered',
      args: [
        commissionId,
        artworkTitle,
        artistName,
        technique,
        dimensions,
        creationDate,
        careInstructions,
        photoUrl,
        normalHash as `0x${string}`,
      ],
    }, {
      onSuccess: () => {
        toast.success(t.deliverySubmitted)
        onDelivered()
      },
      onError: (e) => toast.error(e.message.slice(0, 100)),
    })
  }

  const busy = isPending || confirming
  const canSubmit = artworkTitle && artistName && technique && dimensions && photoHash.length >= 66

  return (
    <div className="framed-card" style={{ padding: '1.5rem 1.25rem' }}>
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <div className="halftone-corner" style={{ top: 0, right: 0, width: 60, height: 60 }} />
        <h2 className="display" style={{ color: 'var(--blue)', fontSize: '1.3rem', margin: 0 }}>
          {t.markDelivered}
        </h2>
        <hr className="rule-pink" style={{ marginTop: '0.5rem' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        <Field label={t.artworkTitle}>
          <input className="field-input" value={artworkTitle} onChange={e => setArtworkTitle(e.target.value)} placeholder="Portrait of…" />
        </Field>

        <Field label={t.artistName}>
          <input className="field-input" value={artistName} onChange={e => setArtistName(e.target.value)} placeholder="Your name as signed" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <Field label={t.technique}>
            <input className="field-input" value={technique} onChange={e => setTechnique(e.target.value)} placeholder="Oil on canvas" />
          </Field>
          <Field label={t.dimensions}>
            <input className="field-input" value={dimensions} onChange={e => setDimensions(e.target.value)} placeholder="50 × 70 cm" />
          </Field>
        </div>

        <Field label={t.creationDate}>
          <input className="field-input" type="date" value={creationDateStr} onChange={e => setCreationDateStr(e.target.value)} />
        </Field>

        <Field label={t.careInstructions} hint={t.careInstructionsHint}>
          <textarea
            className="field-input"
            rows={3}
            value={careInstructions}
            onChange={e => setCareInstructions(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </Field>

        {/* ── Photo upload ──────────────────────────────────────────── */}
        <div>
          <label className="field-label">{t.uploadPhoto}</label>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>{t.uploadPhotoHint}</p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => { void handleFileChange(e) }}
          />
          <button
            type="button"
            className="btn-outline"
            disabled={hashBusy}
            onClick={() => fileRef.current?.click()}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          >
            {hashBusy ? t.computingHash : '📷 ' + t.uploadPhoto}
          </button>

          {hashComputed && photoHash && (
            <div style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--success-light)',
              border: '1.5px solid var(--success)',
              borderRadius: 6,
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              color: 'var(--success)',
              marginBottom: '0.5rem',
            }}>
              ✓ {t.photoHashComputed}: {photoHash.slice(0, 20)}…
            </div>
          )}

          <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.375rem' }}>{t.orManual}</p>
          <Field label={t.photoUrl}>
            <input className="field-input" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://…" />
          </Field>
          <Field label={t.photoHash} hint={t.photoHashHint}>
            <input
              className="field-input"
              value={photoHash}
              onChange={e => { setPhotoHash(e.target.value); setHashComputed(false) }}
              placeholder="0xabc123…"
              style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </Field>
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          disabled={busy || !canSubmit}
          onClick={handleSubmit}
        >
          {busy ? t.submitting : t.submitDelivery}
        </button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {hint && <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>{hint}</p>}
      {children}
    </div>
  )
}
