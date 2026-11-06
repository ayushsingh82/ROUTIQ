# StealthRadar — Product, Problem & Technical Specification

> **Project note (added when saved):** this is the product brief shared as context. Where it conflicts with decisions made later, the later decision wins. In particular, §15 asks for amber accents; the shipped design uses the brand tokens landing `#FEFEFE` / black, dashboard `#262626` / `#F4FEF8`, highlight `#00EC97`, with a left-sidebar dashboard. See `PLAN.md` for status and `SPEC.md` / `BLUEPRINT.md` for the earlier specs.

## 1. Product Overview

**Product name:** StealthRadar
**Category:** Privacy-first Ethereum wallet / stealth-payment management
**Network:** Ethereum Sepolia (hackathon MVP)
**Core standard:** ERC-5564 (Stealth Addresses)
**Privacy infrastructure:** Ethereum Anon-RPC (Nox, Tor-js or Nym, subject to actual worker availability)

### One-line pitch

**StealthRadar makes private crypto payments discoverable and manageable without sacrificing the privacy they were designed to provide.**

### Product positioning

StealthRadar is a privacy-first wallet that allows users to create stealth identities, receive payments through unique one-time addresses, automatically discover incoming payments, and manage them through one unified dashboard.

Blockchain reads are routed through Anon-RPC, while payment matching happens locally on the user's device using their viewing key.

We are not building another general-purpose wallet or merely an RPC scanner. We are building a usable wallet experience for ERC-5564 stealth payments.

---

# 2. The Problem We Are Solving

## The problem with conventional Ethereum payments

Ethereum transactions are publicly visible. When someone receives payments through a conventional wallet address, anyone can monitor that address and potentially:

- Track incoming and outgoing transactions.
- See wallet balances and transaction history.
- Associate multiple payments with the same receiving address.
- Build a picture of someone's financial activity.
- Monitor the address continuously.

This creates a financial privacy problem for individuals, freelancers, businesses and anyone who does not want their payment history publicly associated with one reusable address.

## What ERC-5564 solves

ERC-5564 introduces stealth addresses.

Instead of repeatedly receiving funds at one public wallet address, a recipient can share a stealth meta-address. Senders use it to derive a unique one-time receiving address for each payment.

This makes it harder for outside observers to connect multiple payments to the same recipient simply by looking at the receiving addresses.

## The missing piece

Stealth addresses introduce a usability challenge.

If a user receives payments at many different one-time addresses:

- How do they discover all incoming payments?
- How do they know which addresses belong to them?
- How do they track their total received funds?
- How do they check transaction confirmations?
- How do they manage and spend funds across those addresses?

Users need to scan public blockchain announcements to discover incoming stealth payments.

But when they use conventional RPC providers, their IP address and repeated blockchain queries can potentially be linked. This may expose which stealth-payment activity they are monitoring.

**StealthRadar solves the discovery and management problem while adding privacy to the scanning process.**

---

# 3. Why Would Someone Use StealthRadar?

We need to sell the user benefit, not the underlying cryptography.

### Use case 1: Freelancers and independent developers

A freelancer wants to accept multiple crypto payments without exposing one permanent receiving address and making their entire payment history easy to track.

With StealthRadar:

- Generate one stealth identity.
- Share the meta-address with clients.
- Each client payment goes to a unique stealth address.
- Automatically discover incoming payments.
- Manage all payments in one inbox.

### Use case 2: Privacy-conscious individuals

Someone wants to receive crypto without making it easy for every sender or observer to connect all their incoming payments.

With StealthRadar:

- Share a stealth meta-address.
- Receive payments at one-time addresses.
- Discover payments locally.
- Keep their viewing key on their device.

### Use case 3: Businesses accepting crypto

A business wants to accept payments through unique receiving addresses without manually tracking multiple addresses.

With StealthRadar:

- Create a stealth identity.
- Generate and share a reusable meta-address.
- Discover payments automatically.
- Manage incoming payments from one dashboard.

