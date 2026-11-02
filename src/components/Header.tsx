import { ConnectKitButton } from 'connectkit'
import { useAccount, useSwitchChain } from 'wagmi'
import { translations } from '@/i18n'
import type { Lang } from '@/i18n'
import { BunnyLogo } from './BunnyLogo'
import { ARC_TESTNET_CHAIN_ID, ARC_MAINNET_CHAIN_ID, isSupportedChain } from '@/contract'

interface HeaderProps {
  lang: Lang
  onToggleLang: () => void
  currentView: string
  onNavigate: (name: string) => void
  menuOpen: boolean
  onToggleMenu: () => void
}

const PRIMARY_NAV = ['feed', 'directory', 'commissions', 'create', 'profile'] as const
const MORE_NAV = ['subscriptions', 'how-it-works', 'tokenize-help', 'admin'] as const
const NAV_ITEMS = [...PRIMARY_NAV, ...MORE_NAV] as const
type NavItem = typeof NAV_ITEMS[number]

function navLabel(item: NavItem, t: typeof translations[Lang]) {
  if (item === 'feed') return t.navFeed
  if (item === 'directory') return t.navDirectory
  if (item === 'commissions') return t.myCommissions
  if (item === 'create') return t.newCommission
  if (item === 'profile') return t.artistProfile
  if (item === 'subscriptions') return t.navSubscriptions
  if (item === 'how-it-works') return t.navHowItWorks
  if (item === 'tokenize-help') return t.navTokenize
  return t.admin
}

