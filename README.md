# x402-research

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![x402](https://img.shields.io/badge/payments-x402-0052ff.svg)](https://x402.org)
[![USDC on Base](https://img.shields.io/badge/USDC-Base-0052ff.svg)](https://base.org)
[![USDC on Solana](https://img.shields.io/badge/USDC-Solana-14f195.svg)](https://solana.com)

**Scholarly search over arXiv, Crossref, and Semantic Scholar — papers, citation
graphs, formatted bibliographies.** One HTTP call, $0.002 in USDC on Base *or*
Solana, and the merged paper list comes back in the response body: titles,
authors, venues, DOIs, abstracts, citation counts.

Docs site: **https://nirholas.github.io/x402-research/**

## Why x402 for this

Literature search is exactly the workload API keys handle badly. An agent doing
a review needs two hundred queries this afternoon and none next month, and the
human who owns the key is not the one making the calls. With x402 the route
quotes its own price in the 402 response, the agent pays $0.002 per query in
USDC on whichever chain it holds funds on, and there is nothing to sign up for,
leak, or rotate. All three upstreams are free and keyless — the price buys the
merge, the de-duplication, and the ranking, not a resold subscription.

## Quickstart

```bash
git clone https://github.com/nirholas/x402-research
cd x402-research
npm install
npm run dev            # http://localhost:4021 — no configuration needed
```

See the price with no wallet at all:

```bash
curl -s "http://localhost:4021/search?q=attention%20is%20all%20you%20need&limit=5" | jq
# 402 + accepts: [ USDC on Base, USDC on Solana ]
```

Then buy it, from an agent (wallet funded with Base Sepolia USDC —
https://faucet.circle.com):

```bash
PRIVATE_KEY=0xYourTestKey npm run client
```

## API

| Route | Price | What you get back |
|-------|-------|-------------------|
| `GET /search` | **$0.002** | Merged, de-duplicated, citation-ranked papers with authors, venue, DOI, abstract, and citation count, plus a per-source status block |
| `GET /paper/:id` | **$0.003** | Full metadata, abstract, TL;DR, open-access PDF link, plus the top citing works and the reference list |
| `POST /bibliography` | **$0.005** | Paste-ready BibTeX and/or APA 7 references, one entry per DOI |
| `GET /` | free | Service metadata, live prices, active payment rails, upstream list |
| `GET /health` | free | Liveness probe |
| `GET /.well-known/x402` | free | Machine-readable discovery manifest |
| `GET /skill.md` | free | This agent skill card |
| `GET /openapi.json` | free | OpenAPI 3.1 spec |

Full reference: [docs/api.md](docs/api.md) · [openapi.json](openapi.json)

## How x402 works

**Pay in USDC on Base or Solana — your client picks the rail.**

1. **402** — the route, called without payment, replies HTTP 402 with an
   `accepts` array holding **both** rails: exact price
   ($0.002 → `2000` USDC base units), asset, and `payTo`.
2. **Sign** — on Base, the client signs an EIP-3009 USDC authorization (no gas
   from the payer). On Solana, it signs an SPL `transferChecked` whose fee payer
   is the facilitator's sponsor account (so the buyer needs USDC only, no SOL).
3. **Settle** — the server hands the payload to the facilitator
   (`https://x402.org/facilitator`), which verifies and settles on the chosen chain.
4. **200** — the same request returns the artifact in the body, with the
   settlement receipt in the `X-PAYMENT-RESPONSE` header.

| Rail | Network | Asset | payTo |
|------|---------|-------|-------|
| EVM | `base-sepolia` (`base` on mainnet) | USDC | `0x40252CFDF8B20Ed757D61ff157719F33Ec332402` |
| Solana | `solana` (`solana-devnet` on devnet) | USDC | `WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW` |

Those are the suite's public receive addresses and the server's defaults. Set
`PAY_TO_ADDRESS` / `SOLANA_PAY_TO_ADDRESS` to be paid yourself.

Walkthroughs: [examples/curl.md](examples/curl.md) ·
[examples/agent-client.ts](examples/agent-client.ts) ·
[docs/tutorial.md](docs/tutorial.md)

## Real backend / API keys

| Env | Effect |
|-----|--------|
| *(nothing)* | All three sources are keyless and are called live out of the box. `npm install && npm run dev` talks to real arXiv, Crossref, and Semantic Scholar. |
| `CONTACT_EMAIL` | Goes into the outgoing User-Agent, which puts you in [Crossref's "polite" pool](https://api.crossref.org) — faster and more reliable than the anonymous lane. |
| `S2_API_KEY` | Optional [Semantic Scholar](https://www.semanticscholar.org/product/api) key for higher rate limits. Without it the anonymous lane is used and a 429 shows up as `"semanticScholar": "rate-limited"` in the `sources` block instead of an error. |

All variables: [.env.example](.env.example)

## For AI agents

- **[skill.md](skill.md)** — agent-facing skill file: endpoints, prices,
  schemas, both payment rails. Point your agent at it.
- **`GET /.well-known/x402`** — discovery manifest listing every resource with
  both networks. Indexable by [x402scan.com](https://x402scan.com), the x402
  Bazaar, and [agentic.market](https://agentic.market).
- **MCP** — [examples/mcp-tool.md](examples/mcp-tool.md) exposes these routes as
  Claude MCP tools, with per-wallet spend caps and a
  `claude_desktop_config.json` example.
- More: [docs/agents.md](docs/agents.md)

## Docs

- Landing: https://nirholas.github.io/x402-research/
- [Tutorial](docs/tutorial.md) · [API reference](docs/api.md) · [For AI agents](docs/agents.md)

## Support

Questions, bugs, or a listing request: **nichxbt@gmail.com** ·
[open an issue](https://github.com/nirholas/x402-research/issues)

## License

Apache-2.0. Part of the [x402 Suite](https://github.com/nirholas/x402-suite).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=nirholas/x402-research&type=Date)](https://www.star-history.com/#nirholas/x402-research&Date)

<!-- three.ws:growth -->
## Support the project

If x402-research saves you time, **[star it on GitHub](https://github.com/nirholas/x402-research)**. Stars are how other developers and AI agents find the repositories worth trusting, and they cost you one click.

Know someone who would use it? [Post on X](https://twitter.com/intent/tweet?text=x402-research%3A%20Scholarly%20search%20over%20arXiv%2C%20Crossref%2C%20and%20Semantic%20Scholar%3A%20papers%2C%20citation%20graphs%2C%20formatted&url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-research) · [Share on Bluesky](https://bsky.app/intent/compose?text=x402-research%3A%20Scholarly%20search%20over%20arXiv%2C%20Crossref%2C%20and%20Semantic%20Scholar%3A%20papers%2C%20citation%20graphs%2C%20formatted%20https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-research) · [Share on LinkedIn](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-research) · [Submit to Hacker News](https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-research&t=x402-research%3A%20Scholarly%20search%20over%20arXiv%2C%20Crossref%2C%20and%20Semantic%20Scholar%3A%20papers%2C%20citation%20graphs%2C%20formatted) · [Share on Reddit](https://www.reddit.com/submit?url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-research&title=x402-research%3A%20Scholarly%20search%20over%20arXiv%2C%20Crossref%2C%20and%20Semantic%20Scholar%3A%20papers%2C%20citation%20graphs%2C%20formatted)

## Built for AI agents too

Coding agents and LLM tooling can read this repo directly: [AGENTS.md](./AGENTS.md), [llms.txt](./llms.txt), [llms-full.txt](./llms-full.txt). Point an agent at `https://github.com/nirholas/x402-research` and it has the context it needs.

## More from the same author

- [All repositories by nirholas](https://github.com/nirholas/nirholas#readme): the full catalog, grouped by topic
- [three.ws](https://three.ws): the platform for 3D AI agents with Solana wallets, a skill marketplace and x402 payments
- Questions or ideas: [open an issue](https://github.com/nirholas/x402-research/issues) or [start a discussion](https://github.com/nirholas/x402-research/discussions)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=nirholas/x402-research)](https://github.com/nirholas/x402-research/graphs/contributors)

<!-- /three.ws:growth -->

<!-- nirholas:watermark -->

---

<p align="center">
  Built by <a href="https://github.com/nirholas"><b>nirholas</b></a> · <a href="https://x.com/nichxbt">@nichxbt</a> · <a href="https://github.com/nirholas">github.com/nirholas</a>
</p>

<!-- /nirholas:watermark -->
