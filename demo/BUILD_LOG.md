# Autentika — Build log (for DoraHacks demo & video)

All times America/Buenos_Aires (UTC-3).

## 2026-10-28 — Built in Arc Studio
- Created Arc Studio project "Autentika" (https://studio.arc.io/app/1f88626c-4f19-4071-ba8c-b2671ea2fa56).
- Prompted Arc Studio to build the USDC escrow + on-chain certificate of authenticity, generic for any artist, with artist profiles (name, network link, seal, signature) and certificate PDF.
- Arc Studio wrote the contract (KathonejoCommissions.sol), tests (89/89 Foundry passing, fuzz + invariant), security review, and the app; deployed to Arc Testnet (0xf1042573fbffccc48a6a5692a805b02be166db3b).
- Second prompt: print-studio restyle with Kathonejo's palette (#345DB4 blue, pink, yellow, sky) and halftone bunny mascot.
- Code exported and V1 deployed to Arc mainnet: 0xAb795B29BA82BF7ac1EF0dF1390aFBD801b258e9 (Arc Studio is testnet-only, so mainnet deploy happens outside with the artist's own wallet).

## 2026-10-31 — Feature iteration and mainnet V2
- New requirements from Katherine: mobile menu, optional milestones, optional royalties, NFT certificate ready for open tokenization, optional legalization, admin page to deploy with her own wallet (Rabby), tiny deployer fee (0.5% commissions / 0.25% resales).
- AutentikaV2 deployed to Arc mainnet by Katherine from the in-app Admin page, signing with Rabby: 0xc84b92fd9cdc89c8609774dcfcc8ca9543114426.
- Test commission #1 (1 USDC) created and funded on mainnet; artist and collector are the same wallet for the test.
- Feedback from real use on mobile: added Artist/Collector tabs, photo upload from phone with automatic SHA-256, physical vs digital artwork toggle.

## 2026-11-01 — Bringing V2 into Arc Studio + collaboration
- Re-read the rules: the build must live in Arc Studio. Audited the Arc Studio project (screenshots 01–08) and sent the V2 feature set as a prompt to Arc Studio so contracts, tests and app are built there (prompt: prompts/01-contract-v2.txt; screenshots 10+).
- Collaboration: Katherine builds together with her partner Luciano (GitHub: luloxi) using Arc Studio's GitHub integration, the way Arc Studio supports teamwork. Public repo https://github.com/kathonejo/autentika with luloxi as collaborator; Arc Studio pushes the code there and both work from the repo. We would have loved to also share the same Arc Studio project directly.
- Arc Studio result (08:58 ART): Arc Studio's agent wrote AutentikaV2.sol (milestones, platform fee, ERC-721 certificate, ERC-2981 royalties, resale marketplace, legalization), ran its own security review (1 Critical, 2 High, 1 Medium fixed; Slither clean of real issues), 132/132 Foundry tests passing incl. fuzz, and deployed to Arc Testnet: 0xfa64333dc831d267b71fb12e31e49d5488ef770a (tx 0x0ebdab1bd1290449f2916e853bb6102072ab6fbf6a5d0b764a077c2e77bc805b). Screenshots 10–15.
- App UI in Arc Studio (~09:15 ART, prompt prompts/02-app-ui-v2.txt, Build mode): Arc Studio's agent updated the app to use every V2 feature while keeping the visual style: mobile hamburger menu, As artist / As collector tabs, physical/digital toggle with shipping fields, milestones and royalty %, photo upload with automatic SHA-256, milestone progress bar, NFT certificate with resale (list/cancel/buy + price split), Legalize panel + "What is legalization?" page, owner-only Admin, Arc Testnet + Arc Mainnet support. 16 files edited, lint + typecheck 0 errors. Screenshots 20–24.
- Code to GitHub (~09:35 ART): downloaded the code from Arc Studio (Download Code) and pushed it to https://github.com/kathonejo/autentika (commit 017f1c6), together with this build log, the prompts and the screenshots in /demo. Secrets (.env) excluded. Luciano (luloxi) collaborates from the repo.

## Feedback for Arc Studio
- Collaborative projects (invite a teammate to the same Arc Studio project and thread) would help couples/teams of artists and builders.
- A mainnet deploy path (or a guided "export & deploy with your wallet") inside Arc Studio.

## 2026-11-01 — Mainnet deploy path + live Arc Studio app
- Verified Arc Studio AutentikaV2: forge build + tests pass; constructor `(USDC, owner, feeRecipient)` allows owner==feeRecipient (only rejects zero).
- SE-2 `/admin` now deploys Arc Studio bytecode with args `(USDC, her wallet, her wallet)`. Live: https://autentika-tawny.vercel.app/admin
- Live Arc Studio app published: https://autentika-app.vercel.app (mainnet address env `VITE_AUTENTIKA_MAINNET_ADDRESS` empty until she deploys; did not point at older 0xc84b…).
- Repo commit: `mainnet config` on kathonejo/autentika.

## 2026-11-01 — Mainnet AutentikaV2 (Arc Studio bytecode) confirmed
- Katherine deployed AutentikaV2 from /admin with Rabby on Arc Mainnet.
- Address: 0xEeD7B7a048bcdd43801c644F75FdF84bee3bd7D4
- Deploy tx: 0xe7aa5c28f641c877223e64871b8098b955db068c26b81e5acd2ffb786dad2bca (block 29039555, ~16:48 ART).
- Verified onchain: runtime bytecode matches the Arc Studio AutentikaV2 build (immutable USDC = 0x3600…0000); owner() and feeRecipient() = 0x21e5fc1Efc822f25E1dff11f81214c9C65032D79; platformFeeBps = 50.
- Wired live app: VITE_AUTENTIKA_MAINNET_ADDRESS on autentika-app (production), src/contract.ts + README updated to mainnet.
