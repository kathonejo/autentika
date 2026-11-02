import type { Lang } from '@/i18n'
import { translations } from '@/i18n'

export type ArtistSubRow = {
  subscriber: `0x${string}`
  monthlyFeeUsdc: number
  plan: 'annual' | 'monthly'
  monthsRemaining: number
  nextClaimAt: number
  lockedUsdc: number
  freeUsdc: number
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function fmtUsd(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function fmtDate(ts: number, lang: Lang): string {
  try {
    return new Date(ts * 1000).toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function Donut({ asegurado, potencial, muted }: { asegurado: number; potencial: number; muted?: boolean }) {
  const total = asegurado + potencial
  const r = 54
  const c = 2 * Math.PI * r
  const aFrac = total > 0 ? asegurado / total : 0
  const aLen = aFrac * c
  const pLen = total > 0 ? c - aLen : 0
  const strokeA = muted ? 'var(--border)' : 'var(--blue)'
  const strokeP = muted ? 'var(--border)' : 'var(--pink-dark)'
  return (
    <svg width="160" height="160" viewBox="0 0 140 140" aria-hidden>
      <g transform="translate(70,70) rotate(-90)">
        <circle r={r} fill="none" stroke="var(--border)" strokeWidth="18" />
        {total > 0 && (
          <>
            <circle
              r={r}
              fill="none"
              stroke={strokeA}
              strokeWidth="18"
              strokeDasharray={`${aLen} ${c - aLen}`}
              strokeLinecap="butt"
            />
            <circle
              r={r}
              fill="none"
              stroke={strokeP}
              strokeWidth="18"
              strokeDasharray={`${pLen} ${c - pLen}`}
              strokeDashoffset={-aLen}
              strokeLinecap="butt"
            />
          </>
        )}
      </g>
    </svg>
  )
}

interface Props {
  lang: Lang
  rows: ArtistSubRow[]
  /** When true: grey donut, zeros, no fake rows — feature not live yet */
  comingSoon?: boolean
}

export function ArtistSubsDashboard({ lang, rows, comingSoon = false }: Props) {
  const t = translations[lang]
  const liveRows = comingSoon ? [] : rows
  const asegurado = liveRows.reduce((s, r) => s + r.lockedUsdc, 0)
  const potencial = liveRows.reduce((s, r) => s + r.freeUsdc, 0)
  const total = asegurado + potencial

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
        <h3 className="display" style={{ fontSize: '1rem', color: 'var(--blue)', margin: 0 }}>
          {t.subDashTitle}
        </h3>
        {comingSoon && (
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              background: 'var(--yellow)',
              border: '1.5px solid var(--ink)',
              letterSpacing: '0.02em',
            }}
          >
            {t.comingSoon}
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0 0 1rem', lineHeight: 1.45 }}>
        {t.subDashIntro}
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem',
          alignItems: 'center',
          marginBottom: '1.25rem',
          opacity: comingSoon ? 0.72 : 1,
        }}
      >
        <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
          <Donut asegurado={asegurado} potencial={potencial} muted={comingSoon} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            {comingSoon ? (
              <div className="display" style={{ fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center', padding: '0 0.5rem' }}>
                {t.comingSoon}
              </div>
            ) : (
              <>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t.subDashTotal}
                </div>
                <div className="display" style={{ fontSize: '1.15rem', color: 'var(--ink)', lineHeight: 1.1 }}>
                  {fmtUsd(total)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>USDC</div>
              </>
            )}
          </div>
        </div>

        <div style={{ flex: '1 1 160px', minWidth: 140 }}>
          <LegendRow
            color={comingSoon ? 'var(--border)' : 'var(--blue)'}
            label={t.subDashAsegurado}
            amount={asegurado}
            hint={t.subDashAseguradoHint}
          />
          <LegendRow
            color={comingSoon ? 'var(--border)' : 'var(--pink-dark)'}
            label={t.subDashPotencial}
            amount={potencial}
            hint={t.subDashPotencialHint}
          />
        </div>
      </div>

      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--ink)' }}>
        {t.subDashListTitle}
      </h4>
      {liveRows.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>
          {comingSoon ? t.comingSoon : t.subDashEmpty}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.4rem 0.35rem', fontWeight: 600 }}>{t.subDashColSubscriber}</th>
                <th style={{ padding: '0.4rem 0.35rem', fontWeight: 600 }}>{t.subDashColFee}</th>
                <th style={{ padding: '0.4rem 0.35rem', fontWeight: 600 }}>{t.subDashColPlan}</th>
                <th style={{ padding: '0.4rem 0.35rem', fontWeight: 600 }}>{t.subDashColMonths}</th>
                <th style={{ padding: '0.4rem 0.35rem', fontWeight: 600 }}>{t.subDashColNext}</th>
              </tr>
            </thead>
            <tbody>
              {liveRows.map(r => (
                <tr key={r.subscriber} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.55rem 0.35rem', fontFamily: 'ui-monospace, monospace' }}>
                    {shortAddr(r.subscriber)}
                  </td>
                  <td style={{ padding: '0.55rem 0.35rem' }}>{fmtUsd(r.monthlyFeeUsdc)} USDC</td>
                  <td style={{ padding: '0.55rem 0.35rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.15rem 0.45rem',
                        background: r.plan === 'annual' ? 'var(--blue-light)' : 'var(--pink)',
                        color: 'var(--ink)',
                        fontWeight: 600,
                        fontSize: '0.72rem',
                      }}
                    >
                      {r.plan === 'annual' ? t.subDashPlanAnnual : t.subDashPlanMonthly}
                    </span>
                  </td>
                  <td style={{ padding: '0.55rem 0.35rem' }}>{r.monthsRemaining}</td>
                  <td style={{ padding: '0.55rem 0.35rem' }}>{fmtDate(r.nextClaimAt, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LegendRow({
  color, label, amount, hint,
}: { color: string; label: string; amount: number; hint: string }) {
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
        <span style={{ width: 12, height: 12, background: color, border: '1px solid var(--ink)', flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{label}</span>
        <span className="display" style={{ marginLeft: 'auto', fontSize: '1rem', color: 'var(--ink)' }}>
          {fmtUsd(amount)} <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--muted)' }}>USDC</span>
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4, paddingLeft: '1.25rem' }}>
        {hint}
      </p>
    </div>
  )
}