These are potential use cases, not claims that StealthRadar already provides complete business payment infrastructure.

---

# 4. Our Solution

**StealthRadar = A private wallet and unified inbox for stealth transactions.**

The user journey:

1. CREATE: Generate an ERC-5564 stealth identity.
2. RECEIVE: Share a stealth meta-address with anyone who wants to pay.
3. DISCOVER: Automatically scan blockchain announcements and discover payments sent to the user's stealth addresses.
4. VERIFY: Verify the actual ETH or token transfer instead of trusting announcement metadata alone.
5. MANAGE: View payment history, balances, confirmations and transaction details in one dashboard.
6. PROTECT: Route blockchain reads through Anon-RPC and perform matching locally.

### Our key differentiator

ERC-5564 helps users receive payments through unique one-time addresses.

StealthRadar makes those payments easy to discover and manage without directly exposing the user's IP address to the RPC endpoint alongside their scanning activity.

**We are making private crypto payments practical to use.**

---

# 5. What We Are Building

We should build a dedicated stealth-wallet dashboard, not another MetaMask clone.

The product should focus on five primary capabilities.

## A. Stealth Identity

Users can:

- Generate a spending keypair.
- Generate a viewing keypair.
- Create an ERC-5564 stealth meta-address.
- Copy and share their meta-address.
- Display a QR code.
- Import an existing compatible stealth identity.
- Encrypt and back up their identity locally.

Never expose private keys by default.

## B. Private Payment Inbox

This is the main product screen.

Users can:

- View all discovered incoming payments.
- See ETH/token amounts.
- See stealth receiving addresses.
- View transaction hashes.
- Check confirmation status.
- Filter by asset or status.
- View total verified received value.
- Open transaction details.

Only show a payment as verified after independently checking the actual transfer.

## C. Payment Discovery Scanner

The scanner:

- Retrieves ERC-5564 Announcement events.
- Processes events incrementally.
- Uses the local viewing key to derive shared secrets.
- Checks view tags before full address derivation.
- Matches the derived stealth address against the announced address.
- Stores matching results locally.
- Tracks scan progress and errors.

The scanning process must not send private keys or viewing keys to any server.

## D. Funds and Transaction Management

Users can:

- See balances across discovered stealth addresses.
- View received ETH.
- View supported ERC-20 tokens.
- Inspect transaction details.
- Access the matching stealth account's signing capability.
- Send funds from a stealth address when spending support is implemented.

Spending must use the correct derived stealth private key and a locally controlled signing flow.

## E. Privacy Center

Display:

- Current chain.
- Active Anon-RPC network.
- Worker initialization status.
- Worker verification status, if supported by the API.
- Number of blockchain requests routed through Anon-RPC.
- Bootstrap requests made directly, if any.
- Failed requests.
- Privacy mode status.
- Last successful scan.

Do not fabricate privacy metrics.

If the anonymizing worker is unavailable, fail closed instead of silently using direct RPC.

---

# 6. Main Dashboard Screens

## Screen 1: Dashboard

Purpose: Give the user an overview of their stealth wallet.

Display:

- Total verified received amount.
- Total discovered payments.
- Number of stealth addresses discovered.
- Recent transactions.
- Current network.
- Anon-RPC connection status.
- Last scan time.
- Start scan button.
- Receive payment shortcut.
- Send payment shortcut.

## Screen 2: Payment Inbox

Purpose: Central place for all incoming stealth payments.

Display:

- Payment amount.
- Token symbol.
- Stealth address.
- Transaction hash.
- Block number.
- Timestamp.
- Confirmation status.
- Verified/unverified state.

Filters:

- All payments.
- ETH.
- ERC-20 tokens.
- Confirmed.
- Pending.
- Unverified.

## Screen 3: Stealth Identity

Purpose: Generate and manage the user's stealth identity.

Display:

