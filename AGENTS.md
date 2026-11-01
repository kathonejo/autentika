# Kathonejo Commissions

> Built with Arc Studio — money-powered apps in minutes.

## What This App Does

USDC escrow for art commissions from foreign collectors. Artist creates a commission, collector funds it on-chain. Artist marks it delivered with a Certificate of Authenticity (artist name, artwork title, technique, dimensions, creation date, photo URL + content hash). Collector confirms receipt — USDC releases to artist and the certificate is permanently recorded on-chain with full provenance. Auto-claim after 14 days if collector is unresponsive. Refund if deadline passes without delivery. Certificate ownership can be transferred to track resale provenance.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry + OpenZeppelin 5.6.1. via_ir = true. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build`, test with `bun run contracts:test`.
- Chain: Arc Testnet (Chain ID: 5042002)
- Token: USDC (6 decimals, address: 0x3600000000000000000000000000000000000000, Arc Testnet)
- Toasts: Sonner
- i18n: EN / ES toggle (in-memory, no library)

## Key Files

- `src/App.tsx` — main routing/state shell
- `src/components/` — CommissionsListView, CreateCommissionView, CommissionDetailView, CertificateView, DeliveryCertificateForm, ArtistProfileView, StatusBadge, Header, CommissionCard, WithdrawBanner, BunnyLogo
- `src/hooks/useCommissions.ts` — contract read hooks
- `src/contract.ts` — contract address, ABI, types
- `src/i18n.ts` — EN/ES translation strings
- `src/lib/share.ts` — getShareBase / buildShareLink / installShareSync

## Contract Deployments

| Contract | Chain | Address | Explorer |
|---|---|---|---|
| **AutentikaV2 (current)** | Arc Testnet | 0xfa64333dc831d267b71fb12e31e49d5488ef770a | https://explorer.testnet.arc.io/address/0xfa64333dc831d267b71fb12e31e49d5488ef770a |
| KathonejoCommissions v2 (deprecated) | Arc Testnet | 0xf1042573fbffccc48a6a5692a805b02be166db3b | https://explorer.testnet.arc.io/address/0xf1042573fbffccc48a6a5692a805b02be166db3b |
| KathonejoCommissions v1 (deprecated) | Arc Testnet | 0x6a5c12d2b55523ef1d6bd47b3bd1d471c65f5831 | https://explorer.testnet.arc.io/address/0x6a5c12d2b55523ef1d6bd47b3bd1d471c65f5831 |

AutentikaV2 constructor args:
- `_usdcToken = 0x3600000000000000000000000000000000000000` (Arc Testnet USDC)
- `_initialOwner = 0x5B12Ce46C7194aD57d143bC22847224047b1Ef42` (platform deployer wallet — owns admin setters)
- `_feeRecipient = 0x5B12Ce46C7194aD57d143bC22847224047b1Ef42` (platform deployer wallet)
- Deploy tx: 0x0ebdab1bd1290449f2916e853bb6102072ab6fbf6a5d0b764a077c2e77bc805b
- Contract ID: 01a196f9-73d2-738a-96cb-b7722de546ee
- Deployed: 2026-11-01
- Artifact: contracts/out/AutentikaV2.sol/AutentikaV2.json

ERC-721 token: name "Autentika Certificate", symbol "AUTC" — minted to collector on release.
ERC-2981: royalty set per commission at creation (0–10%).
Platform fee: 50 bps on releases; 25 bps on resales (owner-settable).
Pull-withdrawal: after any release/refund/milestone/resale, recipients call `withdraw()` to pull USDC.

## URL Routing

- `/?commission=<id>` — deep-link to a commission detail
- `/?cert=<certId>` — deep-link to a public certificate page

## To Run

```bash
bun install
bun run dev
```
