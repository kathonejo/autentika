import artifact from '../contracts/out/AutentikaV2.sol/AutentikaV2.json';
import { getUsdc } from '@/onchain-facts';
import { Amount, usdcDecimalsFor } from '@/onchain-money';

// ─── Supported networks ──────────────────────────────────────────────────────
export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_MAINNET_CHAIN_ID = 5042;

export type SupportedChainId = typeof ARC_TESTNET_CHAIN_ID | typeof ARC_MAINNET_CHAIN_ID;

/** The EVM chain ID to use. Defaults to testnet; override per network selector. */
export function isSupportedChain(id: number): id is SupportedChainId {
  return id === ARC_TESTNET_CHAIN_ID || id === ARC_MAINNET_CHAIN_ID;
}

// ─── Per-network contract addresses ─────────────────────────────────────────
// AutentikaV2 is deployed on Arc Testnet. Arc Mainnet address is TBD.
const CONTRACT_ADDRESSES: Record<SupportedChainId, `0x${string}` | null> = {
  [ARC_TESTNET_CHAIN_ID]: '0xfa64333dc831d267b71fb12e31e49d5488ef770a',
  [ARC_MAINNET_CHAIN_ID]: null, // deploy to mainnet first; set this address
};

export function getContractAddress(chainId: SupportedChainId): `0x${string}` | null {
  return CONTRACT_ADDRESSES[chainId] ?? null;
}

export const KATHONEJO_ABI = artifact.abi;

// ─── USDC per network ────────────────────────────────────────────────────────
export function getUsdcAddress(chainId: SupportedChainId): `0x${string}` {
  const f = getUsdc(chainId);
  if (!f) throw new Error(`USDC not found for chain ${chainId}`);
  return f.address as `0x${string}`;
}

export function getUsdcDecimals(chainId: SupportedChainId): number {
  const f = getUsdc(chainId);
  if (!f) return 6;
  return f.decimals;
}

// Convenience defaults (testnet)
const _usdcFact = getUsdc(ARC_TESTNET_CHAIN_ID);
if (!_usdcFact) throw new Error('USDC not found on Arc Testnet');
export const USDC_ADDRESS = _usdcFact.address as `0x${string}`;
export const USDC_DECIMALS = _usdcFact.decimals;

// ─── Explorer helpers ────────────────────────────────────────────────────────
const EXPLORER_BASES: Record<SupportedChainId, string> = {
  [ARC_TESTNET_CHAIN_ID]: 'https://explorer.testnet.arc.io',
  [ARC_MAINNET_CHAIN_ID]: 'https://explorer.arc.io',
};

export function getExplorerBase(chainId: SupportedChainId): string {
  return EXPLORER_BASES[chainId];
}

export const EXPLORER_BASE = EXPLORER_BASES[ARC_TESTNET_CHAIN_ID];

export function explorerTx(hash: string, chainId: SupportedChainId = ARC_TESTNET_CHAIN_ID) {
  return `${getExplorerBase(chainId)}/tx/${hash}`;
}
export function explorerAddr(addr: string, chainId: SupportedChainId = ARC_TESTNET_CHAIN_ID) {
  return `${getExplorerBase(chainId)}/address/${addr}`;
}

// ─── Money helpers ───────────────────────────────────────────────────────────
export function usdcAmount(raw: bigint, chainId: SupportedChainId = ARC_TESTNET_CHAIN_ID): Amount {
  return Amount.fromRaw(raw, usdcDecimalsFor(chainId));
}

// ─── Enums ───────────────────────────────────────────────────────────────────
export enum CommissionStatus {
  Created = 0,
  Funded = 1,
  Delivered = 2,
  Released = 3,
  Refunded = 4,
  Cancelled = 5,
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface CommissionData {
  id: bigint;
  artist: string;
  collector: string;
  amount: bigint;
  deadline: bigint;
  title: string;
  status: CommissionStatus;
  deliveredAt: bigint;
  certificateId: string;
  /** Total USDC already paid out via milestone approvals; reduces refundable amount. */
  releasedSoFar: bigint;
}

export interface CertificateData {
  id: string;
  commissionId: bigint;
  artworkTitle: string;
  artistName: string;
  technique: string;
  dimensions: string;
  creationDate: bigint;
  careInstructions: string;
  signatureUrl: string;
  sealUrl: string;
  instagramHandle: string;
  photoUrl: string;
  photoHash: string;
  amountPaid: bigint;
  paymentTxHash: string;
  releasedAt: bigint;
  collector: string;
  currentOwner: string;
  owners: string[];
  prices: bigint[];
}

export interface ArtistProfileData {
  displayName: string;
  instagramHandle: string;
  sealUrl: string;
  signatureUrl: string;
  exists: boolean;
}

export interface MilestoneData {
  description: string;
  amount: bigint;
  artistDone: boolean;
  collectorApproved: boolean;
}

export interface ListingData {
  seller: string;
  priceUsdc: bigint;
  active: boolean;
}

export interface LegalRecord {
  documentHash: string;
  note: string;
  timestamp: bigint;
  exists: boolean;
}
