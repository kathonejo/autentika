import { translations } from '@/i18n'
import type { Lang } from '@/i18n'
import { explorerAddr, ARC_MAINNET_CHAIN_ID } from '@/contract'

interface Props {
  lang: Lang
  onBack: () => void
  onOpenFeed?: () => void
  onOpenDirectory?: () => void
}

const FEATURE_KEYS = [
  ['howFeatureFeedTitle', 'howFeatureFeedBody'],
  ['howFeatureDirectoryTitle', 'howFeatureDirectoryBody'],
  ['howFeatureProfileTitle', 'howFeatureProfileBody'],
  ['howFeatureWorkTitle', 'howFeatureWorkBody'],
  ['howFeatureEscrowTitle', 'howFeatureEscrowBody'],
  ['howFeatureCertTitle', 'howFeatureCertBody'],
  ['howFeatureRoyaltyTitle', 'howFeatureRoyaltyBody'],
  ['howFeatureLegalTitle', 'howFeatureLegalBody'],
  ['howFeatureTokenizeTitle', 'howFeatureTokenizeBody'],
  ['howFeaturePhysicalTitle', 'howFeaturePhysicalBody'],
  ['howFeatureSubsTitle', 'howFeatureSubsBody'],
] as const

export function HowItWorksView({ lang, onBack, onOpenFeed, onOpenDirectory }: Props) {
  const t = translations[lang] as Record<string, string>

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <button
        className="btn-outline"
        onClick={onBack}
        style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', marginBottom: '1.5rem' }}
      >
        ← {t.backToApp}
      </button>

      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <div className="halftone-corner" style={{ top: 0, right: 0, width: 80, height: 80 }} />
        <h1 className="display" style={{ color: 'var(--blue)', fontSize: '1.5rem', margin: 0, maxWidth: '90%' }}>
          {t.howItWorksTitle}
        </h1>
        <hr className="rule-pink" style={{ marginTop: '0.75rem' }} />
      </div>

      <div className="framed-card" style={{ padding: '1.5rem 1.75rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--ink)', margin: 0 }}>
          {t.howItWorksIntro}
        </p>
      </div>

      <div
        className="framed-card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          borderColor: 'var(--green)',
          background: 'color-mix(in srgb, var(--green) 8%, white)',
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
            margin: '0 0 0.5rem',
          }}
        >
          {t.howBlockchainTitle}
        </p>
        <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--ink)', margin: 0 }}>
          {t.howBlockchainBody}
        </p>
        <a
          href={explorerAddr('0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4', ARC_MAINNET_CHAIN_ID)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-block', marginTop: '0.85rem', fontSize: '0.8rem', color: 'var(--blue)' }}
        >
          {t.verifiedOpenExplorer} →
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {FEATURE_KEYS.map(([titleKey, bodyKey]) => (
          <div key={titleKey} className="framed-card" style={{ padding: '1.1rem 1.35rem' }}>
            <h2
              className="display"
              style={{ fontSize: '1.05rem', color: 'var(--blue)', margin: '0 0 0.4rem' }}
            >
              {t[titleKey]}
            </h2>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--ink-2)', margin: 0 }}>
              {t[bodyKey]}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.75rem' }}>
        {onOpenFeed && (
          <button className="btn-primary" onClick={onOpenFeed} style={{ fontSize: '0.85rem' }}>
            {t.navFeed}
          </button>
        )}
        {onOpenDirectory && (
          <button className="btn-outline" onClick={onOpenDirectory} style={{ fontSize: '0.85rem' }}>
            {t.navDirectory}
          </button>
        )}
      </div>
    </div>
  )
}
