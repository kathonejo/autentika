import { useState, useRef, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { toast } from 'sonner'
import { AUTENTIKA_V2_ABI, getContractAddress, isSupportedChain, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { useArtistProfile, castArtistProfile } from '@/hooks/useCommissions'
import type { Lang } from '@/i18n'
import { translations } from '@/i18n'

interface Props {
  lang: Lang
  commissionId: bigint
  onDelivered: () => void
}

const DEFAULT_TECHNIQUE_EN = 'Mixed media'
const DEFAULT_TECHNIQUE_ES = 'Técnica mixta'
const DEFAULT_DIMS = '—'
const DEFAULT_CARE_EN = 'Store away from direct sunlight and humidity. Do not use chemical solvents.'
const DEFAULT_CARE_ES = 'Evite la luz solar directa, la humedad y temperaturas extremas; limpie suavemente con un paño seco.'

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function DeliveryCertificateForm({ lang, commissionId, onDelivered }: Props) {
  const t = translations[lang]
  const { address, chainId } = useAccount()
  const readChainId = chainId !== undefined && isSupportedChain(chainId) ? chainId : ARC_TESTNET_CHAIN_ID
  const contractAddr = getContractAddress(readChainId) ?? undefined
  const { data: rawProfile } = useArtistProfile(address)
  const profile = castArtistProfile(rawProfile)

  const [artworkTitle, setArtworkTitle] = useState('')
  const [artistName, setArtistName] = useState('')
  const [technique, setTechnique] = useState(lang === 'es' ? DEFAULT_TECHNIQUE_ES : DEFAULT_TECHNIQUE_EN)
  const [dimensions, setDimensions] = useState(DEFAULT_DIMS)
  const [creationDateStr, setCreationDateStr] = useState(todayISO())
  const [careInstructions, setCareInstructions] = useState(lang === 'es' ? DEFAULT_CARE_ES : DEFAULT_CARE_EN)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoHash, setPhotoHash] = useState('')
  const [hashComputed, setHashComputed] = useState(false)
  const [hashBusy, setHashBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const prefilled = useRef(false)

  useEffect(() => {
    if (prefilled.current || !profile?.exists) return
    if (profile.displayName) setArtistName(profile.displayName)
    prefilled.current = true
  }, [profile])

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash })

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
      if (!photoUrl) setPhotoUrl(URL.createObjectURL(file))
      setHashComputed(true)
      toast.success(t.photoHashComputed)
    } catch {
      toast.error('Could not compute hash. Please use the manual field.')
    } finally {
      setHashBusy(false)
    }
  }

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
      abi: AUTENTIKA_V2_ABI,
      functionName: 'markDelivered',
      args: [
        commissionId,
        artworkTitle,
        artistName || profile?.displayName || 'Artist',
        technique || (lang === 'es' ? DEFAULT_TECHNIQUE_ES : DEFAULT_TECHNIQUE_EN),
        dimensions || DEFAULT_DIMS,
        creationDate,
        careInstructions || (lang === 'es' ? DEFAULT_CARE_ES : DEFAULT_CARE_EN),
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
  const canSubmit = !!artworkTitle && photoHash.length >= 66

  return (
    <div className="framed-card" style={{ padding: '1.5rem 1.25rem' }}>
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <div className="halftone-corner" style={{ top: 0, right: 0, width: 60, height: 60 }} />
        <h2 className="display" style={{ color: 'var(--blue)', fontSize: '1.3rem', margin: 0 }}>
          {t.markDelivered}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '0.4rem 0 0' }}>{t.deliveryFormHint}</p>
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
            <input className="field-input" value={technique} onChange={e => setTechnique(e.target.value)} />
          </Field>
          <Field label={t.dimensions}>
            <input className="field-input" value={dimensions} onChange={e => setDimensions(e.target.value)} />
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

        <div>
          <label className="field-label">{t.uploadPhoto}</label>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>{t.uploadPhotoHint}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ fontSize: '0.85rem' }}
          />
          {hashBusy && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.35rem' }}>{t.computingHash}</p>}
          {hashComputed && (
            <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--green)', marginTop: '0.35rem', wordBreak: 'break-all' }}>
              SHA-256: {photoHash.slice(0, 18)}…
            </p>
          )}
          <Field label={t.photoHash}>
            <input
              className="field-input"
              value={photoHash}
              onChange={e => { setPhotoHash(e.target.value); setHashComputed(e.target.value.length >= 66) }}
              placeholder="0x…"
              style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
            />
          </Field>
          <Field label={t.photoUrl}>
            <input className="field-input" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="https://…" />
          </Field>
        </div>

        <button className="btn-primary" style={{ width: '100%' }} disabled={busy || !canSubmit} onClick={handleSubmit}>
          {busy ? t.confirming : t.submitDelivery}
        </button>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {hint && <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: '0 0 0.35rem' }}>{hint}</p>}
      {children}
    </div>
  )
}