- Spending public key.
- Viewing public key.
- Stealth meta-address.
- QR code.
- Copy/share functionality.
- Encrypted backup status.

Private keys must remain local and must not be exposed in the normal UI.

## Screen 4: Scanner

Purpose: Show the payment-discovery process.

Display:

- Scan status.
- Starting block.
- Latest scanned block.
- Current block.
- Events scanned.
- View-tag matches.
- Full cryptographic matches.
- Verified payments.
- Errors and retries.
- Start/stop controls.

## Screen 5: Privacy Center

Purpose: Demonstrate the Anon-RPC integration.

Display:

- Active worker/network.
- Worker readiness.
- Anonymization mode.
- Total routed reads.
- Direct bootstrap reads.
- Failed requests.
- Last successful request.
- Privacy mode enabled/disabled.

Clearly distinguish a real anonymizing worker from a passthrough/reference worker.

## Screen 6: Send Payment

Purpose: Demonstrate the sender side of ERC-5564.

User enters:

- Recipient stealth meta-address.
- Asset.
- Amount.

Display:

- Derived one-time stealth address.
- Ephemeral public key.
- Payment details.
- Transaction confirmation.
- Announcement transaction status.

Use a connected wallet for the sender's transaction.

## Screen 7: Transaction Details

Display:

- Stealth address.
- Asset.
- Amount.
- Transfer transaction hash.
- Announcement transaction hash.
- Block number.
- Timestamp.
- Confirmation count.
- Transfer verification.
- Explorer link.

Do not assume the announcement transaction and transfer transaction are the same transaction.

## Screen 8: Security and Backup

Display:

- Vault encryption status.
- Lock/unlock controls.
- Encrypted backup export.
- Import/restore.
- Local data deletion.
- Recovery instructions.

## Screen 9: Settings

Display:

- Network selection.
- Scanner range.
- Auto-scan settings.
- Confirmation threshold.
- Local storage settings.
- Privacy mode.

---

# 7. Technical Architecture

## High-level architecture

```
                USER
                 |
                 v
         STEALTHRADAR UI
                 |
        +--------+--------+
        |                 |
        v                 v
   LOCAL VAULT       WALLET CONNECT
        |                 |
        v                 v
   Viewing Keys      Sender Transactions
        |
        v
  LOCAL SCANNER
        |
        v
  ANON-RPC WORKER
        |
        v
   ETHEREUM SEPOLIA
        |
        v
  ERC-5564 ANNOUNCER
        |
        v
  ANNOUNCEMENT EVENTS
        |
        v
  LOCAL CRYPTO MATCHING
        |
        v
  TRANSFER VERIFICATION
        |
        v
  PRIVATE PAYMENT INBOX
```

## Main architectural principles

1. No centralized backend for private payment discovery.
2. No server-side viewing-key matching.
3. Private keys never leave the user's device.
4. Blockchain reads go through Anon-RPC in privacy mode.
5. No silent direct-RPC fallback.
6. All discovered payments are independently verified.
7. Store scan history locally.
8. Keep the application open source.

---

# 8. ERC-5564 Technical Flow

ERC-5564 is the core stealth-address standard.

A stealth identity consists of:

- Spending keypair.
- Viewing keypair.
- Public stealth meta-address.

The recipient shares the meta-address publicly.

## Sender flow

1. Sender receives the recipient's stealth meta-address.
2. Parse the recipient's spending and viewing public keys.
3. Generate a fresh ephemeral private/public keypair.
4. Derive an ECDH shared secret using the ephemeral private key and recipient viewing public key.
5. Apply the exact scheme-specific shared-secret hashing and derivation.
6. Derive a unique stealth address.
7. Derive the view tag.
8. Send ETH or tokens to the stealth address.
9. Publish an ERC-5564 Announcement event.

## Recipient flow

