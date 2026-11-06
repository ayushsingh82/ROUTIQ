# ROUTIQ — Pitch & Product Positioning

## 1. One-line pitch

**ROUTIQ is a decentralised, privacy-first AI router that connects developers to independent AI providers through one OpenAI-compatible API, with private blockchain access and programmable payments.**

## 2. Short pitch (2–3 lines)

ROUTIQ is building an open alternative to centralised AI routers like OpenRouter. Developers access multiple AI models through one API, while our routing engine automatically finds the best independent provider based on price, speed and availability.

Powered by Anon-RPC and Ethereum Frame Transactions, ROUTIQ adds privacy-preserving blockchain access and programmable payments to decentralised AI infrastructure.

## 3. 30-second elevator pitch

Today, accessing AI models means depending on centralised platforms or managing multiple provider integrations, API keys and billing systems.

ROUTIQ changes this. It creates a permissionless routing layer where developers can access AI models from independent providers through one familiar API. Our routing engine automatically selects the best provider based on cost, latency and reliability.

We integrate Anon-RPC to protect blockchain read activity and Ethereum Frame Transactions to enable programmable inference payments.

**One API. Independent AI providers. Private access. Programmable payments.**

## 4. The problem

AI infrastructure is becoming increasingly centralised. Developers depend on a handful of platforms; each provider has different APIs, pricing, rate limits and billing.

1. **Fragmented access** — integrating many providers individually; switching to a cheaper one is extra engineering.
2. **Centralised routing** — existing aggregators control how requests are routed; developers have limited control over provider selection, infrastructure and the routing layer.
3. **Privacy and payment limitations** — AI usage is tied to accounts, API keys and centralised billing. Blockchain-powered payment systems also need better programmable spending controls and privacy-preserving access to onchain data.

## 5. Our solution

An open routing network for AI inference. Developers integrate once with an OpenAI-compatible API. ROUTIQ discovers independent providers, aggregates models, compares pricing and performance, routes requests, supports provider fallback, tracks actual usage, enables programmable spending policies and uses Anon-RPC for privacy-preserving Ethereum reads. Providers register endpoints, list models, set pricing and receive requests through the network.

## 6. How it works

1. **Connect** — OpenAI SDK + a ROUTIQ endpoint.
2. **Discover** — models and independent providers.
3. **Route** — by price, latency, reliability and user preference.
4. **Execute** — the selected provider processes and streams the response.
5. **Pay** — a programmable smart account enforces spending policies using Frame Transactions; the payment system handles usage accounting and settlement.
6. **Protect** — Anon-RPC handles the supported Ethereum reads through an anonymising transport, reducing direct IP-to-query linkage under its threat model.

## 7. What makes ROUTIQ different

| Existing AI routers | ROUTIQ |
|---|---|
| Centralised routing infrastructure | Designed for independent providers |
| Provider integrations managed by one platform | Provider registration and discovery |
| Platform-controlled routing | Configurable routing strategies |
| Conventional blockchain access | Anon-RPC integration |
| Conventional payment authorisation | Programmable Frame Transaction policies |
| Platform-centric ecosystem | Open provider marketplace |

ROUTIQ does **not** claim existing AI providers cannot see prompts. The privacy focus is blockchain access and the infrastructure around routing and payments.

## 8. Main features

1. Unified AI API (OpenAI-compatible). 2. Model marketplace. 3. Independent provider network. 4. Intelligent routing (cheapest / fastest / balanced). 5. Automatic fallback (subject to user policy). 6. Programmable payments (limits, quotas, approved providers). 7. Privacy-preserving blockchain access (Anon-RPC). 8. Developer dashboard (keys, usage, logs, spending). 9. Provider dashboard (models, pricing, health, earnings).

## 9. Hackathon integrations

- **Anon-RPC:** the application's Ethereum reads (provider registry, payment policies, smart-account balances, transaction status) go through an anonymising worker, so the RPC endpoint does not directly see the user's IP-to-query relationship, under the network's threat model.
- **Frame Transaction Alternative Mempool:** programmable inference spending. A user authorises a smart account with limits and approved recipients; the account validates payment requests against those rules; supported complex transactions are submitted through the Alternative Mempool. The payment authorisation itself is programmable.

## 10. Target users

AI application developers · AI agents and autonomous applications · independent inference providers · GPU operators · open-source AI communities · startups wanting flexible inference pricing · teams needing programmable AI spending limits.

## 11. Business model

Small routing fee on usage · provider marketplace fees · enterprise routing and usage management · hosted private routing instances · advanced routing/analytics. Provider participation stays permissionless; managed infrastructure is the paid layer.

## 12. Vision

AI access should not depend on a single company controlling the routing layer. As more models and independent providers emerge, developers need an open infrastructure layer that makes them discoverable, comparable and accessible through one interface. **Open AI access. Independent infrastructure. Private blockchain interactions. Programmable payments.**

---

# Demo presentation script

- **Opening:** "Imagine having access to every major AI model through a single API, without being locked into one centralised routing platform."
- **Marketplace:** "Developers can discover different models, compare prices and see which independent providers offer them."
- **Router:** "Instead of manually selecting a provider, ROUTIQ can automatically select the best available provider based on cost, latency and reliability."
- **API:** "Developers don't need to change their applications. They point their OpenAI SDK at ROUTIQ."
- **Anon-RPC:** "Every supported Ethereum read in this flow goes through Anon-RPC, reducing direct exposure of the user's IP and blockchain query relationship to the RPC endpoint."
- **Frame Transactions:** "We introduce programmable inference payments. Users configure spending limits, and the smart account validates payment operations using Ethereum Frame Transactions through the Alternative Mempool."
- **Closing:** "We're not building another AI model or another chatbot. We're building the open routing and payment infrastructure that connects AI developers to independent inference providers."

# Taglines

1. One API. Every model. No single gatekeeper. **(primary)**
2. The open routing layer for AI.
3. Route AI. Not your freedom.
4. AI access without platform lock-in.
5. Open intelligence. Private infrastructure.
6. Every model. Every provider. One router.

## Recommendation for the hackathon

**ROUTIQ — The Open, Private AI Router. One API. Every model. No single gatekeeper.**

Lead with: (1) OpenAI-compatible access to independent AI providers; (2) Anon-RPC-powered privacy for Ethereum reads; (3) Frame Transaction-powered programmable AI payments. Position it as infrastructure for open, permissionless AI inference, not an AI chat application.

**Keep clear when pitching:** ROUTIQ can protect blockchain query privacy and provide programmable payments, but it does not make AI prompts anonymous to providers, and inference is only decentralised to the extent the provider network is independently operated.
