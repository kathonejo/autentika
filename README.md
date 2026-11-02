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

## Key Features — working now

Honest product surface for Arc Microgrants demos:

### Feed of commissioned works
Pinterest-style gallery of certificates already delivered on AutentikaV2. **Value:** discovery from finished work.

### Artist directory
Artists register (AutentikaDirectory) with bio, base USDC price, and pitch. **Value:** clearer expectations before a commission.

### Artist path (“Soy artista”) + share link + 280-char request
Directory registration first; optional V2 seal/signature in the same profile view. Public `#/artista/0x…` with a 280-character on-chain request. **Value:** one clear artist onboarding path.

### Escrow commissions (USDC)
Collector funds; USDC stays in AutentikaV2 until delivery is confirmed; 0.5% platform fee on release. Create flow is simple (title, collector, amount, deadline) — no fake shipping fields. **Value:** safe international payment for physical/digital commissions.

### Delivery + Certificate NFT (ERC-721)
Artist marks delivered with photo + title (other CoA fields prefilled/sensible defaults). Collector confirms → NFT certificate. PDF download; **Verificado en blockchain** block with Arc explorer links. **Value:** portable proof that follows the work.

### Mail club / subscriptions (AutentikaSubscriptions)
Standalone companion (does not modify V2). Overcollateral USDC deposits; artist claims one fee / 30d; **Plan anual: 12 meses, 10% de descuento**. Shipping address stays off-chain. **Value:** recurring support.

### Why blockchain?
Anyone can verify on the [Arc explorer](https://explorer.arc.io/address/0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4) — without trusting Autentika — who made the work, who paid, and ownership history.

Also: EN/ES; hash routes (`#/feed`, `#/directorio`, `#/encargos`, `#/suscripciones`, `#/como-funciona`, …); Admin deploy cards for Directory + Subscriptions (graceful degrade until env set). Primary nav (max 5): Feed, Directorio, Encargos, Crear, Perfil.

## Future features / what this grant would unlock (roadmap)

Contract hooks may already exist for some of these; **they are not presented as finished product in the UI**. A grant funds real shipping research and finishing the half-built surfaces:

| Roadmap item | What it unlocks |
|---|---|
| Milestone progress payments | Artists paid as work advances; collectors see clear stages |
| In-app resale marketplace + royalties UI | Secondary sales without leaving Autentika (ERC-2981 already on NFT) |
| Legalization UX | Guided notarial/legal document hash on the certificate |
| ERC-3643 wrapping (honest path) | Only if collectors need permissioned context — no overclaim today |
| Physical redeem + ship status | NFT and object linked without double-claims |
| **Tracked international shipping** (commissions + mail club) | Argentina→world logistics — core grant thesis |
| Unified profiles + archive legacy `KathonejoCommissions.sol` | Less confusion for newcomers |

See also `#/como-funciona` → **Próximamente / Roadmap**.

## Cómo funciona (ES)

**Funciona hoy:** feed de obras entregadas; directorio; camino “Soy artista”; encargos en escrow USDC; certificado NFT + verificación en blockchain; club de correo con plan anual 12 meses / 10% off.

**Próximamente (grant):** hitos de pago; marketplace de reventa en la app; legalización guiada; wrap ERC-3643 solo si hace falta; redención física + tracking; **envío internacional trackeado** de obras y paquetes del club; perfiles unificados.

**¿Por qué blockchain?** Cualquiera puede chequear en el explorador de Arc — sin confiar en Autentika — quién hizo la obra, quién pagó y el historial de dueños.
