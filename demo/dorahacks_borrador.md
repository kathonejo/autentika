# Autentika - borrador para DoraHacks (Arc Microgrants 2) - NO ENVIADO
Cierre: lunes 2/11/2026 01:59 ART. Revisar y dar OK antes de pegar.

## Nombre
Autentika

## One-liner
Safe international USDC payments on Arc for commissioning art, with an onchain Certificate of Authenticity — and a clear roadmap for tracked shipping that a grant would unlock.

## Description
Autentika lets artists take commissions from collectors anywhere, paid in USDC on Arc, with escrow and a permanent Certificate of Authenticity NFT.

**Working now (honest demo):**
1. Artist follows one path — **Soy artista**: register in the Directory (bio, base price, pitch); optional seal/signature for certificates.
2. Artist creates a commission (collector wallet, USDC amount, deadline, title). No fake shipping fields in the create form.
3. Collector funds escrow (0.5% platform fee on release).
4. Artist marks delivery with a Certificate of Authenticity (photo + title; other fields prefilled). Collector confirms → ERC-721 certificate NFT. Anyone can open **Verificado en blockchain** links on Arc explorer.
5. Optional **mail club / subscriptions** (AutentikaSubscriptions): collectors deposit ahead; artists claim monthly; **Plan anual: 12 meses, 10% de descuento**. Shipping address stays off-chain until logistics are built.

**Why:** artists in Argentina (and much of Latin America) struggle to get paid safely by foreign collectors; buyers need authenticity and delivery confidence. Escrow + certificate solve the money and authenticity layer today.

**What the grant funds / roadmap (not finished product yet):** research and integration of **tracked international shipping** (customs + carrier) for physical commissions and monthly mail-club packages; finishing milestone payments UI, in-app resale + royalties UX, legalization flow, honest ERC-3643 wrap only if needed, physical redeem+ship status, unified profiles, and archiving legacy KathonejoCommissions.sol. Framed so the grant clearly powers real growth for artists and collectors — without claiming unfinished features as live.

Design: Kathonejo print-studio look, bunny mascot, EN/ES. Frontend Vite + wagmi. Admin deploy for Directory + Subscriptions (V2 already live — we do not redeploy V2 for this iteration).

## Working now vs roadmap
- **Live:** escrow commissions, CoA NFT, feed, directory, artist share link + 280-char request, subscriptions (annual lock 12mo/10%), on-chain verification UX, simplified nav.
- **Roadmap / grant:** international shipping & tracking; milestones UX; resale marketplace UI; legalization UX; ERC-3643 wrap (honest); physical redeem; unified profiles; archive legacy V1.

## Links
- Arc Studio project: https://studio.arc.io/app/1f88626c-4f19-4071-ba8c-b2671ea2fa56
- Live app: https://autentika-app.vercel.app
- Admin / deploy (SE-2 helper): https://autentika-tawny.vercel.app/admin
- AutentikaV2 Arc Mainnet: 0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4
  https://explorer.arc.io/address/0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4
  Deploy tx: https://explorer.arc.io/tx/0xe7aa5c28f641c877223e64871b8098b955db068c26b81e5acd2ffb786dad2bca
- AutentikaV2 Arc Testnet: 0xfa64333dc831d267b71fb12e31e49d5488ef770a
- Older AutentikaV2 (backup): 0xc84b92fd9cdc89c8609774dcfcc8ca9543114426
- Legacy V1 (KathonejoCommissions): 0xAb795B29BA82BF7ac1EF0dF1390aFBD801b258e9
- Public GitHub: https://github.com/kathonejo/autentika
- Demo video: [FALTA]
- GitHub profile: https://github.com/kathonejo
- X profile: [FALTA si lo pide el formulario]

## Tech
React 18, Vite, TypeScript, wagmi/viem, ConnectKit. Solidity 0.8.28, Foundry, OpenZeppelin. Arc Mainnet (5042) + Testnet. USDC. Companion contracts AutentikaDirectory + AutentikaSubscriptions (do not modify AutentikaV2).
