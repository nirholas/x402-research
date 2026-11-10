---
name: scholarly-search
description: Search arXiv, Crossref and Semantic Scholar, fetch one paper by DOI or arXiv id, and format bibliographies, each paid per query over x402. Use when an agent needs real citations or paper metadata.
---

# x402-research scholarly search

One merged search across three live scholarly APIs. There is no fixture data: if every upstream fails the server returns 502 and nothing settles.

## Run the server

The repo is a self-hosted Express service. It is not published to npm, so run it from a clone.

```bash
git clone https://github.com/nirholas/x402-research && cd x402-research
npm install
cp .env.example .env   # optional: the defaults run out of the box
npm run dev            # listens on http://localhost:4021 (override with PORT)
```

Set `PAY_TO_ADDRESS` (Base) and `SOLANA_PAY_TO_ADDRESS` (Solana) in `.env` to receive payments yourself.
`GET http://localhost:4021/.well-known/x402` lists every route with its price, and `GET /health` is the liveness probe.

## Routes

| Route | Price | Purpose |
|---|---|---|
| `GET /search` | $0.002 | Query `q` (required), `limit` (1 to 25, default 10) |
| `GET /paper/:id` | $0.003 | `id` is a DOI (raw slashes fine), an arXiv id (`1706.03762` or `arXiv:1706.03762`), a Semantic Scholar id or `CorpusId:...` |
| `POST /bibliography` | $0.005 | Body `{dois: [...], format}`; up to 25 DOIs, `format` defaults to `both` |
| `GET /health`, `GET /skill.md`, `GET /openapi.json`, `GET /.well-known/x402` | free | Liveness and discovery |

Errors: 400 `missing_query`, `missing_id`, `invalid_body`; 404 `paper_not_found`; 502 `upstream_error`.

The full request and response schemas are in `skill.md` at the repo root (the running server also serves it at `GET /skill.md`).

## Paying

Paid routes answer an unpaid request with HTTP 402 and an `accepts` array with one entry per rail (USDC on Base and USDC on Solana). A client picks an entry, signs, and retries with the `X-PAYMENT` header. The 200 body carries the artifact and an `X-PAYMENT-RESPONSE` header carries the settlement receipt. Any x402 client works (`x402-fetch` with `viem` on the EVM rail). Each paid call spends real USDC on whichever network the server is configured for (`NETWORK`, `SOLANA_NETWORK`), so show the user the route, price and network and get a yes before paying.

## Worked example

```bash
curl -si 'http://localhost:4021/search?q=attention+is+all+you+need&limit=5'
```

That prints the 402 challenge. After the user approves the $0.002, repeat it through an x402 client (`npm run client` runs `examples/agent-client.ts`) and read the merged papers from the 200 body.
