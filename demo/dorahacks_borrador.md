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

## Live mainnet demo cycle (2026-11-01 ~22:59 ART)

Full AutentikaV2 cycle on Arc Mainnet with demo wallets (0.10 USDC escrow; Katherine funded collector with 1 USDC; leftovers refunded). Commission id **1**. Photo: Katherine moodboard from diario-de-dibujo.

| Step | Tx |
|------|----|
| Gas stipend → artist | https://explorer.arc.io/tx/0xba44c58b20bfd3cb9f66edea20cc9af18c34d70fb002af869ed403fbf1dc3fbb |
| setArtistProfile | https://explorer.arc.io/tx/0x1ffc2d4c08170b85b594725dd0eecf224f857191a835559b31f7f5c8ee96c614 |
| createCommission (0.10 USDC) | https://explorer.arc.io/tx/0x6757df9726d2105c70eae6988b4d7add93147ca3580053d5e920d8d504ead503 |
| approve USDC | https://explorer.arc.io/tx/0xb2907886fb8a00eead4790a42cbcf002d8c7416507e5aa51e2690ff936d8c851 |
| **fundCommission** | https://explorer.arc.io/tx/0xf22f867b19156396415f8bf71c73d83224f78427e313bd68584b61818e1cf585 |
| markDelivered | https://explorer.arc.io/tx/0x97897f487708bed90a4855e80b70d36172a34706daaf292079608c7120457bcd |
| confirmReceipt (Released) | https://explorer.arc.io/tx/0x07fc8ab27d1ab78461a3683604ca0b95140d57bbb36a701f23799e9d27f81161 |
| withdraw (0.0995 USDC net) | https://explorer.arc.io/tx/0x580b9146f54b406d1bbb8eb5a7786e92b3036ac52c983a6a6aff90212425601e |
| Refund collector → Katherine | https://explorer.arc.io/tx/0x6b8789b9c7bed205579cde23c53944ffa24220f567faebeb04028008ed87508d |
| Refund artist → Katherine | https://explorer.arc.io/tx/0x08f5b1330820795e0cd56ba3c62a9436e8b301485c5f685a71cad0db654f6b59 |

Certificate NFT id on commission 1: see explorer / app feed after confirm. AutentikaV2 untouched (no redeploy). Directory/Subscriptions not deployed in this step.