1. Retrieve Announcement events.
2. Read the ephemeral public key from each announcement.
3. Use the local viewing private key to derive the shared secret.
4. Calculate the expected view tag.
5. Skip announcements with a mismatching view tag.
6. Derive the expected stealth address for matching candidates.
7. Compare it with the announced stealth address.
8. Treat a full cryptographic address match as a discovered stealth payment.
9. Verify the actual ETH/token transfer independently.
10. Store the verified result locally.

A view-tag match is only a preliminary filter. It is not proof that the payment belongs to the user.

---

# 9. ERC-5564 Contract

Official Announcer address to validate on Sepolia:

```
0x55649E01B5Df198D18D95b5cc5051630cfD45564
```

Announcement event:

```
event Announcement(
    uint256 indexed schemeId,
    address indexed stealthAddress,
    address indexed caller,
    bytes ephemeralPubKey,
    bytes metadata
);
```

Scheme ID:

- Scheme 1: secp256k1.

The ERC-5564 standard defines the cryptographic derivation and announcement process.

Important:

- Confirm deployed bytecode before using the contract.
- Confirm scheme support.
- Follow the official standard's exact key and metadata encoding.
- Do not invent metadata formats.
- Do not assume every Announcement corresponds to a successful payment.

ERC-6538 registry is optional for the MVP. We can allow users to generate and share meta-addresses directly without implementing registry functionality.

---

# 10. Anon-RPC Integration

Anon-RPC is a key part of the technical innovation.

Its purpose is to reduce the ability of a conventional RPC endpoint to directly associate a user's IP address with their blockchain queries.

Official references:

- https://ethereum.github.io/anon-rpc/
- https://github.com/ethereum/anon-rpc
- npm: `@anon-rpc/browser-harness`
- npm: `@anon-rpc/browser-extension-harness`

## Integration requirements

Use the official browser harness and verify the actual API before implementation.

All application blockchain reads must go through the Anon-RPC transport.

Examples:

```
eth_chainId
eth_blockNumber
eth_getLogs
eth_getTransactionByHash
eth_getTransactionReceipt
eth_getBalance
eth_call
eth_getBlockByNumber
```

Use a centralized RPC abstraction to prevent hidden direct-RPC requests.

## Fail-closed privacy

If the anonymizing worker fails to initialize:

- Stop blockchain reads.
- Show an error in the UI.
- Explain that the privacy transport is unavailable.
- Do not silently fall back to direct RPC.

A bootstrap RPC may be needed for initialization. Document exactly when and why it is used.

Do not use a passthrough/reference worker and claim it provides anonymity.

## Important privacy limitations

Anon-RPC does not:

- Hide public blockchain transactions.
- Hide the existence of stealth addresses.
- Hide transaction amounts or timing.
- Guarantee complete anonymity.
- Protect against every network-level adversary.

Describe its actual threat model accurately.

---

# 11. Blockchain Data Sources

Core data should come directly from Ethereum Sepolia through Anon-RPC.

| Data                  | Source                         |
| --------------------- | ------------------------------ |
| Announcement events   | ERC-5564 Announcer             |
| Transaction details   | eth_getTransactionByHash       |
| Transaction receipts  | eth_getTransactionReceipt      |
| ETH balances          | eth_getBalance                 |
| ERC-20 balances       | balanceOf via eth_call         |
| Token symbol          | symbol via eth_call            |
| Token decimals        | decimals via eth_call          |
| Transfer history      | ERC-20 Transfer logs           |
| Block timestamps      | Block data                     |
| Stealth identity      | Locally generated              |
| Viewing key           | Local encrypted vault          |
| Shared secret         | Local cryptographic derivation |
| View tag              | Local cryptographic derivation |
| Stealth address match | Local cryptographic derivation |
| Payment history       | Local database                 |

Do not rely on a centralized indexing backend for the core private discovery process.

---

# 12. Payment Verification

This is especially important for correctness.

## ETH

A matching Announcement event is not sufficient proof of a payment.

Verify:

