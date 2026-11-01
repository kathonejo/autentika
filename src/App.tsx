import { useState, useEffect } from 'react'
import type { Lang } from '@/i18n'
import { Header } from './components/Header'
import { CommissionsListView } from './components/CommissionsListView'
import { CreateCommissionView } from './components/CreateCommissionView'
import { CommissionDetailView } from './components/CommissionDetailView'
import { CertificateView } from './components/CertificateView'
import { ArtistProfileView } from './components/ArtistProfileView'
import { WithdrawBanner } from './components/WithdrawBanner'
import { AdminView } from './components/AdminView'
import { LegalizeHelpView } from './components/LegalizeHelpView'

export type View =
  | { name: 'commissions' }
  | { name: 'create' }
  | { name: 'profile' }
  | { name: 'admin' }
  | { name: 'legalize-help' }
  | { name: 'detail'; id: bigint }
  | { name: 'cert'; certId: string }

function parseInitialView(): View {
  const params = new URLSearchParams(window.location.search)
  const cert = params.get('cert')
  const commission = params.get('commission')
  if (cert) return { name: 'cert', certId: cert }
  if (commission) {
    try {
      const id = BigInt(commission)
      if (id > 0n) return { name: 'detail', id }
    } catch { /* ignore */ }
  }
  return { name: 'commissions' }
}

export default function App() {
  const [lang, setLang] = useState<Lang>('en')
  const [view, setView] = useState<View>(parseInitialView)
  const [refreshKey, setRefreshKey] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  // Sync URL with view
  useEffect(() => {
    const params = new URLSearchParams()
    if (view.name === 'detail') params.set('commission', view.id.toString())
    if (view.name === 'cert') params.set('cert', view.certId)
    const search = params.toString() ? `?${params.toString()}` : ''
    window.history.replaceState(null, '', `${window.location.pathname}${search}`)
  }, [view])

  // Close menu on any navigation
  function navigate(name: string) {
    setMenuOpen(false)
    if (name === 'create') setView({ name: 'create' })
    else if (name === 'profile') setView({ name: 'profile' })
    else if (name === 'admin') setView({ name: 'admin' })
    else setView({ name: 'commissions' })
  }

  const currentViewName =
    view.name === 'detail' || view.name === 'cert' || view.name === 'legalize-help'
      ? 'commissions'
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
        {view.name === 'commissions' && (
          <CommissionsListView
            lang={lang}
            onSelect={(id) => setView({ name: 'detail', id })}
            refreshKey={refreshKey}
          />
        )}

        {view.name === 'create' && (
          <CreateCommissionView
            lang={lang}
            onCreated={() => {
              setRefreshKey(k => k + 1)
              setView({ name: 'commissions' })
            }}
            onBack={() => setView({ name: 'commissions' })}
          />
        )}

        {view.name === 'profile' && (
          <ArtistProfileView
            lang={lang}
            onBack={() => setView({ name: 'commissions' })}
          />
        )}

        {view.name === 'admin' && (
          <AdminView
            lang={lang}
            onBack={() => setView({ name: 'commissions' })}
          />
        )}

        {view.name === 'legalize-help' && (
          <LegalizeHelpView
            lang={lang}
            onBack={() => setView({ name: 'commissions' })}
          />
        )}

        {view.name === 'detail' && (
          <CommissionDetailView
            lang={lang}
            commissionId={view.id}
            onBack={() => setView({ name: 'commissions' })}
            onViewCert={(certId) => setView({ name: 'cert', certId })}
          />
        )}

        {view.name === 'cert' && (
          <CertificateView
            lang={lang}
            certId={view.certId}
            onBack={() => setView({ name: 'commissions' })}
            onLegalizeHelp={() => setView({ name: 'legalize-help' })}
          />
        )}
      </main>
    </div>
  )
}
