# Autentika

Commissions and certificates of authenticity for artists, paid in USDC. Artists create commissions, collectors fund them on Arc Testnet. Delivery triggers a Certificate of Authenticity recorded permanently onchain with artwork photo, technique, dimensions, care instructions, artist signature, and content hash. Certificates can be transferred to track resale provenance.

Built with [Arc Studio](https://studio.arc.io)

## Visual Design

Print-studio / screen-print aesthetic with Kathonejo's brand palette: primary blue `#345DB4`, signature pink `#FAB6C1`, yellow `#FFE45C`, sky blue `#9ED8F5`, hot pink `#F06AA8`, green `#7CC66B`. Features include CSS radial-gradient halftone dot patterns in page corners and hero strip, cards framed with three nested concentric colored box-shadows (pink > yellow > sky), rotated sticker-style status badges, pill buttons with thick blue outline and yellow halo, a halftone-dot bunny SVG logo, Space Grotesk poster headings, and Inter body text.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Space Grotesk + DM Sans
- **Web3**: wagmi v2, viem, ConnectKit
- **Smart Contract**: Solidity 0.8.28, Foundry, OpenZeppelin 5.6.1 (SafeERC20, ReentrancyGuard), `via_ir = true`
- **Chain**: Arc Testnet (Chain ID: 5042002)
- **Token**: USDC (6 decimals, pinned at deploy time)
- **i18n**: EN / ES toggle (in-memory, no library)
- **PDF**: jsPDF (landscape Certificate of Authenticity download)

## Contract Deployments

| Contract | Chain | Address |
|---|---|---|
| KathonejoCommissions v2 (current) | Arc Testnet | `0xf1042573fbffccc48a6a5692a805b02be166db3b` |
| KathonejoCommissions v1 (deprecated) | Arc Testnet | `0x6a5c12d2b55523ef1d6bd47b3bd1d471c65f5831` |

Explorer: https://explorer.testnet.arc.io/address/0xf1042573fbffccc48a6a5692a805b02be166db3b

## Environment Variables

| Variable | Purpose |
|---|---|
| `RPC_PROXY_BASE_URL` | Arc Studio RPC proxy base URL (optional outside Arc Studio) |
| `RPC_PROXY_TOKEN` | Arc Studio RPC proxy token (optional outside Arc Studio) |
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
