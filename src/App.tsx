import { useState, useEffect, useCallback } from 'react'
import type { Lang } from '@/i18n'
import { translations } from '@/i18n'
import { Header } from './components/Header'
import { CommissionsListView } from './components/CommissionsListView'
import { CreateCommissionView } from './components/CreateCommissionView'
import { CommissionDetailView } from './components/CommissionDetailView'
import { CertificateView } from './components/CertificateView'
import { ArtistProfileView } from './components/ArtistProfileView'
import { WithdrawBanner } from './components/WithdrawBanner'
import { AdminView } from './components/AdminView'
import { LegalizeHelpView } from './components/LegalizeHelpView'
import { FeedView } from './components/FeedView'
import { DirectoryView } from './components/DirectoryView'
import { PublicArtistView } from './components/PublicArtistView'
import { WorkView } from './components/WorkView'
import { TokenizeHelpView } from './components/TokenizeHelpView'
import { HowItWorksView } from './components/HowItWorksView'
import { MascotFaq } from './components/MascotFaq'
import { SubscriptionsView } from './components/SubscriptionsView'
import { parseHashView, hashForView, type HashView } from '@/lib/hashRoute'

export type View = HashView

export default function App() {
  const [lang, setLang] = useState<Lang>('es')
  const [view, setView] = useState<View>(parseHashView)
  const [refreshKey, setRefreshKey] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const go = useCallback((next: View) => {
    setMenuOpen(false)
    setView(next)
    const hash = hashForView(next)
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${hash}`)
    }
  }, [])

  useEffect(() => {
    const hash = hashForView(view)
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${hash}`)
    }
  }, [view])

  useEffect(() => {
    function onHash() {
      setView(parseHashView())
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function navigate(name: string) {
    if (name === 'feed') go({ name: 'feed' })
    else if (name === 'directory') go({ name: 'directory' })
    else if (name === 'create') go({ name: 'create' })
    else if (name === 'profile') go({ name: 'profile' })
    else if (name === 'admin') go({ name: 'admin' })
    else if (name === 'tokenize-help') go({ name: 'tokenize-help' })
    else if (name === 'how-it-works') go({ name: 'how-it-works' })
    else if (name === 'subscriptions') go({ name: 'subscriptions' })
    else if (name === 'commissions') go({ name: 'commissions' })
    else go({ name: 'feed' })
  }

  const currentViewName =
    view.name === 'detail' || view.name === 'cert' || view.name === 'legalize-help'
      || view.name === 'work' || view.name === 'artist' || view.name === 'tokenize-help'
      || view.name === 'how-it-works' || view.name === 'subscriptions' || view.name === 'admin'
      ? (view.name === 'how-it-works' || view.name === 'tokenize-help' || view.name === 'admin'
          ? view.name
          : (view.name === 'work' || view.name === 'artist' ? 'feed'
            : view.name === 'subscriptions' ? 'commissions'
            : 'commissions'))
      : view.name

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      <Header
        lang={lang}
        onToggleLang={() => setLang(l => l === 'en' ? 'es' : 'en')}
        currentView={currentViewName}
        onNavigate={navigate}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen(o => !o)}
      />
      <WithdrawBanner lang={lang} />

      <main style={{ paddingBottom: '5rem' }}>
        {view.name === 'feed' && (
          <FeedView
            lang={lang}
            onOpenWork={(tokenId) => go({ name: 'work', tokenId })}
            onOpenDirectory={() => go({ name: 'directory' })}
            onOpenHowItWorks={() => go({ name: 'how-it-works' })}
          />
        )}

        {view.name === 'directory' && (
          <DirectoryView
            lang={lang}
            onOpenArtist={(address) => go({ name: 'artist', address })}
            onBack={() => go({ name: 'feed' })}
          />
        )}

        {view.name === 'artist' && (
          <PublicArtistView
            lang={lang}
            artist={view.address}
            onBack={() => go({ name: 'directory' })}
            onOpenWork={(tokenId) => go({ name: 'work', tokenId })}
            onOpenCommission={(id) => go({ name: 'detail', id })}
            onSubscribe={(addr) => go({ name: 'subscriptions', artist: addr })}
          />
        )}

        {view.name === 'work' && (
          <WorkView
            lang={lang}
            tokenId={view.tokenId}
            onBack={() => go({ name: 'feed' })}
            onOpenArtist={(addr) => go({ name: 'artist', address: addr })}
            onTokenizeHelp={() => go({ name: 'tokenize-help' })}
          />
        )}

        {view.name === 'tokenize-help' && (
          <TokenizeHelpView lang={lang} onBack={() => go({ name: 'feed' })} />
        )}

        {view.name === 'how-it-works' && (
          <HowItWorksView
            lang={lang}
            onBack={() => go({ name: 'feed' })}
            onOpenFeed={() => go({ name: 'feed' })}
            onOpenDirectory={() => go({ name: 'directory' })}
          />
        )}

        {view.name === 'subscriptions' && (
          <SubscriptionsView
            lang={lang}
            onBack={() => go({ name: 'feed' })}
            initialArtist={view.artist}
          />
        )}

        {view.name === 'commissions' && (
          <CommissionsListView
            lang={lang}
            refreshKey={refreshKey}
            onSelect={(id) => go({ name: 'detail', id })}
            onOpenSubscriptions={() => go({ name: 'subscriptions' })}
          />
        )}

        {view.name === 'create' && (
          <CreateCommissionView
            lang={lang}
            onCreated={() => {
              setRefreshKey(k => k + 1)
              go({ name: 'commissions' })
            }}
            onBack={() => go({ name: 'commissions' })}
          />
        )}

        {view.name === 'profile' && (
          <ArtistProfileView
            lang={lang}
            onBack={() => go({ name: 'feed' })}
          />
        )}

        {view.name === 'admin' && (
          <AdminView
            lang={lang}
            onBack={() => go({ name: 'feed' })}
          />
        )}

        {view.name === 'legalize-help' && (
          <LegalizeHelpView
            lang={lang}
            onBack={() => go({ name: 'commissions' })}
          />
        )}

        {view.name === 'detail' && (
          <CommissionDetailView
            lang={lang}
            commissionId={view.id}
            onBack={() => go({ name: 'commissions' })}
            onViewCert={(certId) => go({ name: 'cert', certId })}
          />
        )}

        {view.name === 'cert' && (
          <CertificateView
            lang={lang}
            certId={view.certId}
            onBack={() => go({ name: 'commissions' })}
            onLegalizeHelp={() => go({ name: 'legalize-help' })}
          />
        )}
      </main>

      <MascotFaq lang={lang} />

      <footer style={{
        maxWidth: '72rem', margin: '0 auto', padding: '1.5rem 1rem 2.5rem',
        borderTop: '1.5px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem',
        alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
      }}>
        <button type="button" onClick={() => go({ name: 'how-it-works' })} style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
          {translations[lang].navHowItWorks}
        </button>
        <button type="button" onClick={() => go({ name: 'tokenize-help' })} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
          {translations[lang].navTokenize}
        </button>
        <button type="button" onClick={() => go({ name: 'admin' })} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
          {translations[lang].admin}
        </button>
        <button type="button" onClick={() => go({ name: 'subscriptions' })} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
          {translations[lang].navSubscriptions}
        </button>
      </footer>
    </div>
  )
}
