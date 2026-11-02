import { useEffect, useId, useRef, useState } from 'react'
import type { Lang } from '@/i18n'
import { faqCopy } from '@/faq'
import { BunnyLogo } from './BunnyLogo'

type Tab = 'collector' | 'artist'

type Props = { lang: Lang }

/**
 * Floating bunny helper — sits above the Arc Studio watermark (fixed bottom-right).
 * Opens a framed FAQ with collector / artist tabs.
 */
export function MascotFaq({ lang }: Props) {
  const copy = faqCopy[lang]
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('collector')
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onPointer(e: MouseEvent | TouchEvent) {
      const t = e.target as Node
      if (panelRef.current && !panelRef.current.contains(t)) {
        // ignore clicks on the bunny button itself (handled by toggle)
        const bunny = document.getElementById('mascot-faq-btn')
        if (bunny && bunny.contains(t)) return
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('touchstart', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('touchstart', onPointer)
    }
  }, [open])

  useEffect(() => {
    setOpenIdx(0)
  }, [tab, lang])

  const items = tab === 'collector' ? copy.collector : copy.artist

  return (
    <div
      className="mascot-faq-root"
      style={{
        position: 'fixed',
        right: 16,
        // Arc Studio badge: bottom 16 + ~40px height + 8px gap
        bottom: 68,
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="mascot-faq-panel"
          style={{
            pointerEvents: 'auto',
            width: 'min(360px, calc(100vw - 28px))',
            maxHeight: 'min(62vh, 480px)',
            display: 'flex',
            flexDirection: 'column',
            background: '#FFFFFF',
            borderRadius: 6,
            // pop nested frames: pink > yellow > sky (matches .framed-card)
            boxShadow:
              '0 0 0 2px var(--frame-1), 0 0 0 5px var(--frame-2), 0 0 0 8px var(--frame-3), 0 12px 32px rgba(27, 49, 88, 0.18)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '12px 14px 10px',
              background: 'var(--blue)',
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <BunnyLogo size={28} />
              <h2
                id={titleId}
                className="display"
                style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.02em' }}
              >
                {copy.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={copy.close}
              style={{
                flexShrink: 0,
                width: 28,
                height: 28,
                borderRadius: 999,
                border: '2px solid rgba(255,255,255,0.55)',
                background: 'transparent',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div
            role="tablist"
            aria-label={copy.title}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0,
              borderBottom: '2px solid var(--pink)',
              background: 'var(--bg)',
            }}
          >
            {([
              ['collector', copy.collectorTab],
              ['artist', copy.artistTab],
            ] as const).map(([id, label]) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className="display"
                  style={{
                    padding: '10px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '-0.01em',
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? 'var(--pink)' : 'transparent',
                    color: active ? 'var(--ink)' : 'var(--blue)',
                    borderBottom: active ? '3px solid var(--blue)' : '3px solid transparent',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div
            role="tabpanel"
            style={{
              overflowY: 'auto',
              padding: '8px 10px 12px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {items.map((item, i) => {
              const isOpen = openIdx === i
              return (
                <div
                  key={`${tab}-${i}`}
                  style={{
                    borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                    padding: '6px 2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '8px 4px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: 'var(--ink)',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        flexShrink: 0,
                        width: 18,
                        height: 18,
                        marginTop: 1,
                        borderRadius: 4,
                        background: isOpen ? 'var(--blue)' : 'var(--pink)',
                        color: isOpen ? '#fff' : 'var(--ink)',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                    <span
                      className="display"
                      style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.35 }}
                    >
                      {item.q}
                    </span>
                  </button>
                  {isOpen && (
                    <p
                      style={{
                        margin: '0 4px 10px 30px',
                        fontSize: '0.78rem',
                        lineHeight: 1.45,
                        color: 'var(--ink-2)',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {item.a}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <button
        id="mascot-faq-btn"
        type="button"
        aria-label={copy.openLabel}
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        onClick={() => setOpen(o => !o)}
        style={{
          pointerEvents: 'auto',
          width: 64,
          height: 64,
          padding: 4,
          borderRadius: 999,
          border: '2.5px solid var(--blue)',
          background: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(52, 93, 180, 0.22), 0 0 0 3px var(--pink)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BunnyLogo size={52} />
      </button>
    </div>
  )
}