- Actual transaction to the stealth address.
- Successful transaction receipt.
- Correct amount.
- Correct transaction status.
- Appropriate relationship between the transfer and announcement.

For the demo sender, store both transfer and announcement transaction hashes locally.

For externally initiated payments, correlate the announcement with independently observed transfers. If the relationship is ambiguous, show "Matched — payment unverified" rather than claiming a verified payment.

## ERC-20

Verify:

- Token contract address.
- Transfer event.
- Recipient stealth address.
- Actual amount.
- Token decimals.
- Successful transaction receipt.

Never trust announcement metadata alone as the authoritative payment amount.

## Reorganizations

Support:

- Confirmation thresholds.
- Rechecking recent blocks.
- Removing or updating transactions affected by chain reorganizations.
- Deduplication by transaction hash and log index.

---

# 13. Security Requirements

Security is central to the product.

- Keep viewing and spending private keys on-device.
- Use secure random generation.
- Use Web Crypto APIs for encryption.
- Encrypt private keys before storing them.
- Use AES-GCM with a suitable password-based KDF.
- Never store plaintext private keys in localStorage.
- Prefer IndexedDB for encrypted local storage.
- Keep scanning and matching local.
- Never send private keys to RPC, workers, servers or analytics.
- Provide vault locking.
- Provide encrypted backup and restore.
- Avoid third-party tracking, analytics and session replay.
- Do not log secrets or derived sensitive material.

Use a reputable, audited cryptographic implementation for secp256k1 and validate it against the ERC-5564 scheme.

---

# 14. Recommended Technology Stack

| Layer         | Technology                |
| ------------- | ------------------------- |
| Frontend      | Next.js App Router        |
| Language      | TypeScript                |
| Styling       | Tailwind CSS              |
| Wallet        | wagmi + viem              |
| RPC privacy   | @anon-rpc/browser-harness |
| Cryptography  | Audited secp256k1 library |
| Encryption    | Web Crypto API            |
| Local storage | IndexedDB                 |
| UI icons      | Lucide                    |
| Chain         | Ethereum Sepolia          |

No backend is required for private scanning or local payment matching.

---

# 15. Visual Design Direction

The product should feel like a premium privacy-focused crypto wallet.

### Theme

- Dark black / charcoal background.
- Amber/orange accents. *(superseded: shipped with `#00EC97` highlight, see project note)*
- Clean typography.
- Subtle borders.
- Premium dashboard layout.
- Minimal unnecessary gradients.
- Strong contrast.
- Clear privacy status indicators.

### Layout

Left sidebar:

- Dashboard
- Inbox
- Scanner
- Send
- Identity
- Privacy Center
- Settings

Main area:

- Wallet overview.
- Total verified received.
- Payment activity.
- Scanner status.
- Privacy status.
- Quick actions.

The Inbox and Dashboard are the most important screens.

Avoid building a generic DeFi analytics dashboard.

---

# 16. Hackathon MVP Scope

Focus on one complete, working end-to-end experience.

### Must-have

1. Generate an ERC-5564 stealth identity.
2. Display and share a stealth meta-address.
3. Connect a sender wallet.
4. Send Sepolia ETH to a derived stealth address.
5. Publish an Announcement event.
6. Retrieve announcements through a genuine Anon-RPC worker.
7. Perform local cryptographic matching.
8. Verify the actual ETH transfer.
9. Display the payment in a unified inbox.
10. Display privacy transport status.

### Nice-to-have

- ERC-20 support.
- Multiple stealth identities.
- Encrypted export/import.
- Auto-scanning.
- Spending from stealth addresses.
- More EVM chains.

Do not spend time building unrelated functionality such as swaps, staking, bridges or generic DeFi analytics.

A complete receive → discover → verify experience is more valuable than many incomplete features.

---

# 17. The Demo Story

This is the most important part of the hackathon presentation.

### Scenario

Alice wants to receive ETH privately.

**Step 1 — Create identity**

