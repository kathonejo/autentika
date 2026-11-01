import { useMemo } from 'react'
import { useFeedCertificates } from '@/hooks/useDirectory'
import { translations } from '@/i18n'
import type { Lang } from '@/i18n'

interface Props {
  lang: Lang
  onOpenWork: (tokenId: bigint) => void
  onOpenDirectory: () => void
}

type CertLike = {
  artworkTitle?: string
  artistName?: string
  photoUrl?: string
  technique?: string
  dimensions?: string
  commissionId?: bigint
}

export function FeedView({ lang, onOpenWork, onOpenDirectory }: Props) {
  const t = translations[lang]
  const { data, isLoading } = useFeedCertificates(32)

  const items = useMemo(() => {
    if (!data) return []
    const out: { tokenId: bigint; title: string; artist: string; photo: string; technique: string }[] = []
    data.forEach((result, i) => {
      if (result.status !== 'success' || !result.result) return
      const c = result.result as CertLike
      if (!c.photoUrl && !c.artworkTitle) return
      out.push({
        tokenId: BigInt(i + 1),
        title: c.artworkTitle || `Obra #${i + 1}`,
        artist: c.artistName || '—',
        photo: c.photoUrl || '',
        technique: c.technique || '',
      })
    })
    return out.reverse()
  }, [data])

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div style={{ position: 'relative' }}>
          <div className="halftone-corner" style={{ top: -8, right: -24, width: 70, height: 70 }} />
          <h1 className="poster" style={{ fontSize: '1.85rem', color: 'var(--blue)', margin: 0 }}>{t.feedTitle}</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0.35rem 0 0', fontFamily: "'Inter', sans-serif" }}>
            {t.feedSubtitle}
          </p>
        </div>
        <button className="btn-outline" onClick={onOpenDirectory} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
          {t.navDirectory}
        </button>
      </div>

      {isLoading && (
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '3rem 1rem' }}>{t.loading}</p>
      )}

      {!isLoading && items.length === 0 && (
        <div className="framed-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--ink-2)' }}>{t.feedEmpty}</p>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>{t.feedEmptyHint}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="masonry-feed">
          {items.map(item => (
            <button
              key={item.tokenId.toString()}
              type="button"
              onClick={() => onOpenWork(item.tokenId)}
              className="masonry-card"
            >
              {item.photo ? (
                <img src={item.photo} alt={item.title} loading="lazy" />
              ) : (
                <div className="masonry-placeholder">{item.title.slice(0, 1)}</div>
              )}
              <div className="masonry-meta">
                <div className="display" style={{ fontSize: '0.95rem', color: 'var(--blue)' }}>{item.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{item.artist}{item.technique ? ` · ${item.technique}` : ''}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
