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

- Any artist can create a commission specifying collector wallet, USDC amount, deadline, and title
- Artists set a profile once: display name, Instagram handle, round seal/logo, signature image
- Collector approves USDC and funds the escrow
- Artist marks delivery with a full Certificate of Authenticity: artwork title, artist name, technique, dimensions, creation date, care instructions, photo URL + SHA-256 hash
- Artist profile fields (seal, signature, Instagram) are snapshotted into the certificate at delivery time
- Collector confirms receipt; USDC releases to artist via pull-withdrawal pattern
- Auto-claim: artist can claim 14 days after delivery if collector is unresponsive
- Refund: collector can refund after the delivery deadline passes (if still in Funded state)
- Cancel: either party can cancel before funding
- Certificates are transferable — each transfer appends owner and resale price to the provenance chain
- Certificate page: landscape sheet with photo band, round seal, signature, "Issued with Autentika" footer, and Download PDF button
- Shareable deep-links: `/?commission=<id>` and `/?cert=<certId>`
- EN/ES language toggle in the header