export function Header({ lang, onToggleLang, currentView, onNavigate, menuOpen, onToggleMenu }: HeaderProps) {
  const t = translations[lang]
  const { chainId } = useAccount()
  const { switchChain } = useSwitchChain()

  const isWrongNetwork = chainId !== undefined && !isSupportedChain(chainId)
  const isTestnet = chainId === ARC_TESTNET_CHAIN_ID
  const isMainnet = chainId === ARC_MAINNET_CHAIN_ID

  return (
    <>
      <div className="halftone-strip" style={{ height: '5px', width: '100%' }} />

      <header style={{
        background: 'var(--bg-alt)',
        borderBottom: '2px solid var(--blue)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '72rem',
          margin: '0 auto',
          padding: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
        }}>
          <button
            onClick={() => onNavigate('landing')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
            aria-label="Autentika home"
          >
            <BunnyLogo size={28} />
            <span className="poster" style={{ fontSize: '1.15rem', color: 'var(--blue)', letterSpacing: '-0.02em' }}>
              Autentika
            </span>
          </button>

          <nav style={{ display: 'flex', gap: '0.2rem', alignItems: 'center', overflowX: 'auto' }}
               className="hidden-mobile">
            {PRIMARY_NAV.map(item => (
              <button
                key={item}
                onClick={() => onNavigate(item)}
                style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: '9999px',
                  border: currentView === item ? '2px solid var(--blue)' : '2px solid transparent',
                  background: currentView === item ? 'var(--blue-light)' : 'transparent',
                  color: currentView === item ? 'var(--blue)' : 'var(--ink)',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {navLabel(item, t)}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {chainId !== undefined && (
              <span style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '9999px',
                fontSize: '0.65rem',
                fontWeight: 700,
                fontFamily: "'Space Grotesk', sans-serif",
                background: isWrongNetwork ? 'var(--danger-light)' : isMainnet ? 'var(--yellow)' : 'var(--sky)',
                color: isWrongNetwork ? 'var(--danger)' : 'var(--ink-2)',
                border: '1.5px solid currentColor',
                whiteSpace: 'nowrap',
              }}>
                {isWrongNetwork ? '⚠ Wrong' : isMainnet ? 'Mainnet' : 'Testnet'}
              </span>
            )}

            <button
              onClick={onToggleLang}
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                border: '2px solid var(--blue)',
                background: 'var(--yellow)',
                color: 'var(--blue)',
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 800,
                fontSize: '0.7rem',
                cursor: 'pointer',
              }}
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>

            <div className="hidden-mobile">
              <ConnectKitButton />
            </div>

            {isWrongNetwork && (
              <button
                className="btn-outline hidden-mobile"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.8rem' }}
                onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
              >
                {t.switchNetwork}
              </button>
            )}

            {!isWrongNetwork && chainId !== undefined && (
              <button
                title={isTestnet ? 'Switch to Arc Mainnet' : 'Switch to Arc Testnet'}
                className="hidden-mobile"
                onClick={() => switchChain({ chainId: isTestnet ? ARC_MAINNET_CHAIN_ID : ARC_TESTNET_CHAIN_ID })}
                style={{
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  background: 'transparent',
                  border: '1.5px solid var(--border)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {isTestnet ? '→ Mainnet' : '→ Testnet'}
              </button>
            )}

            <button
              className="show-mobile"
              onClick={onToggleMenu}
              aria-label={menuOpen ? t.closeMenu : t.menu}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px',
              }}
            >
              <span style={{ display: 'block', width: '22px', height: '2.5px', background: 'var(--blue)', borderRadius: '2px', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(45deg) translate(4.5px, 4.5px)' : 'none' }} />
              <span style={{ display: 'block', width: '22px', height: '2.5px', background: 'var(--blue)', borderRadius: '2px', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.2s' }} />
              <span style={{ display: 'block', width: '22px', height: '2.5px', background: 'var(--blue)', borderRadius: '2px', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(4.5px, -4.5px)' : 'none' }} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(0,0,0,0.35)',
          }}
          onClick={onToggleMenu}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '80vw',
          maxWidth: '320px',
          background: 'var(--bg-alt)',
          borderLeft: '3px solid var(--blue)',
          zIndex: 60,
          transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem 1.25rem',
          gap: '0.25rem',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span className="poster" style={{ color: 'var(--blue)', fontSize: '1.1rem' }}>Autentika</span>
          <button onClick={onToggleMenu} aria-label={t.closeMenu}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--blue)' }}>✕</button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <ConnectKitButton />
        </div>

        {!isWrongNetwork && chainId !== undefined && (
          <button
            onClick={() => { switchChain({ chainId: isTestnet ? ARC_MAINNET_CHAIN_ID : ARC_TESTNET_CHAIN_ID }); onToggleMenu() }}
            style={{
              width: '100%', padding: '0.6rem', borderRadius: '8px',
              border: '1.5px solid var(--border)', background: 'transparent',
              textAlign: 'left', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '0.5rem',
              fontFamily: "'Space Grotesk', sans-serif", color: 'var(--muted)',
            }}
          >
            {isTestnet ? '→ Switch to Mainnet' : '→ Switch to Testnet'}
          </button>
        )}
        {isWrongNetwork && (
          <button className="btn-outline" style={{ width: '100%', marginBottom: '0.5rem' }}
            onClick={() => { switchChain({ chainId: ARC_TESTNET_CHAIN_ID }); onToggleMenu() }}>
            {t.switchNetwork}
          </button>
        )}

        <hr style={{ border: 'none', borderTop: '1.5px solid var(--border)', margin: '0.5rem 0' }} />

        {PRIMARY_NAV.map(item => (
          <button
            key={item}
            onClick={() => onNavigate(item)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: currentView === item ? '2px solid var(--blue)' : '2px solid transparent',
              background: currentView === item ? 'var(--blue-light)' : 'transparent',
              color: currentView === item ? 'var(--blue)' : 'var(--ink)',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            {navLabel(item, t)}
          </button>
        ))}
        <hr style={{ border: 'none', borderTop: '1.5px solid var(--border)', margin: '0.75rem 0' }} />
        <p style={{ fontSize: '0.65rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', margin: '0 0 0.35rem' }}>{t.moreLinks}</p>
        {MORE_NAV.map(item => (
          <button
            key={item}
            onClick={() => onNavigate(item)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: currentView === item ? '2px solid var(--blue)' : '2px solid transparent',
              background: currentView === item ? 'var(--blue-light)' : 'transparent',
              color: currentView === item ? 'var(--blue)' : 'var(--muted)',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {navLabel(item, t)}
          </button>
        ))}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .hidden-mobile { display: flex !important; }
          .show-mobile { display: none !important; }
        }
        @media (max-width: 639px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </>
  )
}
