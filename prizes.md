# ETHGlobal Mumbai 2026 — Prizes

13 prizes. Items marked **[Continuity]** are only available to Continuity Track participants.

| Sponsor | Total |
|---|---|
| World | $12,500 |
| 1inch | $7,000 |
| 0G | $15,000 |
| Uniswap Foundation | $15,000 |
| Arc | $15,000 |
| Hedera | $15,000 |
| Arkiv | $15,000 |
| Whitechain | $15,000 |
| Ethereum Foundation | $15,000 |
| ENS | $10,000 |
| Definitive | $5,000 |
| Chainlink | $5,000 |
| ETHGlobal Mumbai Finalist | top 10 teams |

## ETHGlobal Mumbai Finalist (top 10 teams)

Per person, by team size:

| Team size | Prize / person | Travel / person |
|---|---|---|
| Solo | 250 USDC | None |
| 2 people | 250 USDC | 250 USDC |
| 3–5 people | 1,000 USDC | 500 USDC |

Travel reimbursement can be used toward one in-person ETHGlobal hackathon within 365 days.

Finalist Pack (every finalist):
- $828 off ETHGlobal Plus (Stripe checkout)
- Finalist hoodie
- $10,000 AWS credits (eg.to/how-to-aws, use OrgID from the coupon)

---

## World — $12,500

World ID lets apps confirm someone is a unique human without revealing identity.

### World ID Agent Pass — $2,500 **[Continuity]**
1st $1,500 · 2nd $1,000

Integrate World ID Agent Pass; especially interested in agentic products. Show an application asking a person to authenticate or complete a fresh verification at the moment. Strong submissions show a meaningful action needing a human identity/approval layer, not just a login screen.

Requirements:
- Integrate official World ID Agent Pass
- Demonstrate full journey: request → user completion → validated result → protected action
- Demonstrate a denied/expired/cancelled/unsuccessful path where the protected action does not occur
- Validate results in a secure backend; no exposed client secrets; don't treat unvalidated client response as authorization
- Short integration debrief: time to first success, friction, missing capability/docs, single highest-impact improvement

Links: https://auth.world.org/ · https://auth.world.org/docs · https://auth.world.org/portal

### World ID Agent Pass — $5,000
1st $2,500 · 2nd $1,500 · 3rd $1,000

Same description and requirements as above. Note: proofs are mocked now (no sandbox app needed) and use fake identities — do not rely on them for production.

Links: https://auth.world.org/ · https://auth.world.org/portal · https://auth.world.org/docs

### Best Use of IDKit — $2,500
Up to 2 teams get $1,250.

Build a product using IDKit for a real trust moment (needs to know something meaningful about a person before granting access/completing an action/changing experience). Use the proportionate credential: Proof of Human, Passport/NFC, or Selfie Check (live with Sybil score). Rewarding the best decision about which credential is needed and why, not the most credentials. Examples: fair access to scarce benefit, privacy-preserving eligibility check, account recovery/protection, safer/simpler workflow.

Requirements:
- Integrate IDKit in a functioning app, mini app, or onchain flow
- Use at least one supported World ID credential; verify on server or onchain
- Explain the product event requiring trust and why the chosen credential is minimum sufficient assurance
- Demo a successful verification and one meaningful alternative path (cancellation, unavailable credential, rejection, ineligible user)
- Short integration debrief (same as above)

Links:
- IDKit JS Example https://idkit-js-example.vercel.app/
- Integration guide https://docs.world.org/world-id/idkit/integrate
- Configure credentials https://docs.world.org/world-id/idkit/credentials
- Proof of Human https://docs.world.org/world-id/credentials/1
- Passport/NFC https://docs.world.org/world-id/credentials/9303
- Selfie Check Beta https://docs.world.org/world-id/credentials/11
- Verification flows https://docs.world.org/world-id/idkit/verification-flows
- Developer Portal https://developer.worldcoin.org

### [Cont] Best Use of IDKit — $2,500 **[Continuity]**
Up to 2 teams get $1,250. Same description and requirements as Best Use of IDKit.

Links: IDKit Docs https://docs.world.org/world-id/overview

Resources: World ID Simulator https://simulator.worldcoin.org/id/0x18310f83 · iOS Sandbox App https://testflight.apple.com/join/Tub7zuyD · Workshop video available

---

## 1inch — $7,000

1inch unifies DeFi liquidity (DEX aggregator since 2019). Newest release, Aqua, reimagines DEX design.

### Build an Aqua App — $5,000
1st $2,500 · 2nd $1,500 · 3rd $1,000

Create a custom Aqua app implementing a sophisticated DeFi position. If using SwapVM you may modify opcodes and define your own instructions. Demonstrate final positions via test scripts or UI. SwapVM projects score higher.

Requirements:
- Official Aqua/SwapVM contracts must be used (redeploying a modified SwapVM allowed)
- Onchain token transfers shown in final demo (local forks OK)
- Proper git commit history (no single-commit entries on final day)

