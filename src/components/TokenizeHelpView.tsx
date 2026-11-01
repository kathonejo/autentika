import { translations } from '@/i18n'
import type { Lang } from '@/i18n'

interface Props {
  lang: Lang
  onBack: () => void
}

export function TokenizeHelpView({ lang, onBack }: Props) {
  const t = translations[lang]
  const paragraphs = t.tokenizeHelpBody.split('\n\n')

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <button className="btn-outline" onClick={onBack}
        style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', marginBottom: '1.5rem' }}>
        ← {t.back}
      </button>

      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <div className="halftone-corner" style={{ top: 0, right: 0, width: 80, height: 80 }} />
        <h1 className="display" style={{ color: 'var(--blue)', fontSize: '1.5rem', margin: 0, maxWidth: '90%' }}>
          {t.tokenizeHelpTitle}
        </h1>
        <hr className="rule-pink" style={{ marginTop: '0.75rem' }} />
      </div>

      <div className="framed-card" style={{ padding: '1.5rem 1.75rem' }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            color: i === 0 ? 'var(--ink)' : 'var(--ink-2)',
            marginTop: i === 0 ? 0 : '1rem',
            marginBottom: 0,
          }}>
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}
