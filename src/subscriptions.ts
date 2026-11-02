/**
 * AutentikaSubscriptions companion — address + ABI.
 * Address from VITE_AUTENTIKA_SUBSCRIPTIONS_ADDRESS or localStorage after admin deploy.
 */
import { AUTENTIKA_SUBSCRIPTIONS_ABI } from '@/deploy/autentikaSubscriptionsAbi'
import type { SupportedChainId } from '@/contract'

export const SUBSCRIPTIONS_ABI = AUTENTIKA_SUBSCRIPTIONS_ABI
export const SUBSCRIPTIONS_LS_KEY = 'autentika.subscriptions.address'
/** Matches live AutentikaV2 feeRecipient on Arc Mainnet. */
export const DEFAULT_FEE_RECIPIENT = '0x21e5fc1Efc822f25E1dff11f81214c9C65032D79' as const
export const ANNUAL_MONTHS = 12n
export const ANNUAL_DISCOUNT_BPS = 1000n

function readEnvSubscriptions(): `0x${string}` | null {
  const raw = (import.meta.env.VITE_AUTENTIKA_SUBSCRIPTIONS_ADDRESS as string | undefined)?.trim() || ''
  if (/^0x[0-9a-fA-F]{40}$/.test(raw)) return raw as `0x${string}`
  return null
}

export function getStoredSubscriptionsAddress(): `0x${string}` | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SUBSCRIPTIONS_LS_KEY) || ''
    if (/^0x[0-9a-fA-F]{40}$/.test(raw)) return raw as `0x${string}`
  } catch { /* ignore */ }
  return null
}

export function setStoredSubscriptionsAddress(addr: `0x${string}`) {
  try {
    window.localStorage.setItem(SUBSCRIPTIONS_LS_KEY, addr)
  } catch { /* ignore */ }
}

/** Prefer env, then localStorage. Null ⇒ subscription features degrade gracefully. */
export function getSubscriptionsAddress(_chainId?: SupportedChainId): `0x${string}` | null {
  return readEnvSubscriptions() || getStoredSubscriptionsAddress()
}

export function isSubscriptionsConfigured(chainId?: SupportedChainId): boolean {
  return !!getSubscriptionsAddress(chainId)
}