Links:
- SwapVM https://github.com/1inch/swap-vm/tree/main
- Aqua https://github.com/1inch/aqua
- Aqua SDK https://github.com/1inch/sdks/tree/master/typescript/aqua

### Build an Aqua App — Continuity Track — $2,000 **[Continuity]**
1st $1,500 · 2nd $500. Same description and requirements.

Resources: SwapVM whitepaper https://github.com/1inch/swap-vm/blob/release/1.1/docs/whitepaper-swap-vm-1.0.pdf · Aqua whitepaper https://github.com/1inch/aqua/blob/main/docs/whitepaper-aqua-1.0.pdf

Workshop: Reimagining the AMM with 1inch Aqua — in person, 05:30 PM IST Thu Nov 5, 2026, Workshop Room 2.

Jobs: Software Engineer Blockchain / Web3 at 1inch.

---

## 0G — $15,000

0G is the trust layer for AI: Private Computer (OpenAI-compatible API, 100+ models, verified runs), Storage, and an AI-native EVM L1.

### Build with 0G PC — $5,000
1st $2,500 · 2nd $1,500 · 3rd $1,000

Build a consumer app where AI on 0G is the product — something people use and come back to. Image, video, voice apps welcome. Every team gets 0G compute credits.

Models: Image — seedream, hy-image, z-image · Video — seedance, minimax-h3 · Speech — whisper-large-v3 · Multimodal — qwen omni, qwen vision · Native — 0gm-1.0

Bonus (iAI): iAI holders get daily 0G compute credits (1.271 per staked iAI, refresh 00:00 UTC, unused expire). Apps letting users sign in with their 0G account and spend their own credits score higher; standout apps may be invited to discuss revenue share. No need to buy iAI; test with credits given to your team.

Not wanted: generic chat wrappers; apps where the AI call could be removed unnoticed.

Must show:
- Inference on 0G Private Computer in main flow, with request IDs
- Working app a judge can try, with a clear reason to return tomorrow
- One sentence on what breaks if 0G is removed
- iAI bonus: user signs in with 0G account and credit balance goes down with use

Submission: name + description; public GitHub repo (README + setup); demo video (<3 min) + live demo link; contract addresses (if any); team names and contact (Telegram, X)

Links: https://0g.ai/blog/introducing-infinite-ai · https://iai.finance · https://iai.finance/docs · https://pc.0g.ai · https://docs.0g.ai/developer-hub/building-on-0g/compute-network/overview · https://iai.finance/docs#p-legal

### Physical AI: Agents with a Body — $5,000
1st $2,500 · 2nd $1,500 · Best build on real hardware $1,000

A robot, drone, wearable or pocket device whose decisions run on 0G. Simulated builds are eligible for every prize; one prize is held for best real-hardware build. 0G is the brain, not the spinal cord: motion stays on device; 0G makes decisions at key checkpoints and keeps the record.

