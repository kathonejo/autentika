import { translations } from '@/i18n'
import type { Lang } from '@/i18n'

interface LegalizeHelpViewProps {
  lang: Lang
  onBack: () => void
}

export function LegalizeHelpView({ lang, onBack }: LegalizeHelpViewProps) {
  const t = translations[lang]
  const paragraphs = t.legalizationHelpBody.split('\n\n')

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <button className="btn-outline" onClick={onBack}
        style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', marginBottom: '1.5rem' }}>
        ← {t.backToApp}
      </button>

      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <div className="halftone-corner" style={{ top: 0, right: 0, width: 80, height: 80 }} />
        <h1 className="display" style={{ color: 'var(--blue)', fontSize: '1.5rem', margin: 0, maxWidth: '90%' }}>
          {t.legalizationHelpTitle}
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

        <div style={{
          marginTop: '1.5rem',
          padding: '0.875rem 1rem',
          background: 'var(--blue-light)',
          borderLeft: '3px solid var(--blue)',
          borderRadius: '4px',
          fontSize: '0.8rem',
          color: 'var(--blue)',
          lineHeight: 1.6,
        }}>
          <strong>How to compute a SHA-256 hash:</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
            <li>macOS / Linux: <code>shasum -a 256 document.pdf</code></li>
            <li>Windows: <code>Get-FileHash document.pdf -Algorithm SHA256</code> (PowerShell)</li>
            <li>Online: use a trusted tool like <em>emn178.github.io/online-tools/sha256_checksum.html</em> (upload locally, nothing is sent to a server)</li>
          </ul>
          <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            Prefix the hex string with <code>0x</code> before pasting it into the form.
          </p>
        </div>
      </div>
    </div>
  )
}
