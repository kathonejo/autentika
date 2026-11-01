/**
 * AutentikaDirectory companion — address + ABI.
 * Address from VITE_AUTENTIKA_DIRECTORY_ADDRESS or localStorage after admin deploy.
 */
import { AUTENTIKA_DIRECTORY_ABI } from '@/deploy/autentikaDirectoryAbi'
import type { SupportedChainId } from '@/contract'

export const DIRECTORY_ABI = AUTENTIKA_DIRECTORY_ABI
export const MAX_REQUEST_CHARS = 289
export const DIRECTORY_LS_KEY = 'autentika.directory.address'

function readEnvDirectory(): `0x${string}` | null {
  const raw = (import.meta.env.VITE_AUTENTIKA_DIRECTORY_ADDRESS as string | undefined)?.trim() || ''
  if (/^0x[0-9a-fA-F]{40}$/.test(raw)) return raw as `0x${string}`
  return null
}

export function getStoredDirectoryAddress(): `0x${string}` | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DIRECTORY_LS_KEY) || ''
    if (/^0x[0-9a-fA-F]{40}$/.test(raw)) return raw as `0x${string}`
  } catch { /* ignore */ }
  return null
}

export function setStoredDirectoryAddress(addr: `0x${string}`) {
  try {
    window.localStorage.setItem(DIRECTORY_LS_KEY, addr)
  } catch { /* ignore */ }
}

/** Prefer env, then localStorage. Null ⇒ directory write features degrade gracefully. */
export function getDirectoryAddress(_chainId?: SupportedChainId): `0x${string}` | null {
  return readEnvDirectory() || getStoredDirectoryAddress()
}

export function isDirectoryConfigured(chainId?: SupportedChainId): boolean {
  return !!getDirectoryAddress(chainId)
}
