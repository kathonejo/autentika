/** Hash-based routes so share links work on Vercel static hosting. */

export type HashView =
  | { name: 'feed' }
  | { name: 'directory' }
  | { name: 'commissions' }
  | { name: 'create' }
  | { name: 'profile' }
  | { name: 'admin' }
  | { name: 'legalize-help' }
  | { name: 'tokenize-help' }
  | { name: 'how-it-works' }
  | { name: 'detail'; id: bigint }
  | { name: 'cert'; certId: string }
  | { name: 'artist'; address: `0x${string}` }
  | { name: 'work'; tokenId: bigint }

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/

export function parseHashView(): HashView {
  // Prefer hash routes; fall back to legacy ?commission= / ?cert=
  const hash = window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '')
  if (hash) {
    const parts = hash.split('/')
    const head = parts[0]?.toLowerCase()
    if (head === 'feed' || head === '') return { name: 'feed' }
    if (head === 'directorio' || head === 'directory') return { name: 'directory' }
    if (head === 'encargos' || head === 'commissions') return { name: 'commissions' }
    if (head === 'crear' || head === 'create') return { name: 'create' }
    if (head === 'perfil' || head === 'profile') return { name: 'profile' }
    if (head === 'admin') return { name: 'admin' }
    if (head === 'legalizar' || head === 'legalize-help') return { name: 'legalize-help' }
    if (head === 'tokenizar' || head === 'tokenize-help') return { name: 'tokenize-help' }
    if (head === 'como-funciona' || head === 'how-it-works' || head === 'por-que-blockchain' || head === 'why-blockchain')
      return { name: 'how-it-works' }
    if ((head === 'artista' || head === 'artist') && parts[1] && ADDR_RE.test(parts[1])) {
      return { name: 'artist', address: parts[1] as `0x${string}` }
    }
    if ((head === 'obra' || head === 'work') && parts[1] && /^\d+$/.test(parts[1])) {
      return { name: 'work', tokenId: BigInt(parts[1]) }
    }
    if ((head === 'encargo' || head === 'commission') && parts[1] && /^\d+$/.test(parts[1])) {
      return { name: 'detail', id: BigInt(parts[1]) }
    }
    if ((head === 'cert' || head === 'certificado') && parts[1]) {
      return { name: 'cert', certId: parts[1] }
    }
  }

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
  return { name: 'feed' }
}

export function hashForView(view: HashView): string {
  switch (view.name) {
    case 'feed': return '#/feed'
    case 'directory': return '#/directorio'
    case 'commissions': return '#/encargos'
    case 'create': return '#/crear'
    case 'profile': return '#/perfil'
    case 'admin': return '#/admin'
    case 'legalize-help': return '#/legalizar'
    case 'tokenize-help': return '#/tokenizar'
    case 'how-it-works': return '#/como-funciona'
    case 'detail': return `#/encargo/${view.id.toString()}`
    case 'cert': return `#/cert/${view.certId}`
    case 'artist': return `#/artista/${view.address}`
    case 'work': return `#/obra/${view.tokenId.toString()}`
  }
}

export function artistSharePath(address: string): string {
  return `#/artista/${address}`
}