Alice opens StealthRadar and generates her stealth identity.

She copies her stealth meta-address and shares it with Bob.

**Step 2 — Send payment**

Bob opens the sender flow, enters Alice's meta-address and sends her 0.1 Sepolia ETH.

The payment is sent to a unique one-time stealth address.

Bob publishes the corresponding Announcement event.

**Step 3 — Discover payment**

Alice opens StealthRadar and clicks "Scan for payments".

The app retrieves blockchain announcements through Anon-RPC.

Her browser uses her local viewing key to identify the matching announcement.

**Step 4 — Verify**

StealthRadar independently checks the actual ETH transfer and its successful receipt.

**Step 5 — Show the result**

Alice sees:

- 0.1 ETH received.
- Matching stealth address.
- Transaction hash.
- Confirmation status.
- Verified payment status.
- Updated wallet overview.

The judge should see the entire flow happen live.

---

# 18. The Final Pitch

## StealthRadar — Private payments. One unified wallet.

Every Ethereum transaction is public. Anyone can monitor a wallet address and build a picture of its financial activity.

Stealth addresses help solve this by giving every payment a unique receiving address. But they introduce another problem: users need a way to discover and manage payments spread across multiple addresses without compromising their privacy.

**StealthRadar makes that possible.**

We are building a privacy-first wallet that lets users create stealth identities, receive payments at unique addresses, automatically discover incoming funds and manage everything through one private inbox.

Unlike conventional blockchain scanners, StealthRadar routes reads through Anon-RPC and performs payment matching locally on the user's device.

Our goal is to make private crypto payments as easy to receive and manage as using a regular wallet.

### Short version for judges

"ERC-5564 lets people receive crypto privately, but discovering and managing payments across multiple stealth addresses is still difficult. StealthRadar solves this with a private wallet that automatically discovers incoming payments, verifies them and brings everything into one inbox — while protecting the discovery process through Anon-RPC and local cryptographic matching."

---

# 19. What We Must Prove to Judges

The judges should be able to answer these questions after watching the demo:

1. Why does this product need to exist?
2. Who would use it?
3. What makes it different from a regular wallet?
4. Does it actually generate and use ERC-5564 stealth addresses?
5. Does it actually discover incoming payments?
6. Is payment matching performed locally?
7. Are blockchain reads genuinely routed through an anonymizing Anon-RPC worker?
8. Does the app fail closed when privacy infrastructure is unavailable?
9. Can the user verify and manage their received funds?

The strongest proof is a live transaction from a second wallet appearing in the recipient's StealthRadar inbox.

---

# 20. Instructions for Claude Code

Use this document as the product and technical source of truth.

Before implementation:

1. Inspect the existing repository and understand its architecture.
2. Identify what is already implemented and what is missing.
3. Verify the official ERC-5564 standard and its exact cryptographic derivation.
4. Verify the deployed Sepolia Announcer contract and bytecode.
5. Inspect the current Anon-RPC browser harness API and available genuine anonymizing workers.
6. Never assume a passthrough worker provides anonymity.
7. Do not invent contract methods, worker APIs, metadata formats or cryptographic derivations.

Implementation principles:

- Prioritize a working end-to-end demo.
- Use Sepolia and native ETH first.
- Build a unified wallet dashboard around the stealth-payment inbox.
- Keep private keys and payment matching local.
- Route all blockchain reads through Anon-RPC in privacy mode.
- Fail closed when anonymizing transport is unavailable.
- Verify transfers independently.
- Keep the code modular, tested and open source.
- Do not fake transaction data, scanner activity or privacy metrics.
- Clearly label demo data if used.
- Do not claim unsupported privacy guarantees.

**Final product goal: A user should be able to create a stealth identity, receive a payment from another wallet, discover it privately, verify it and see it in one unified wallet dashboard.**

You can give Claude this document first, then ask it to inspect your existing repository and produce an implementation plan before changing code.
