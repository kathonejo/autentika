# Autentika

Commissions and certificates of authenticity for artists, paid in USDC. Artists create commissions, collectors fund them in USDC on Arc Mainnet (and Arc Testnet). Delivery triggers a Certificate of Authenticity recorded permanently onchain with artwork photo, technique, dimensions, care instructions, artist signature, and content hash. Certificates can be transferred to track resale provenance.

Built with [Arc Studio](https://studio.arc.io)

## Visual Design

Print-studio / screen-print aesthetic with Kathonejo's brand palette: primary blue `#345DB4`, signature pink `#FAB6C1`, yellow `#FFE45C`, sky blue `#9ED8F5`, hot pink `#F06AA8`, green `#7CC66B`. Features include CSS radial-gradient halftone dot patterns in page corners and hero strip, cards framed with three nested concentric colored box-shadows (pink > yellow > sky), rotated sticker-style status badges, pill buttons with thick blue outline and yellow halo, a halftone-dot bunny SVG logo, Space Grotesk poster headings, and Inter body text.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Space Grotesk + DM Sans
- **Web3**: wagmi v2, viem, ConnectKit
- **Smart Contract**: Solidity 0.8.28, Foundry, OpenZeppelin 5.6.1 (SafeERC20, ReentrancyGuard), `via_ir = true`
- **Chain**: Arc Mainnet (Chain ID: 5042) and Arc Testnet (Chain ID: 5042002)
- **Token**: USDC (6 decimals, pinned at deploy time)
- **i18n**: EN / ES toggle (in-memory, no library)
- **PDF**: jsPDF (landscape Certificate of Authenticity download)

## Contract Deployments

| Contract | Chain | Address |
|---|---|---|
| AutentikaV2 (Arc Studio, current) | Arc Mainnet | `0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4` |
| AutentikaV2 (Arc Studio) | Arc Testnet | `0xfa64333dc831d267b71fb12e31e49d5488ef770a` |
| AutentikaV2 (older, backup only) | Arc Mainnet | `0xc84b92fd9cdc89c8609774dcfcc8ca9543114426` |
| KathonejoCommissions v1 (legacy) | Arc Mainnet | `0xAb795B29BA82BF7ac1EF0dF1390aFBD801b258e9` |

Mainnet explorer: https://explorer.arc.io/address/0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4  
Mainnet deploy tx: https://explorer.arc.io/tx/0xe7aa5c28f641c877223e64871b8098b955db068c26b81e5acd2ffb786dad2bca  
Testnet explorer: https://explorer.testnet.arc.io/address/0xfa64333dc831d267b71fb12e31e49d5488ef770a

Live app: https://autentika-app.vercel.app

## Marketplace screens (hash routes)

| Screen | URL |
|---|---|
| Feed (Pinterest-style certificates) | https://autentika-app.vercel.app/#/feed |
| Artist directory | https://autentika-app.vercel.app/#/directorio |
| Public artist profile + 280-char request | https://autentika-app.vercel.app/#/artista/<address> |
| Individual work | https://autentika-app.vercel.app/#/obra/<tokenId> |
| How it works / Why blockchain | https://autentika-app.vercel.app/#/como-funciona |
| Subscriptions / mail club | https://autentika-app.vercel.app/#/suscripciones |
| Tokenize / ERC-3643 help | https://autentika-app.vercel.app/#/tokenizar |
| Admin (deploy Directory + Subscriptions) | https://autentika-app.vercel.app/#/admin |

Companion contract **AutentikaDirectory** (artist registry, ≤280-byte commission requests, one-time physical redemption) is deployed by Katherine from Admin → Deploy AutentikaDirectory (signs in Rabby). Set `VITE_AUTENTIKA_DIRECTORY_ADDRESS` after deploy. Until then the feed/directory/profiles still work from AutentikaV2; request/redeem buttons degrade gracefully.

Companion contract **AutentikaSubscriptions** (club de correo: overcollateral USDC deposits, monthly claims, **Plan anual: 12 meses, 10% de descuento**) is deployed from Admin → Deploy AutentikaSubscriptions. Set `VITE_AUTENTIKA_SUBSCRIPTIONS_ADDRESS` after deploy; UI degrades gracefully until then. Shipping address is off-chain.

| AutentikaDirectory | Arc Mainnet | *(pending Katherine deploy from /#/admin)* |
| AutentikaSubscriptions | Arc Mainnet | *(pending Katherine deploy from /#/admin)* |
  
Arc Studio project: https://studio.arc.io/app/1f88626c-4f19-4071-ba8c-b2671ea2fa56

## Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_AUTENTIKA_MAINNET_ADDRESS` | AutentikaV2 on Arc Mainnet (`0xEeD7…d7D4`). Optional; code already defaults to that address. |
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL (optional outside Arc Studio; never commit) |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy token (optional outside Arc Studio; never commit) |
| `RPC_PROXY_CHAINS` | Comma-separated chain keys for the proxy (optional outside Arc Studio) |

## Development

**Prerequisites**: Bun, Foundry

```bash
bun install
bun run dev
```

**Contracts**:
```bash
bun run contracts:build   # forge build
bun run contracts:test    # forge test
```

## Key Features

Each item below says what it does and why it matters for artists and collectors.

### Feed of commissioned works
A Pinterest-style gallery of certificates already delivered on AutentikaV2. Collectors browse real finished art, open a piece, and from there reach the artist. **Value:** discovery based on completed work, not cold DMs.

### Artist directory
Artists register once (via AutentikaDirectory) with a short bio, base price in USDC, and terms. Collectors see prices and past commissions in one place. **Value:** clearer expectations and less friction to start a commission.

### Artist profile + share link + 280-character request
Each artist has a public link (`#/artista/0x…`). Collectors open it and write what they want in up to **280 characters** (live counter; on-chain byte limit). The request is recorded on-chain. **Value:** shareable storefront; the brief does not get lost in chat.

### Individual work page
Every certificate opens as its own page (`#/obra/<tokenId>`): photo, title, technique, and a path to commission the same artist again — plus an on-chain verification block. **Value:** a clean public page for each piece.

### Escrow commissions with milestones
USDC sits in AutentikaV2 until delivery is confirmed. Optional milestones release payment in stages. **Value:** artists get paid safely; collectors know funds are locked for the work.

### Certificate NFT (ERC-721)
When the collector confirms, Autentika mints a unique NFT certificate with photo, hash, technique, dimensions, and provenance. **Value:** portable proof of the commission that travels with the work.

### Resale royalties (ERC-2981)
Artists keep earning when the certificate changes hands on marketplaces that respect ERC-2981. **Value:** ongoing upside for the creator after the first sale.

### Legalization
Optionally attach a legal document hash to the certificate so a notarial or legal record points at the same on-chain piece. **Value:** bridges traditional paperwork and the chain record.

### Tokenization & ERC-3643 note
The certificate is already an ERC-721 NFT. ERC-3643 (T-REX) is for permissioned security tokens with KYC — not a natural fit for unique art. Autentika does **not** claim ERC-3643 compliance; a later wrap or fractionalization would be a separate step. **Value:** honest framing so collectors are not misled.

### Physical artwork, redeemable once
The artist can mark that the NFT accompanies a physical piece. Only the current NFT holder can redeem it, and only once; then the artist marks it shipped (AutentikaDirectory). **Value:** digital certificate and physical delivery stay linked without double-claims.

### Mail club / subscriptions (AutentikaSubscriptions)
Collectors deposit USDC ahead of an artist’s monthly fee; the artist claims one fee per 30-day period (0.5% platform fee, owner-configurable, max 2%). **Plan anual: 12 meses, 10% de descuento** — locking 12 months of discounted fees. Cancel stops after the current period; free balance can be withdrawn. Shipping address is collected off-chain. **Value:** recurring support without modifying AutentikaV2 escrow.

### Why blockchain? Public verifiability
Anyone can open the [Arc explorer](https://explorer.arc.io/address/0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4) and verify — **without trusting Autentika** — who made the work, when it was commissioned, who paid in USDC, and the ownership history. That proof cannot be erased or forged. It raises the value and trust of the work, and protects artists against copies. In the app: **Cómo funciona** (`#/como-funciona`) and a **Verificado en blockchain** block on each work/certificate page with explorer links (contract, NFT token, payment tx when available).

Also: artists set a profile once (name, Instagram, seal, signature); collectors fund escrow; delivery snapshots the CoA; auto-claim after 14 days; refund after deadline; cancel before funding; transferable certificates with provenance; PDF download; EN/ES toggle; shareable `#/encargo/<id>` and `#/cert/<certId>` links.

## Cómo funciona (ES)

Autentika conecta artistas y coleccionistas con encargos en USDC en escrow sobre Arc. Cada obra terminada deja un rastro público y permanente en blockchain.

- **Feed:** galería de obras ya entregadas; el coleccionista descubre arte real y llega al artista.
- **Directorio:** artistas con bio, precio base y condiciones; menos fricción para encargar.
- **Perfil + link + pedido de 280 caracteres:** vitrina pública; el pedido queda on-chain.
- **Página de obra:** ficha pública de cada certificado, con verificación en el explorador.
- **Escrow e hitos:** el USDC queda trabado hasta la entrega (o se libera por etapas).
- **Certificado NFT:** prueba única de autenticidad y procedencia.
- **Regalías en reventa:** el artista sigue cobrando cuando la pieza cambia de manos.
- **Legalización:** hash de un documento legal apuntando a la misma pieza.
- **Tokenización / ERC-3643:** el certificado ya es ERC-721; ERC-3643 es para security tokens con KYC — Autentika no afirma ese cumplimiento.
- **Obra física redimible una vez:** solo el titular del NFT puede reclamarla, una sola vez.
- **Club de correo / suscripciones:** depósitos USDC overcollateral; cobro mensual; **Plan anual: 12 meses, 10% de descuento**. Envío off-chain.

**¿Por qué blockchain?** Cualquiera puede chequear en el explorador de Arc — sin confiar en Autentika — quién hizo la obra, cuándo, quién pagó en USDC y el historial de dueños. Esa prueba no se borra ni se falsifica: sube el valor y la confianza, y protege al artista frente a copias.
