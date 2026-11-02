import { translations } from '@/i18n'
import type { Lang } from '@/i18n'
import { BunnyLogo } from './BunnyLogo'

interface Props {
  lang: Lang
  onOpenComisiones: () => void
  onOpenMailClubs: () => void
  onOpenDirectory?: () => void
}

type ShowcaseItem = {
  img: string
  artist: string
  title: string
  kind: string
  price: string
  accent: string
}

/** Fictional vitrina only — not on-chain. Images from local finished art assets. */
const COMISIONES: ShowcaseItem[] = [
  {
    img: '/showcase/boca.webp',
    artist: 'Luna Verdún',
    title: 'Conejos de luz',
    kind: 'Ilustración digital',
    price: 'desde 45 USDC',
    accent: 'var(--pink)',
  },
  {
    img: '/showcase/conejitos.webp',
    artist: 'Río Salcedo',
    title: 'Piedra y espada',
    kind: 'Grabado / print',
    price: 'desde 60 USDC',
    accent: 'var(--sky)',
  },
  {
    img: '/showcase/genesis.webp',
    artist: 'Nona Calvete',
    title: 'Génesis en trama',
    kind: 'Obra comisionada',
    price: 'desde 80 USDC',
    accent: 'var(--yellow)',
  },
]

const MAIL_CLUBS: ShowcaseItem[] = [
  {
    img: '/showcase/dorados.webp',
    artist: 'Mora Quirós',
    title: 'Club de la luna dorada',
    kind: 'Mail club mensual',
    price: 'desde 12 USDC/mes',
    accent: 'var(--yellow)',
  },
  {
    img: '/showcase/monedas.webp',
    artist: 'Tilo Bramanti',
    title: 'Dos monedas',
    kind: 'Suscripción anual',
    price: 'desde 10 USDC/mes',
    accent: 'var(--pink)',
  },
  {
    img: '/showcase/mascota.webp',
    artist: 'Vera Luján',
    title: 'Cuaderno del conejo',
    kind: 'Mail club + stickers',
    price: 'desde 8 USDC/mes',
    accent: 'var(--sky)',
  },
]

function SampleTag({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.15rem 0.55rem',
        borderRadius: '9999px',
        border: '1.5px solid var(--border-strong)',
        background: 'var(--bg-alt)',
        color: 'var(--blue)',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: '0.65rem',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  return (
    <article
      className="card"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `0 0 0 3px ${item.accent}`,
        border: '1.5px solid var(--blue)',
        background: 'var(--bg-alt)',
      }}
    >
      <div
        style={{
          aspectRatio: '3 / 4',
          background: 'var(--blue-light)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <img
          src={item.img}
          alt=""
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
      <div style={{ padding: '0.85rem 0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div className="display" style={{ fontSize: '0.95rem', color: 'var(--blue)', lineHeight: 1.25 }}>
          {item.title}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--ink-2)', fontWeight: 600 }}>
          {item.artist}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{item.kind}</div>
        <div
          style={{
            marginTop: '0.35rem',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 800,
            fontSize: '0.8rem',
            color: 'var(--blue)',
          }}
        >
          {item.price}
        </div>
      </div>
    </article>
  )
}

function ShowcaseGrid({ items }: { items: ShowcaseItem[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '1rem',
      }}
    >
      {items.map((item) => (
        <ShowcaseCard key={`${item.artist}-${item.title}`} item={item} />
      ))}
    </div>
  )
}

export function LandingView({ lang, onOpenComisiones, onOpenMailClubs, onOpenDirectory }: Props) {
  const t = translations[lang]

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.75rem 1rem 2rem' }}>
      {/* Hero */}
      <section
        style={{
          textAlign: 'center',
          marginBottom: '2rem',
          padding: '1.25rem 1rem 1.5rem',
          borderRadius: '12px',
          border: '2.5px solid var(--blue)',
          background: 'linear-gradient(160deg, var(--yellow) 0%, var(--bg-alt) 42%, var(--sky) 100%)',
          boxShadow: '0 0 0 4px var(--pink)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.65rem' }}>
          <BunnyLogo size={56} />
        </div>
        <h1 className="poster" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', color: 'var(--blue)', margin: 0 }}>
          {t.landingTitle}
        </h1>
        <p
          style={{
            margin: '0.55rem auto 0',
            maxWidth: '36rem',
            fontSize: '0.95rem',
            lineHeight: 1.55,
            color: 'var(--ink-2)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {t.landingSubtitle}
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.85rem',
            justifyContent: 'center',
            marginTop: '1.35rem',
          }}
        >
          <button
            type="button"
            className="btn-primary"
            onClick={onOpenComisiones}
            style={{ minWidth: '11.5rem', fontSize: '1.05rem', padding: '0.9rem 1.85rem' }}
          >
            {t.landingCtaComisiones}
          </button>
          <button
            type="button"
            className="btn-outline"
            onClick={onOpenMailClubs}
            style={{
              minWidth: '11.5rem',
              fontSize: '1.05rem',
              padding: '0.9rem 1.85rem',
              background: 'var(--bg-alt)',
              outline: '3px solid var(--pink)',
              outlineOffset: '2px',
            }}
          >
            {t.landingCtaMailClubs}
          </button>
        </div>
      </section>

      {/* Comisiones showcase */}
      <section id="section-comisiones" style={{ marginBottom: '2.25rem', scrollMarginTop: '4.5rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.65rem',
            marginBottom: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h2 className="poster" style={{ fontSize: '1.35rem', color: 'var(--blue)', margin: 0 }}>
              {t.landingSectionComisiones}
            </h2>
            <SampleTag label={t.landingSampleTag} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={onOpenComisiones} style={{ fontSize: '0.8rem', padding: '0.45rem 1.1rem' }}>
              {t.landingEnterComisiones}
            </button>
            {onOpenDirectory && (
              <button type="button" className="btn-outline" onClick={onOpenDirectory} style={{ fontSize: '0.8rem', padding: '0.45rem 1.1rem' }}>
                {t.navDirectory}
              </button>
            )}
          </div>
        </div>
        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--muted)', maxWidth: '40rem' }}>
          {t.landingSectionComisionesBlurb}
        </p>
        <ShowcaseGrid items={COMISIONES} />
      </section>

      {/* Mail clubs showcase */}
      <section id="section-mailclubs" style={{ scrollMarginTop: '4.5rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.65rem',
            marginBottom: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <h2 className="poster" style={{ fontSize: '1.35rem', color: 'var(--blue)', margin: 0 }}>
              {t.landingSectionMailClubs}
            </h2>
            <SampleTag label={t.landingSampleTag} />
          </div>
          <button type="button" className="btn-primary" onClick={onOpenMailClubs} style={{ fontSize: '0.8rem', padding: '0.45rem 1.1rem' }}>
            {t.landingEnterMailClubs}
          </button>
        </div>
        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--muted)', maxWidth: '40rem' }}>
          {t.landingSectionMailClubsBlurb}
        </p>
        <ShowcaseGrid items={MAIL_CLUBS} />
      </section>
    </div>
  )
}