Lanes: Robots/machines (arms, rovers, drones; sim or hardware) · Personal devices (open, verifiable alternative to Meta's Muse assistant; memory on 0G Storage, sealed inference) · Build without hardware (start from zerobot with mock robot — targets Unitree Go2 on 0G Galileo testnet — or MuJoCo, PyBullet, Gazebo + ROS 2, LeRobot)

Not wanted: chatbot with robot avatar, pre-recorded motion, 0G used only for logs.

Must show:
- 0G call inside decision loop (vision, voice or decision model)
- Episode log on 0G Storage with request id per decision
- Replayable simulation, or live hardware demo at 0G booth
- Safe-stop fallback if 0G unreachable (a fallback that fakes the decision disqualifies)

Same submission requirements as above. Prizes paid at 0G's discretion (quality threshold).

Links: https://github.com/0gfoundation/zerobot · https://pc.0g.ai/models · https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk · https://mujoco.org · https://pybullet.org · https://gazebosim.org

### Keep Building on 0G — $3,000 **[Continuity]**
Up to 2 teams get $1,500.

For teams iterating on an existing 0G project (previous ETHGlobal event, Open Agents, Zero Cup, AKINDO wave, or independent prior work). Judged on meaningful progress during the Mumbai window. Not wanted: old demos re-presented, cosmetic changes.

Must show:
- Link to prior state (dated commit hash or previous submission page)
- Dated changelog of work during the hackathon window
- 0G in new work: Compute request id, Storage root hash, or Chain contract address from this hackathon
- Short "What's next" statement

Same submission requirements. Paid at 0G's discretion.

Links: https://x.com/ETHGlobal/status/2056399209767866682 · https://build.0g.ai · https://build.0g.ai/showcase · https://docs.0g.ai

### Agents That Pay for Themselves — $2,000
Up to 2 teams get $1,000.

Build an agent that earns money, and that money pays for its own inference on 0G Compute without a human topping up.

Recommended path: comfy (token launchpad on 0G): register agent with comfy CLI (mints onchain identity); launch its token with compute share on (part of creator fees lands as credit in the agent's compute account); mint a capped compute key (comfy never holds it). Other earning methods count (charging for a service, being paid by other agents) as long as money reaches 0G Compute with no human in the loop.

Love to see: agents doing a job worth paying for; budget-aware agents (switch to cheaper model, slow down, pause); agents that hire/pay other agents.
Not wanted: token launch with chatbot attached; "revenue" from the team trading its own token; agent whose wallet a human refills.

Must show:
- Full loop: money in → credit in agent's 0G compute account → inference paid from it, with tx hashes and request IDs
- Agent running on its own in demo, no manual top-up
- Spend cap and graceful degradation when funds run low
- If using comfy: agent ID, token address, token's fees tab showing compute delivered

Same submission requirements.

Links: https://pc.0g.ai/models · https://docs.0g.ai/developer-hub/building-on-0g/compute-network/overview · https://www.comfy.fun/docs · https://www.npmjs.com/package/comfy-cli · https://github.com/0g-axion/comfy-plugin

Resources: https://docs.0g.ai · https://build.0g.ai · https://pc.0g.ai · https://faucet.0g.ai

Workshop: One API, All of AI: Building on 0G Private Computer — in person, 03:30 PM IST Thu Nov 5, Workshop Room 1.

---

## Uniswap Foundation — $15,000

### Build with Uniswap — $10,000
1st $4,000 · 2nd $3,000 · 3rd $2,000 · 4th $1,000

Build on or integrate any part of the Uniswap stack: Uniswap API, AMM (v2/v3/v4), CCA, other protocols; new v4 hooks, extensions/improvements to official repos, ecosystem tooling.

Requirements: public GitHub repo with open-source code, a FEEDBACK.md, and a completed Uniswap Developer Feedback Form (https://developers.uniswap.org/hackathon-feedback) including the link to FEEDBACK.md. Submissions without it will be reviewed/audited before winners are finalized. README must point to relevant contracts and lines of code.

### Build with Uniswap — $5,000 **[Continuity]**
$1,250 each for 1st–4th. Same description and requirements.

Resources: Docs https://developers.uniswap.org/docs · Developer Platform https://developers.uniswap.org/dashboard/welcome · AI Skills https://www.skills.sh/uniswap/uniswap-ai

Workshop: How to Navigate the Uniswap Stack — in person, 04:30 PM IST Thu Nov 5, Workshop Room 1.

---

## Arc — $15,000

Arc is Circle's EVM-compatible L1 ("Economic OS for the internet"). Arc Studio: describe the onchain app and it writes/tests contracts and builds the app, with access to USDC, EURC, Gateway, CCTP, Wallets. **Every Arc prize requires using Arc Studio as the starting point; state which bounty you're submitting for.**

Common requirements for all Arc prizes:
- Built in Arc Studio; include shareable Arc Studio project URL; show Studio in demo
- Functional MVP (working frontend + backend) and architecture diagram
- Video demo + presentation covering core functions and use of Arc Studio / Circle dev tools, with documentation
- Link to GitHub/Replit repo

Links: https://arc.io · https://studio.arc.io

### Best DeFi / Onchain Finance App Built End to End in Arc Studio — $3,000
DeFi/onchain finance app on Arc using USDC or EURC for settlement. Looking for: trading apps (incl. tokenized RWAs); lending/borrowing/credit/collateral; payments and liquidity infrastructure (e.g. credit co-op); neobanks.

### Best Mobile Web Consumer Agent Using the Marketplace Discovery API — $3,000
Web app where a consumer's agent discovers services via the marketplace discovery API and pays in USDC on Arc, no crypto knowledge needed. Looking for: agent finding/selecting services via API; per-use payments with Nanopayments; consumer controls (spend limits, approvals, purchase history); mobile-first UX.

Links: https://www.circle.com/blog/discover-the-whole-agent-marketplace-in-one-call · https://developers.circle.com/agent-stack/agent-marketplace/discovery-api

### Best Smart Contracts with Advanced Stablecoin Logic, In Arc Studio — $3,000
Write/test/deploy contracts in Studio with advanced USDC/EURC logic, then connect to a web/mobile app. Looking for: conditional escrow with onchain dispute and auto release; programmable payroll/vesting; treasury management and payment splitting; software-to-software payments; crosschain conditional transfer (escrow on source, release on destination via Circle Forwarder). Bonus for reusable contracts.

### Best Use of Bridge Kit for Non-USDC Assets, Built in Arc Studio — $3,000
App/protocol/dev tool using CCTP via Bridge Kit for non-USDC assets. Looking for: apps moving non-USDC assets across chains in one simple flow; protocols/tools making a new asset crosschain; flows that settle or pair with USDC/EURC on Arc.

Link: https://developers.circle.com/cctp/expanded-assets

### Arc Studio Continuity Track: Bring Your Project to Arc — $3,000 **[Continuity]**
Add a working Arc integration to an existing project (extend or rebuild). Open source repos and live products qualify. Looking for: USDC/EURC payment flows in existing commerce/fintech/wallet products; crosschain transfers/unified balance in production projects; Nanopayments in existing AI agent/API monetization tools; stablecoin settlement/escrow in existing DeFi/marketplaces; Arc treasury/FX in live multi-chain products.

Workshop: Build Apps Powered by Smart Contracts with Arc — in person, 05:00 PM IST Thu Nov 5, Workshop Room 1.

---

## Hedera — $15,000

EVM chain with Solidity or JS SDK; also SDKs for Java, Python, Rust, Go, Swift.

### AI Agents That Pay: x402 on Hedera — $6,500
1st $3,000 · 2nd $2,000 · 3rd $1,500

x402 revives HTTP 402 so a server quotes a price and a client pays inside an ordinary request. On Hedera, payments settle in HBAR or HTS tokens (incl. USDC) with low fixed fees and fast finality; the facilitator pays network fee. Build services that charge per request and agents that discover, compare and pay on their own.

Ideas: pay-per-call AI inference/data API; agent marketplace paying via x402; metered MCP server; budgeted research agent; creator micropaywalls; open-source Hedera x402 facilitator with safety checks and replay protection.

Requirements:
- At least one x402-protected endpoint settling on Hedera testnet/mainnet via a facilitator in Hedera docs (Official x402, Ax402, Blocky402) or your own
- Agent/client that finds the endpoint and completes at least one paid request end to end, no human approving
- Public GitHub repo with README (setup, architecture, payment flow, Hedera tx ID of a settled payment)
- Demo video ≤5 min showing payment settling and HashScan link

Extra points: spending controls (budgets, per-merchant limits, allowlists, human approval above threshold); agent identity/reputation (HCS-14 or ERC-8004); HCS topic as tamper-evident spend audit log; multi-agent negotiation (A2A/ACP); settling in HTS token such as USDC or HTS custom fees; recurring payments via Scheduled Transactions; Hedera Agent Kit or Network MCP.

Links:
- https://docs.hedera.com/solutions/ai/x402
- https://docs.hedera.com/solutions/ai/x402/how-it-works
- https://docs.hedera.com/solutions/ai/x402/pay-with-x402
- https://docs.hedera.com/solutions/ai/x402/merchant-integration
- https://docs.hedera.com/solutions/ai/x402/facilitators
- https://docs.hedera.com/solutions/ai/x402/exact-scheme
- https://github.com/x402-foundation/x402
- https://hedera.com/blog/hedera-and-the-x402-payment-standard/
- https://docs.hedera.com/solutions/ai/agent-kit
- https://docs.hedera.com/solutions/ai/hosted-mcp-server
- https://docs.hedera.com/solutions/tools/scaffold-hbar
- https://hedera.com/discord

### Tokenize Anything with Hedera Studios — $5,000
1st $2,500 · 2nd $1,500 · 3rd $1,000

Use Asset Tokenization Studio (ATS: security tokens, bonds, equities; ERC-3643, ERC-1400) or Stablecoin Studio (fiat-backed stablecoins with admin/reserve controls) to put a real-world asset or payment flow onchain.

Ideas: fractional invoices/receivables; tokenized bonds with onchain coupons; fractional gold/real estate/warehouse receipts; remittance stablecoin with compliance; secondary market/order book for ATS assets; x402 service selling NAV/price feeds.

Requirements: use ATS or Stablecoin Studio to issue/manage a tokenized asset or stablecoin; deploy and demo on Hedera testnet; public GitHub repo with contracts verified on HashScan; demo video ≤5 min covering issuance, configuration, and at least one lifecycle operation (coupon, redemption, freeze, reserve update).

Extra points: compliance controls (KYC, freezes, transfer restrictions, pauses); custom fees/distributions; oracle/NAV feeds; Scheduled Transactions; contributions back to ATS/Stablecoin Studio.

Links: https://docs.hedera.com/solutions/tokenization/ats · https://docs.hedera.com/solutions/tokenization/stablecoin · https://docs.hedera.com/solutions/tools/scaffold-hbar · https://hedera.com/discord

### "No Solidity Allowed": Build with Hedera SDKs — $2,000
Up to 2 teams get $1,000.

Complete app on Hedera with no smart contracts, using native services (HTS, HCS, scheduled/multi-sig transactions, accounts) via SDKs.

Requirements: Hedera JS/TS or Python SDK, no Solidity; at least two native services (e.g. HTS + HCS); public GitHub repo with README (setup/usage); demo video ≤5 min.

Extra points: coherent end-to-end UX; Mirror Node REST API; creative HCS use; Hedera Agent Kit; thoughtful security (key management, access controls).

Links: https://docs.hedera.com/hedera/sdks-and-apis · https://docs.hedera.com/learn/core-concepts/tokens/hts-overview · https://docs.hedera.com/reference/protobuf/consensus/consensus-service · https://docs.hedera.com/reference/rest-api · https://docs.hedera.com/solutions/ai/agent-kit · https://github.com/hedera-dev/hedera-code-snippets · https://hedera.com/discord

### Built on Hedera (Continuity Track) — $1,500 **[Continuity]**
Up to 2 teams get $750. Move an existing Hedera project forward significantly (polish/bug fixes alone don't qualify).

Requirements: project built for a previous hackathon or already on Hedera; substantive new work (features, new Hedera services, major architecture change); public repo with README separating before vs new (commit history/diff ideal); demo video ≤5 min focused on new work.

Workshop: Hedera X Claude Code — AI Skills for Hackathons — in person, 03:30 PM IST Thu Nov 5, Workshop Room 2.

---

## Arkiv — $15,000

Arkiv is the Web3 database, an Ethereum-aligned DB-Chain. Entities are owned by a wallet, queried with SQL-like filters, and expire when you choose.

Testnet info:
- RPC: https://rpc.rabdi.db-chain.testnet.arkiv.network
- Explorer: https://rabdi.explorer.arkiv.network
- Indexer: https://indexer.rabdi.db-chain.testnet.arkiv.network
- Faucet: https://hub.arkiv.network/faucet
- Access keys: https://hub.arkiv.network/access-keys
- Chain ID: 7794095

Each team can win one Arkiv track prize; the Arkiv + Swarm bonus can come on top. Arkiv prizes count as one partner prize on ETHGlobal (don't use another of your three picks).

### Mirror something Ethereum depends on — $4,000
1st $3,000 · 2nd $1,000

Mirror public data Ethereum apps/devs rely on into Arkiv entities anyone can query. Example: Sourcify mirrored at sourcify.arkiv.network (7.9M verified contracts). Ideas: token lists, chain/RPC registries, address labels, wallet ratings, function signatures.

Judging (25% each): Arkiv feedback `/arkiv/friction.md` · Reach `/arkiv/reach.md` · Why Arkiv `/arkiv/why-arkiv.md` · Data quality `/arkiv/data-quality.md`

Requirements:
- Built from scratch at ETHGlobal Mumbai
- Data license allows republishing (link in README); not Sourcify data
- Import script in repo and re-runnable
- Writes to Arkiv testnet with @arkiv-network/sdk or JSON-RPC; a feature/query reads data from Arkiv
- README: writer wallet address(es) + one runnable query
- `/arkiv/schema.md` (entities, queried fields, owners, expiry) and `/arkiv/friction.md`
- One file per judging criterion at the path shown
- Public repo, open-source license; state AI usage

Links: https://sourcify.arkiv.network · https://docs.arkiv.network

### Build on Arkiv (from scratch) — $4,000
1st $3,000 · 2nd $1,000

New app whose data lives in Arkiv. Directions: agents (ephemeral tasks/bids/claims); markets (expiring listings); publishing/media; names and identity (ENS-keyed profiles).

Judging (25% each): friction.md · Reach `reach.md` · Why Arkiv `why-arkiv.md` · How you use Arkiv `how-you-use-arkiv.md`

Requirements: built from scratch; writes to Arkiv testnet and at least one user-visible feature reads from Arkiv; README with writer wallets + one query; schema.md + friction.md + one file per criterion; public open-source repo; state AI usage. Not counted: SDK installed but never used to read, or Arkiv as a log nothing reads.

Links: https://docs.arkiv.network · https://hub.arkiv.network/ai-tools

### Build on Arkiv (existing projects) — $4,000 **[Continuity]**
1st $3,000 · 2nd $1,000

Move part of an existing product's data into Arkiv. Directions: user-owned data; shared expiring state; agent coordination state. Same judging criteria as from-scratch. The Arkiv part must be new work; README states what existed before vs added (only additions judged). Other requirements same as from-scratch.

### Node tooling — $2,000
Tool for people who run Arkiv nodes. Directions: operator dashboard (collector next to node: days until disk full with alert, requests/latency per method, peers, sync, CPU/memory); slow query finder (own node only, never public endpoint). Reference: nodes.arkiv.network.

Judging (25% each): friction.md · Real use `real-use.md` · What's new `whats-new.md` · Easy to run `easy-to-run.md`

Requirements: new repo from scratch (a PR to an existing repo isn't); works against an Arkiv node in demo (local OK); README says which node and how to reproduce; if writing entities, include wallets + schema.md; friction.md; one file per criterion; slow query shapes go to Arkiv privately (at the booth), never in the public repo/friction.md/demo; public open-source repo; state AI usage.

Links: https://nodes.arkiv.network · https://github.com/Arkiv-Network/arkiv · https://docs.arkiv.network

### Arkiv + Swarm bonus (from scratch) — $500
Use Swarm (ethswarm.org) meaningfully (e.g. user files on Swarm, referenced from Arkiv entities; or encrypted uploads). On top of any track prize. Select this bonus when submitting to Mirror, Build on Arkiv or Node tooling.

Requirements: uses both Arkiv and Swarm; `/arkiv/swarm.md` covering: what's on Swarm vs Arkiv and which entity field holds the reference/feed; one Arkiv entity key and its Swarm reference (openable link); postage stamp batch ID, wallet that bought it (or who gave it), Bee node/service used; repo files that upload/read; steps to run one upload and one read; demo video moment; what got in your way.
Careful: an encrypted Swarm reference contains its key and Arkiv entities are public — encrypt first or keep off Arkiv.

Links: https://www.ethswarm.org · https://docs.ethswarm.org

### Arkiv + Swarm bonus (existing projects) — $500 **[Continuity]**
Same, for the Swarm-with-Arkiv work added at Mumbai; select when submitting to Build on Arkiv (existing projects). `swarm.md` states what existed before.

Resources: https://docs.arkiv.network · https://hub.arkiv.network · https://hub.arkiv.network/ai-tools · https://discord.gg/arkiv

---

## Whitechain — $15,000

EVM L2 on the OP Stack ("The Onchain Economy Layer"), mainnet in November. Here with Optimism.

Common requirements for tracks 1–3 and Continuity:
- Contracts deployed on Whitechain Sepolia (chain ID 1874) and verified on the Whitechain explorer
- At least one payment in USDT (`0xcedfB56113143d55b2358b8CFbB0dEB5Ad2f55a7`) settled in main flow, explorer link in README (self-minted test tokens don't count)
- README line on why this flow needs onchain stablecoin settlement on Whitechain vs a regular payment rail
- Public GitHub repo showing steady progress (not one big upload); README with setup, architecture, limitations
- Demo video 2–4 min showing each party
- `WHITECHAIN_FEEDBACK.md` (what worked, where stuck, docs gaps)

Test tokens (WBT, USDT) have no monetary value. Prizes paid by ETHGlobal in USDC. Free Ankr RPC for hackers (1,500 rps for 7 days): https://www.ankr.com/rpc/?utm_referral=Whitechain2026

### Operate · Stablecoin Payments for Business — $5,000
1st $2,500 · 2nd $1,500 · 3rd $1,000

Everything a business needs to get paid in USDT on Whitechain, first checkout onward. Ideas: drop-in checkout with order webhooks and onchain receipt; payment links/invoices with due dates and reminders; subscriptions with permit-based pulls; refunds/partial refunds with customer-checkable record.
Want: a drop-in piece (widget/SDK/payment-link API/plugin) a separate demo app adds in ~20 lines; both merchant and customer views; extra credit for flows past first payment (refund, renewal, accountant export).
Won't place: plain-transfer pay button, tipping jars, bill splitters, custodial bridges to local currency tokens, payroll/escrow/revenue splits alone.

### Tokenize · Real World Finance on Whitechain — $4,000
1st $2,500 · 2nd $1,500

Model RWA lifecycles and compliance onchain, all payments in USDT. Ideas: tokenized bonds/notes with investor allowlist, USDT coupons, repayment at maturity; invoice financing with auto settlement on due date; repo/short-term lending with delivery-versus-payment; trade finance with multi-party confirmations.
Want: transfer rules enforced in contract (allowlists, restrictions, maturity/settlement conditions); clear issuer/investor/business user and at least one full lifecycle step.
Won't place: mint button with no rules; ownership NFTs with nothing enforced. (Paying an invoice → Operate; financing/selling an invoice → Tokenize.)

### Scale · Payments Nobody Notices — $3,000
1st $2,000 · 2nd $1,000

Payer (person or AI agent) pays in stablecoins without holding WBT for gas, a seed phrase, or knowing the chain. Ideas: gasless checkout with permit / EIP-3009 and own relayer; embedded wallet/smart account supporting chain 1874; pay-per-request APIs via x402 with your own facilitator.
Want: zero visible crypto steps for payer; explain how the business pays gas, how the relayer gets WBT, and what prevents draining.
Won't place: payer signs gas-costing tx; AI chats that never pay anyone.

### Continuity · Bring Your Product to Whitechain — $3,000 **[Continuity]**
1st $1,500 · 2nd $1,500

Add Whitechain to an existing product (accept USDT, move a feature onchain, deploy contracts). Want real progress this weekend; real users/business count in favour. Won't place: repackaged pre-hackathon work.
Extra requirements: proof of starting point (dated pre-hackathon commit or earlier submission page); README "before and during" section.

Resources: Docs https://docs.whitechain.io · Faucet https://faucet.testnet.whitechain.io · Explorer https://explorer.testnet.whitechain.io · Builders Program https://whitechain.io/builders · YetiTrade testnet https://testnet.yetitrade.fi · https://optimism.io · https://docs.optimism.io · https://x.com/Optimism

Workshop: How to Win on Whitechain, Tracks and Tips — in person, 04:30 PM IST Thu Nov 5, Workshop Room 2.

---

## Ethereum Foundation — $15,000

Access Layer team builds CROPS tooling (censorship resistant, open source, private, secure). Two pieces at Mumbai: Anon-RPC (anonymizes RPC reads) and the alternative mempool for EIP-8141 frame transactions. **One EF prize per project** (EF judges place you in at most one).

### Best Use of Anon-RPC — $5,000
1st $2,500 · 2nd $1,500 · 3rd $1,000

Use Anon-RPC as an app consumer, build a new Anon-RPC worker, or both; or implement/fork the harness for a new/existing platform.
Ideas: portfolio dashboard; block explorer; fork of an existing dApp; network health checker/playground; combine with light client/proof verification; new network; new harness.
Judging: works end to end; UX in demo; share of app traffic through Anon-RPC (intentional exclusions OK if stated); shippable after hackathon; technical depth.
Requirement: app routes RPC reads through Anon-RPC by default (workers/harness: simple demo app is enough).

Links: https://ethereum.github.io/anon-rpc/ · /wallets/ · /networks/ · https://github.com/ethereum/anon-rpc · https://www.npmjs.com/package/@anon-rpc/browser-harness · https://www.npmjs.com/package/@anon-rpc/browser-extension-harness

### Best use of the Frame Transaction Alternative Mempool — $5,000
1st $2,500 · 2nd $1,500 · 3rd $1,000

EIP-8141 frame transactions give native account abstraction; the public mempool accepts only simple ones. The alt mempool (ERC-8421) takes the rest with ERC-7562-style staking/reputation rules.
Areas: (1) things only an alt mempool enables — verification budget >100k (PQ-secure wallets/privacy protocols), flexible state access in sender/paymaster (ERC20 paymasters, daily quota paymasters); (2) dev tooling — viem/ethers SDK, admission simulator, mempool monitoring; (3) break/improve the rules — DoS vectors, new rules, simulators, fuzzers.
Judging: creativity, usefulness, practicality, how well it works, relation to alt mempool. Devnets with keyed nonces and recent roots plus faucet; Pierre and Alex from the team on site.
Requirement: link to your admitted tx on devnet explorer or code that submits one; be able to explain design/code/trade-offs.

Links: https://github.com/forshtat/mempool-workshop-sidecar · https://github.com/forshtat/ethrex/tree/eip8141-tracer · https://explorer.altmempool.wtf/ · https://docs.altmempool.wtf/guides/devnet/ · https://docs.altmempool.wtf/ · https://github.com/forshtat/mempool-workshop

### Best CROPS App — $3,500
1st $2,000 · 2nd $1,000 · 3rd $500

App, wallet feature or dev tool where one CROPS property is the reason it exists, without giving up the other three. Ideas: wallet recoverable with nothing from you; frontend that survives losing domain/backend/RPC; server learns nothing about who talks to whom; tool showing what an app leaks; tool proving shipped frontend/extension matches the repo.
Judging: works end to end; depth of lead property (structural beats cosmetic); other three hold or trade-offs stated; UX; shippable.
Requirements: public repo under free/open-source license, README with run instructions; README section titled **CROPS** (C: what you control that users depend on and what happens if it goes away; O: license and buildable from repo alone; P: what each third party learns; S: key/data protection and trust assumptions); demo video ≤3 min showing lead property end to end (e.g. switch off backend, swap RPC, show logs with nothing identifying); no third-party trackers/analytics in client; keys/personal data stay on device (or README explains why not).

Links: https://blog.ethereum.org/2026/03/13/ef-mandate · https://github.com/scaffold-eth/scaffold-eth-2 · https://scaffoldeth.io · https://ethereum.github.io/anon-rpc/ · https://github.com/ethereum/kohaku · https://walletbeat.eth.limo · https://www.altmempool.wtf/

### Best CROPS Upgrade to an Existing Project — $1,500 **[Continuity]**
Add one CROPS property to an existing project during the hackathon (recovery needing nothing from you, frontend surviving loss of domain/RPC, server that learns nothing, verifiable build). Show before and after. Only new work judged. Same criteria and requirements as CROPS App, plus README states what the project looked like before and which property is new; demo shows before/after.

Resources: https://github.com/ethereum/anon-rpc · https://docs.altmempool.wtf/ · https://explorer.altmempool.wtf/ · https://eips.ethereum.org/EIPS/eip-8141 · https://eips.ethereum.org/EIPS/eip-7562

Workshop: Building with Anon-RPC and the alt mempool — in person, 05:00 PM IST Thu Nov 5, Workshop Room 2.

---

## ENS — $10,000

ENS turns addresses into portable onchain identities; as AI agents become onchain actors, ENS gives them names, reputation and discoverability.

### Best Use of ENSv2 — $7,000
1st $3,000 · 2nd $2,000 · 3rd $1,000 · 3rd $1,000

ENSv2 is live on Ethereum mainnet. Explore the hierarchical registry: wildcard resolution of subnames from a parent's resolver; your own subname registry; Enhanced Access Control (role-based, e.g. edit only certain text records); per-subname Permissioned Resolvers; record aliasing and namespace aliasing; expiring/revocable/non-transferable/transferable/"forever" subnames. Bonus points for AI agents (agents as namespaces with their own identity and permissions).

Requirements: built on ENSv2 on Ethereum mainnet or Sepolia; ENSv2 features central, not cosmetic; functional demo (no hard-coded values); showcase has a live demo link; open-source code on GitHub or similar.

Links: https://docs.ens.domains/ensv2/permissioned-registry · /permissioned-resolver/ · /enhanced-access-control/ · /tutorial-contract-developers/

### Best Integration of ENSv2 into an Existing Project — $3,000 **[Continuity]**
1st $2,000 · 2nd $1,000

Plug ENSv2 (registry hierarchy, EAC, Permissioned Resolvers, aliasing) into an existing protocol/project (yours or open) on Ethereum mainnet. Must clearly improve the project; functional demo; live demo link; open source.

Link: https://docs.ens.domains/ensv2/tutorial-app-developers/

Resources: https://docs.ens.domains/ensv2/overview/ · https://github.com/ensdomains/ens-cli · https://docs.ens.domains/ensip/26/ (Agent Text Records) · https://docs.ens.domains/building-with-ai/ · https://docs.ens.domains/ensip/25/ (AI Agent Registry ENS Name Verification)

Workshop: ENSv2 — Identity for Apps, Agents & Beyond — in person, 04:00 PM IST Thu Nov 5, Workshop Room 1.

---

## Definitive — $5,000

Onchain trading platform (900+ liquidity sources across 12 EVM chains + Solana; advanced orders DCA, Limit, Stop Loss, Take Profit, Cross-Chain, Bracket, Market). Flash API exposes the engine via a REST API and MCP server for humans and AI agents.

### Best Use of Flash Advanced Orders in a Social App — $2,500
Best social trading agent/app on Flash's advanced orders: copy trading; signals/leaderboards shared to X/TikTok; agent-run products (e.g. Grok bot) others follow; any shared-trading experience.
Tips: Flash is non-custodial and works with any EOA or embedded wallet (Privy, Dynamic, Coinbase); all order types (DCA, Limit, Stop Loss, Stop Buy, Take Profit, TWAP, Bracket) go through the same orders endpoint; you can attach a fee to every routed trade; AI-native with MCP server and LLM-optimized docs.
Requirements: working trading flow powered by Flash API/MCP advanced orders; onchain execution shown in final demo; short demo video on both Discord and X, tag @DefinitiveFi.

### Most Creative Use of Definitive Flash Advanced Orders — $2,500 **[Continuity]**
Take Flash's advanced orders somewhere unexpected: bigger agent workflows, paired with other protocols' tools, new strategies (multi-agent systems, voice/chat trading interfaces, combos with other MCP servers/onchain data). Judged on originality, technical creativity, demo quality. Same tips and requirements.

Links: https://flash.definitive.fi/docs · /docs/getting-started · /docs/for-agents · /docs/flash-mcp · /docs/placing-orders · /docs/api-reference/flash/quote · /docs/api-reference/flash/order · /docs/monetizing-your-integration

---

## Chainlink — $5,000

### Best workflow with CRE — $1,500
Build, simulate, or deploy a CRE (Chainlink Runtime Environment) workflow used as an orchestration layer in your project. Simulation is enough; deployment not mandatory.
Workflow should: integrate at least one blockchain with an external API/system/data source/LLM/AI agent; show a successful simulation (CRE CLI) or live deployment; be meaningfully used in the project.

Links: https://docs.chain.link/cre · https://www.youtube.com/playlist?list=PLVP9aGDn-X0S-JmwQKGTao6o_CMitvv2_ · https://github.com/smartcontractkit/cre-templates/

### Best use of Chainlink CCIP 2.0 — $3,500
Up to 2 teams get $1,750.

Build with CCIP 2.0 (token transfers and arbitrary messaging across chains). Use cases: cross-chain DeFi with multi-chain liquidity; cross-chain yield aggregator; CCIP-powered token bridge; multihop CCIP router. Use the CCIP Local Simulator (Hardhat/Foundry/Remix) and the faucet.
Requirement: must use CCIP inside smart contracts to make a state change on a blockchain (a frontend only reading Data Feeds doesn't count). Encouraged: CRE, Data Feeds, Data Streams, VRF.

Links: https://docs.chain.link/ccip · https://www.youtube.com/watch?v=jt2fM84DGVE
