# Tutorial — x402-research

From a clean checkout to a paid API call, on either payment rail.

## 1. Install

```bash
git clone https://github.com/nirholas/x402-research
cd x402-research
npm install
```

Node 18 or newer.

## 2. Configure (optional)

```bash
cp .env.example .env
```

Nothing is required. Out of the box the server:

- listens on port `4021`,
- accepts USDC on **Base Sepolia** and on **Solana**, paying out to the suite's
  public receive addresses,
- queries arXiv, Crossref, and Semantic Scholar live — no keys needed, nothing to configure.

To be paid yourself, change these two lines:

```bash
PAY_TO_ADDRESS=0xYourEvmAddress
SOLANA_PAY_TO_ADDRESS=YourSolanaAddress
```

Nothing here requires a key. Two optional variables make the upstreams friendlier:

```bash
CONTACT_EMAIL=you@example.com   # joins Crossref's faster "polite" pool
S2_API_KEY=                     # higher Semantic Scholar rate limits
```

Without them everything still works; you may occasionally see
`"semanticScholar": "rate-limited"` in the `sources` block, which means the
other two sources carried that call.

## 3. Run the server

```bash
npm run dev
```

```
x402-research v0.1.0 listening on :4021
  payment rails:
    EVM     base-sepolia  USDC → 0x40252CFDF8B20Ed757D61ff157719F33Ec332402
    Solana  solana         USDC → WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW
  facilitator: https://x402.org/facilitator
  paid routes:
    GET /search                  $0.002
    GET /paper/:id               $0.003
    POST /bibliography           $0.005
  free routes: GET /, GET /health, GET /.well-known/x402
```

Check it is alive:

```bash
curl -s http://localhost:4021/health
# {"status":"ok","uptime":1.2}
```

## 4. Your first 402

```bash
curl -s "http://localhost:4021/search?q=attention%20is%20all%20you%20need&limit=5" | jq
```

You get HTTP **402** and a challenge listing **both** rails:

```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    { "scheme": "exact", "network": "base-sepolia", "maxAmountRequired": "2000",
      "payTo": "0x40252CFDF8B20Ed757D61ff157719F33Ec332402", "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
    { "scheme": "exact", "network": "solana", "maxAmountRequired": "2000",
      "payTo": "WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW", "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
  ]
}
```

That is the whole price negotiation: no key, no signup, no account. The price
is `2000` USDC base units (6 decimals) = **$0.002**.

## 5. Pay for real

Get a Base Sepolia test wallet and fund it with test USDC from
<https://faucet.circle.com>. Then:

```bash
PRIVATE_KEY=0xYourTestKey npm run client
```

[`examples/agent-client.ts`](../examples/agent-client.ts) does the full flow:

1. Calls the route unpaid and prints both rails from the 402.
2. Signs an EIP-3009 USDC authorization for exactly $0.002.
3. Retries with the `X-PAYMENT` header.
4. Prints the artifact and decodes the `X-PAYMENT-RESPONSE` receipt.

Prefer Solana? The bottom of that file shows the equivalent flow — the server
needs no changes, since the same 402 already advertises the `solana` rail.

## 6. Read the artifact

The 200 body **is** the purchase:

```json
{
  "query": "attention is all you need",
  "count": 3,
  "papers": [
    {
      "title": "Attention Is All You Need",
      "authors": [
        "Ashish Vaswani",
        "Noam Shazeer",
        "Niki Parmar",
        "Jakob Uszkoreit"
      ],
      "year": 2017,
      "venue": "Neural Information Processing Systems",
      "doi": null,
      "arxivId": "1706.03762",
      "url": "https://www.semanticscholar.org/paper/204e3073870fae3d05bcbc2f6a8e263d9b72e776",
      "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder…",
      "citationCount": 103421,
      "source": "semantic-scholar"
    },
    {
      "title": "Neural Machine Translation by Jointly Learning to Align and Translate",
      "authors": [
        "Dzmitry Bahdanau",
        "Kyunghyun Cho",
        "Yoshua Bengio"
      ],
      "year": 2014,
      "venue": "International Conference on Learning Representations",
      "doi": null,
      "arxivId": "1409.0473",
      "url": "http://arxiv.org/abs/1409.0473",
      "abstract": "Neural machine translation is a recently proposed approach to machine translation. Unlike the traditional statistical machine translation…",
      "citationCount": 28104,
      "source": "arxiv"
    },
    {
      "title": "Efficient Attention: Attention with Linear Complexities",
      "authors": [
        "Zhuoran Shen",
        "Mingyuan Zhang",
        "Haiyu Zhao"
      ],
      "year": 2018,
      "venue": "arXiv",
      "doi": "10.1109/wacv48630.2021.00357",
      "arxivId": "1812.01243",
      "url": "http://arxiv.org/abs/1812.01243",
      "abstract": "Dot-product attention has wide applications in computer vision and natural language processing…",
      "citationCount": 412,
      "source": "crossref"
    }
  ],
  "sources": {
    "arxiv": "ok",
    "crossref": "ok",
    "semanticScholar": "ok"
  },
  "retrievedAt": "2026-08-07T09:14:22.117Z"
}
```

Read the `sources` block first: it tells you which of the three upstreams
answered (`ok`, `rate-limited`, or an error string), so you know how complete the
merge is. `papers` is already de-duplicated across sources and sorted by
citation count then year. Any `doi` you see can be fed straight into
`POST /bibliography`, and any `doi` or `arxivId` into `GET /paper/{id}`.

Full field-by-field reference: [api.md](api.md).

## 7. Going to mainnet

```bash
# EVM: Base mainnet
NETWORK=base
PAY_TO_ADDRESS=0xYourRealAddress

# Solana: mainnet (this is already the default)
SOLANA_NETWORK=mainnet-beta
SOLANA_PAY_TO_ADDRESS=YourRealSolanaAddress
SOLANA_RPC_URL=https://your-dedicated-rpc.example.com

# A facilitator that settles on the networks you accept
FACILITATOR_URL=https://x402.org/facilitator
```

Then run `npm run build && npm start`. Nothing else changes: the same routes,
the same prices, real USDC.

> Use a dedicated Solana RPC in production. The public endpoint is heavily
> rate-limited.

## Where to go next

- [api.md](api.md) — every endpoint, parameter, and error
- [agents.md](agents.md) — discovery, MCP, and listing your instance
- [../skill.md](https://github.com/nirholas/x402-research/blob/main/skill.md) — the agent-facing skill file
- [../examples/curl.md](https://github.com/nirholas/x402-research/blob/main/examples/curl.md) — the same flow in raw curl
