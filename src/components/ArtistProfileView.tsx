import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useChainId } from 'wagmi'
import { toast } from 'sonner'
import { KATHONEJO_ABI, isSupportedChain, getContractAddress, ARC_TESTNET_CHAIN_ID } from '@/contract'
import { useArtistProfile, castArtistProfile } from '@/hooks/useCommissions'
import type { ArtistProfileData } from '@/contract'
import type { Lang } from '@/i18n'
import { translations } from '@/i18n'
import { User, Instagram, Image, PenTool, Save, CheckCircle } from 'lucide-react'

interface Props { lang: Lang; onBack?: () => void }

const DEFAULT_CARE_EN = 'Avoid direct sunlight, humidity and extreme temperatures; clean gently with a dry cloth.'
const DEFAULT_CARE_ES = 'Evite la luz solar directa, la humedad y temperaturas extremas; limpie suavemente con un paño seco.'

export function ArtistProfileView({ lang }: Props) {
  const t = translations[lang]
  const { address, isConnected, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const { data: rawProfile, refetch } = useArtistProfile(address)
  const profile = castArtistProfile(rawProfile)

  if (!isConnected) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '4rem 1.25rem', textAlign: 'center' }}>
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 1rem',
            border: '2px solid var(--blue)', background: 'var(--yellow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <User size={28} color="var(--blue)" />
        </div>
        <p style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{t.connectWallet}</p>
      </div>
    )
  }

  if (!!address && chainId !== undefined && !isSupportedChain(chainId)) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '2rem 1.25rem', textAlign: 'center' }}>
        <p className="display" style={{ color: 'var(--blue)', marginBottom: '1rem' }}>{t.wrongNetwork}</p>
        <button className="btn-primary" onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}>
          {t.switchNetwork}
        </button>
      </div>
    )
  }

  const formKey = profile?.exists ? 'loaded' : 'empty'

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '2rem 1.25rem' }}>
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="poster" style={{ fontSize: '2rem', color: 'var(--blue)', margin: 0 }}>{t.artistProfile}</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', fontFamily: "'Inter', sans-serif", marginTop: '0.25rem' }}>{t.profileSubtitle}</p>
        </div>
        {profile?.exists && (
          <span
            className="sticker"
            data-status="released"
            style={{ marginLeft: 'auto', transform: 'rotate(-1deg)' }}
          >
            <CheckCircle size={11} /> {t.profileActive}
          </span>
        )}
      </div>

      <ProfileForm key={formKey} lang={lang} profile={profile} onSaved={() => { void refetch() }} />
    </div>
  )
}

interface FormProps {
  lang: Lang
  profile: ArtistProfileData | undefined
  onSaved: () => void
}

function ProfileForm({ lang, profile, onSaved }: FormProps) {
  const t = translations[lang]
  const chainId = useChainId()
  const contractAddr = isSupportedChain(chainId) ? getContractAddress(chainId) ?? undefined : undefined
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [instagram,   setInstagram]   = useState(profile?.instagramHandle ?? '')
  const [sealUrl,     setSealUrl]     = useState(profile?.sealUrl ?? '')
  const [signatureUrl, setSignatureUrl] = useState(profile?.signatureUrl ?? '')

  const { writeContract, data: txHash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  if (isSuccess) { toast.success(t.profileSaved); onSaved() }

  function save() {
    if (!contractAddr) return
    writeContract({
      address: contractAddr,
      abi: KATHONEJO_ABI,
      functionName: 'setArtistProfile',
      args: [displayName, instagram, sealUrl, signatureUrl],
    })
  }

  const isBusy = isPending || isConfirming
  const defaultCare = lang === 'es' ? DEFAULT_CARE_ES : DEFAULT_CARE_EN

  return (
    <div className="framed-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Display name */}
      <div>
        <label className="field-label">{t.displayName}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '2px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', background: '#fff' }}>
          <User size={15} color="var(--muted)" />
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={t.displayNamePlaceholder}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.875rem', fontFamily: "'Inter', sans-serif", color: 'var(--ink)' }}
          />
        </div>
      </div>

      {/* Instagram */}
      <div>
        <label className="field-label">{t.instagram}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '2px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', background: '#fff' }}>
          <Instagram size={15} color="var(--muted)" />
          <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>@</span>
          <input
            value={instagram}
            onChange={e => setInstagram(e.target.value)}
            placeholder={t.instagramPlaceholder}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.875rem', fontFamily: "'Inter', sans-serif", color: 'var(--ink)' }}
          />
        </div>
      </div>

      {/* Seal URL */}
      <div>
        <label className="field-label">{t.sealUrl}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '2px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', background: '#fff' }}>
          <Image size={15} color="var(--muted)" />
          <input
            value={sealUrl}
            onChange={e => setSealUrl(e.target.value)}
            placeholder="https://…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink)' }}
          />
        </div>
        {sealUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <img src={sealUrl} alt="seal preview" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--blue)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{t.sealPreview}</p>
          </div>
        )}
      </div>

      {/* Signature URL */}
      <div>
        <label className="field-label">{t.signatureUrl}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '2px solid var(--border)', borderRadius: 6, padding: '0.5rem 0.75rem', background: '#fff' }}>
          <PenTool size={15} color="var(--muted)" />
          <input
            value={signatureUrl}
            onChange={e => setSignatureUrl(e.target.value)}
            placeholder="https://…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--ink)' }}
          />
        </div>
        {signatureUrl && (
          <div style={{ marginTop: '0.5rem', padding: '0.75rem', border: '1.5px solid var(--border)', borderRadius: 4, background: '#FFFDF8' }}>
            <img src={signatureUrl} alt="signature preview" style={{ maxHeight: 56, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        )}
      </div>

      {/* Default care note */}
      <div
        style={{
          padding: '0.75rem',
          background: 'var(--blue-light)',
          border: '1.5px solid var(--blue)',
          borderRadius: 4,
          fontSize: '0.78rem',
          color: 'var(--blue)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <strong>{t.careDefault}:</strong> {defaultCare}
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={isBusy}
        className="btn-primary"
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
      >
        <Save size={15} />
        {isBusy ? t.saving : t.saveProfile}
      </button>
    </div>
  )
}
