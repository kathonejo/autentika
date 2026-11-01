import { useMemo } from 'react'
import { useReadContracts } from 'wagmi'
import { useDirectoryArtists, useDirectoryContractAddress } from '@/hooks/useDirectory'
import { DIRECTORY_ABI } from '@/directory'
import { KATHONEJO_ABI, getContractAddress } from '@/contract'
import { useReadChainId } from '@/hooks/useCommissions'
import { usdcAmount } from '@/contract'
import { translations } from '@/i18n'
import type { Lang } from '@/i18n'

interface Props {
  lang: Lang
  onOpenArtist: (addr: `0x${string}`) => void
  onBack: () => void
}

export function DirectoryView({ lang, onOpenArtist, onBack }: Props) {
  const t = translations[lang]
  const chainId = useReadChainId()
  const dirAddr = useDirectoryContractAddress()
  const autentika = getContractAddress(chainId) ?? undefined
  const { data: artistsRaw, isLoading } = useDirectoryArtists()
  const artists = (artistsRaw as `0x${string}`[] | undefined) ?? []

  const listingContracts = useMemo(() => artists.flatMap(a => ([
    {
      address: dirAddr as `0x${string}`,
      abi: DIRECTORY_ABI,
      functionName: 'getArtistListing' as const,
      args: [a] as const,
      chainId,
    },
    {
      address: autentika as `0x${string}`,
      abi: KATHONEJO_ABI,
      functionName: 'getArtistProfile' as const,
      args: [a] as const,
      chainId,
    },
  ])), [artists, dirAddr, autentika, chainId])

  const { data: rows } = useReadContracts({
    contracts: (dirAddr && autentika && artists.length ? listingContracts : []) as any,
    query: { enabled: !!dirAddr && !!autentika && artists.length > 0 },
  })

  const cards = useMemo(() => {
    return artists.map((addr, i) => {
      const listing = rows?.[i * 2]?.result as
        | { bio: string; basePriceUsdc: bigint; pitch: string; registered: boolean }
        | undefined
      const profile = rows?.[i * 2 + 1]?.result as
        | { displayName: string; instagramHandle: string; exists: boolean }
        | undefined
      return {
        addr,
        name: profile?.displayName || `${addr.slice(0, 6)}…${addr.slice(-4)}`,
        ig: profile?.instagramHandle || '',
        bio: listing?.bio || '',
        price: listing?.basePriceUsdc ?? 0n,
        pitch: listing?.pitch || '',
      }
    })
  }, [artists, rows])

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
      <button className="btn-outline" onClick={onBack} style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem', marginBottom: '1.25rem' }}>
        ← {t.back}
      </button>
      <h1 className="poster" style={{ fontSize: '1.85rem', color: 'var(--blue)', margin: 0 }}>{t.directoryTitle}</h1>
      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0.35rem 0 1.25rem' }}>{t.directorySubtitle}</p>

      {!dirAddr && (
        <div className="framed-card" style={{ padding: '1.25rem', marginBottom: '1rem', background: 'var(--blue-light)' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--blue)' }}>{t.directoryNotDeployed}</p>
        </div>
      )}

      {dirAddr && isLoading && <p style={{ color: 'var(--muted)' }}>{t.loading}</p>}

      {dirAddr && !isLoading && cards.length === 0 && (
        <div className="framed-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          {t.directoryEmpty}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {cards.map(card => (
          <button
            key={card.addr}
            type="button"
            className="framed-card"
            onClick={() => onOpenArtist(card.addr)}
            style={{ padding: '1.25rem', textAlign: 'left', cursor: 'pointer', background: 'var(--bg-alt)', border: 'none' }}
          >
            <div className="display" style={{ fontSize: '1.1rem', color: 'var(--blue)' }}>{card.name}</div>
            {card.ig && <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>@{card.ig}</div>}
            {card.bio && <p style={{ fontSize: '0.85rem', color: 'var(--ink-2)', margin: '0.75rem 0 0' }}>{card.bio}</p>}
            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)' }}>
              {t.fromPrice}: {usdcAmount(card.price, chainId).toString()} USDC
            </div>
            {card.pitch && <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.35rem 0 0' }}>{card.pitch}</p>}
          </button>
        ))}
      </div>
    </div>
  )
}
