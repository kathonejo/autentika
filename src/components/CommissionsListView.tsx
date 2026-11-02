import { useAccount, useReadContract } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import React, { useState, useCallback } from 'react'
import { formatAmount } from '@/onchain-money'
import {
  KATHONEJO_ABI, CommissionStatus, usdcAmount,
  isSupportedChain, getContractAddress,
} from '@/contract'
import type { CommissionData } from '@/contract'
import { castCommission, useReadChainId } from '@/hooks/useCommissions'
import { CommissionCard } from './CommissionCard'
import type { Lang } from '@/i18n'
import { translations } from '@/i18n'

interface Props {
  lang: Lang
  onSelect: (id: bigint) => void
  refreshKey: number
  onOpenSubscriptions?: () => void
}

export function CommissionsListView({ lang, onSelect, refreshKey, onOpenSubscriptions }: Props) {
  const { isConnected } = useAccount()
  if (!isConnected) return <LandingHero lang={lang} onOpenSubscriptions={onOpenSubscriptions} />
  return <DashboardView lang={lang} onSelect={onSelect} refreshKey={refreshKey} t={translations[lang]} onOpenSubscriptions={onOpenSubscriptions} />
}

// ── Landing hero ──────────────────────────────────────────────────────────────
function LandingHero({ lang, onOpenSubscriptions }: { lang: Lang; onOpenSubscriptions?: () => void }) {
  const steps = [
    {
      n: '01', color: 'var(--yellow)',
      title: lang === 'es' ? 'Crea el encargo' : 'Create the commission',
      body: lang === 'es'
        ? 'El artista define el título, monto en USDC y fecha límite.'
        : 'The artist sets the title, USDC amount and deadline.',
    },
    {
      n: '02', color: 'var(--sky)',
      title: lang === 'es' ? 'El coleccionista financia' : 'Collector funds it',
      body: lang === 'es'
        ? 'El coleccionista deposita USDC en custodia segura.'
        : 'The collector deposits USDC into secure escrow.',
    },
    {
      n: '03', color: 'var(--pink)',
      title: lang === 'es' ? 'Recibe tu pago + NFT' : 'Get paid + NFT certificate',
      body: lang === 'es'
        ? 'Se emite el certificado NFT y se libera el pago al confirmar entrega.'
        : 'An NFT certificate is minted and payment released on delivery confirmation.',
    },
  ]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: '#FFFFFF', borderBottom: '2.5px solid var(--blue)',
        padding: '4rem 1.5rem 3rem', textAlign: 'center',
      }}>
        <div className="halftone-corner" style={{ top: 0, left: 0 }} aria-hidden="true" />
        <div className="halftone-corner" style={{ top: 0, right: 0, transform: 'scaleX(-1)' }} aria-hidden="true" />
        <div className="halftone-corner" style={{ bottom: 0, left: 0, transform: 'scaleY(-1)' }} aria-hidden="true" />
        <div className="halftone-corner" style={{ bottom: 0, right: 0, transform: 'scale(-1)' }} aria-hidden="true" />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          <div className="poster" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', color: 'var(--blue)', marginBottom: '0.5rem' }}>
            Autentika
          </div>
          <p style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)', color: 'var(--ink-2)', fontFamily: "'Inter', sans-serif", lineHeight: 1.5, maxWidth: 520, margin: '0 auto 0.5rem' }}>
            {lang === 'es'
              ? 'Encargos y certificados de autenticidad para artistas, pagados en USDC'
              : 'Commissions and certificates of authenticity for artists, paid in USDC'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '1.25rem 0' }}>
            <div style={{ width: 64, height: 3, background: 'var(--pink)', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ConnectKitButton />
          </div>
        </div>
      </section>

      <div style={{ position: 'relative', height: 28, overflow: 'hidden' }} aria-hidden="true">
        <div className="halftone-strip" style={{ position: 'absolute', inset: 0 }} />
      </div>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h2 className="display" style={{ fontSize: '1.125rem', color: 'var(--blue)', textAlign: 'center', marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {lang === 'es' ? 'Cómo funciona' : 'How it works'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {steps.map(s => (
            <div key={s.n} className="framed-card" style={{ padding: '1.5rem 1.25rem' }}>
              <div className="poster" style={{ fontSize: '3rem', color: s.color, lineHeight: 1, marginBottom: '0.75rem', WebkitTextStroke: '2px var(--blue)' }}>
                {s.n}
              </div>
              <p className="display" style={{ fontSize: '1rem', color: 'var(--blue)', marginBottom: '0.5rem' }}>{s.title}</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.55, fontFamily: "'Inter', sans-serif" }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ textAlign: 'center', padding: '0 1.5rem 4rem' }}>
        <ConnectKitButton />
      </section>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
interface DashboardProps {
  lang: Lang
  t: typeof translations['en'] | typeof translations['es']
  onSelect: (id: bigint) => void
  refreshKey: number
  onOpenSubscriptions?: () => void
}

type TabId = 'artist' | 'collector'

function DashboardView({ lang, t, onSelect, refreshKey: _refreshKey, onOpenSubscriptions }: DashboardProps) {
  const { address, chainId } = useAccount()
  const readChainId = useReadChainId()
  const contractAddr = chainId !== undefined && isSupportedChain(chainId) ? getContractAddress(chainId) ?? undefined : undefined
  const [tab, setTab] = useState<TabId>('artist')

  const { data: artistIds } = useReadContract({
    address: contractAddr,
    abi: KATHONEJO_ABI,
    functionName: 'getArtistCommissions',
    args: address ? [address] : undefined,
    chainId: readChainId,
    query: { enabled: !!address && !!contractAddr },
  })
  const { data: collectorIds } = useReadContract({
    address: contractAddr,
    abi: KATHONEJO_ABI,
    functionName: 'getCollectorCommissions',
    args: address ? [address] : undefined,
    chainId: readChainId,
    query: { enabled: !!address && !!contractAddr },
  })

  const aIds: bigint[] = Array.isArray(artistIds) ? (artistIds as bigint[]) : []
  const cIds: bigint[] = Array.isArray(collectorIds) ? (collectorIds as bigint[]) : []

  // Deduplicate for stats
  const seen = new Set<string>()
  const allIds = [...aIds, ...cIds].filter(id => { const k = id.toString(); if (seen.has(k)) return false; seen.add(k); return true }).sort((a, b) => (a > b ? -1 : 1))

  const tabIds = (tab === 'artist' ? [...aIds] : [...cIds]).sort((a, b) => (a > b ? -1 : 1))

  const hasBothRoles = aIds.length > 0 && cIds.length > 0

  // Stats
  const [loaded, setLoaded] = useState<CommissionData[]>([])
  const handleLoaded = useCallback((c: CommissionData) => {
    setLoaded(prev => {
      if (prev.some(x => x.id === c.id)) return prev
      return [...prev, c]
    })
  }, [])

  const escrowTotal = loaded
    .filter(c => c.status === CommissionStatus.Funded || c.status === CommissionStatus.Delivered)
    .reduce((s, c) => s + c.amount, 0n)
  const releasedTotal = loaded
    .filter(c => c.status === CommissionStatus.Released)
    .reduce((s, c) => s + c.amount, 0n)
  const certCount = loaded.filter(c =>
    c.status === CommissionStatus.Released &&
    !!c.certificateId &&
    c.certificateId !== '0x0000000000000000000000000000000000000000000000000000000000000000'
  ).length

  const fmtU = (v: bigint) => formatAmount(readChainId, usdcAmount(v, readChainId))

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.25rem' }}>

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <h1 className="poster" style={{ fontSize: '2rem', color: 'var(--blue)', margin: 0 }}>
          {t.myCommissions}
        </h1>
        {hasBothRoles && (
          <span className="sticker" data-status="funded" style={{ transform: 'rotate(1.5deg)' }}>
            {t.bothRoles}
          </span>
        )}
        {onOpenSubscriptions && (
          <button className="btn-outline" onClick={onOpenSubscriptions} style={{ marginLeft: 'auto', fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
            {t.openSubscriptions}
          </button>
        )}
      </div>

      {/* Summary cards */}
      {loaded.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.875rem', marginBottom: '2rem' }}>
          <SummaryCard tint="var(--sky)" label={lang === 'es' ? 'En custodia' : 'In escrow'} value={`${fmtU(escrowTotal)} USDC`} />
          <SummaryCard tint="var(--green)" label={lang === 'es' ? 'Liberado' : 'Released'} value={`${fmtU(releasedTotal)} USDC`} />
          <SummaryCard tint="var(--pink)" label={lang === 'es' ? 'Certificados' : 'Certificates'} value={String(certCount)} />
        </div>
      )}

      {/* Hidden fetchers for stats */}
      {allIds.map(id => (
        <SummaryFetcher key={id.toString()} id={id} onLoaded={handleLoaded} contractAddr={contractAddr} chainId={readChainId} />
      ))}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--blue)', paddingBottom: '0.5rem' }}>
        {(['artist', 'collector'] as TabId[]).map(tabId => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '9999px 9999px 0 0',
              border: '2px solid var(--blue)',
              borderBottom: tab === tabId ? '2px solid var(--bg-alt)' : '2px solid var(--blue)',
              background: tab === tabId ? 'var(--blue)' : 'var(--bg-alt)',
              color: tab === tabId ? '#fff' : 'var(--blue)',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              position: 'relative',
              bottom: '-2px',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            {tabId === 'artist' ? t.asArtist : t.asCollector}
            {tabId === 'artist' && aIds.length > 0 && (
              <span style={{ background: tab === 'artist' ? 'var(--yellow)' : 'var(--blue-light)', color: 'var(--blue)', borderRadius: 9999, padding: '0 5px', fontSize: '0.65rem', fontWeight: 800 }}>
                {aIds.length}
              </span>
            )}
            {tabId === 'collector' && cIds.length > 0 && (
              <span style={{ background: tab === 'collector' ? 'var(--yellow)' : 'var(--blue-light)', color: 'var(--blue)', borderRadius: 9999, padding: '0 5px', fontSize: '0.65rem', fontWeight: 800 }}>
                {cIds.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Commission list */}
      {tabIds.length === 0 ? (
        <EmptyState lang={lang} tab={tab} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tabIds.map(id => (
            <CommissionCard key={id.toString()} lang={lang} commissionId={id} onClick={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ lang, tab }: { lang: Lang; tab: TabId }) {
  return (
    <div className="framed-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--yellow)', border: '2.5px solid var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="poster" style={{ fontSize: '1.4rem', color: 'var(--blue)' }}>✦</span>
        </div>
      </div>
      <p className="display" style={{ fontSize: '1.1rem', color: 'var(--blue)', marginBottom: '0.5rem' }}>
        {lang === 'es' ? 'Sin encargos aún' : 'No commissions yet'}
      </p>
      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>
        {tab === 'artist'
          ? (lang === 'es' ? 'Crea tu primer encargo para empezar.' : 'Create your first commission to get started.')
          : (lang === 'es' ? 'Pide a un artista que te agregue como coleccionista.' : 'Ask an artist to add your address as a collector.')}
      </p>
    </div>
  )
}

function SummaryCard({ tint, label, value }: { tint: string; label: string; value: string }) {
  return (
    <div style={{ background: tint, border: '2px solid var(--blue)', borderRadius: 4, padding: '1rem 1.125rem' }}>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--blue)', marginBottom: '0.25rem' }}>
        {label}
      </p>
      <p className="poster" style={{ fontSize: '1.2rem', color: 'var(--blue)', margin: 0 }}>{value}</p>
    </div>
  )
}

function SummaryFetcher({ id, onLoaded, contractAddr, chainId }: { id: bigint; onLoaded: (c: CommissionData) => void; contractAddr: `0x${string}` | undefined; chainId: number }) {
  const { data } = useReadContract({
    address: contractAddr,
    abi: KATHONEJO_ABI,
    functionName: 'getCommission',
    args: [id],
    chainId,
    query: { enabled: !!contractAddr },
  })
  const calledRef = React.useRef(false)
  React.useEffect(() => {
    if (data && !calledRef.current) {
      calledRef.current = true
      const c = castCommission(data)
      if (c) onLoaded(c)
    }
  }, [data, onLoaded])
  return null
}
