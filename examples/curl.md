# Raw HTTP walkthrough — 402 → pay → 200

Everything below is plain `curl`. No SDK required.

## 0. Start the server

```bash
npm install
npm run dev      # http://localhost:4021
```

## 1. Free routes need no payment

```bash
curl -s http://localhost:4021/health
curl -s http://localhost:4021/ | jq
curl -s http://localhost:4021/.well-known/x402 | jq
```

## 2. Call a paid route with no payment → 402, both rails

```bash
curl -s -i "http://localhost:4021/search?q=attention%20is%20all%20you%20need&limit=5"
```

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
```

```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "hint": "Pay in USDC on Base or Solana — your client picks the rail. See /.well-known/x402",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "2000",
      "resource": "http://localhost:4021/search",
      "description": "Ranked scholarly search across arXiv, Crossref, and Semantic Scholar",
      "mimeType": "application/json",
      "payTo": "0x40252CFDF8B20Ed757D61ff157719F33Ec332402",
      "maxTimeoutSeconds": 120,
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "extra": { "name": "USDC", "version": "2" }
    },
    {
      "scheme": "exact",
      "network": "solana",
      "maxAmountRequired": "2000",
      "resource": "http://localhost:4021/search",
      "description": "Ranked scholarly search across arXiv, Crossref, and Semantic Scholar",
      "mimeType": "application/json",
      "payTo": "WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW",
      "maxTimeoutSeconds": 120,
      "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "extra": { "name": "USDC", "decimals": 6, "feePayer": "<facilitator sponsor>" }
    }
  ]
}
```

`maxAmountRequired` is in USDC base units (6 decimals): `2000` = $0.002.

## 3. Build the payment

Pick **one** entry from `accepts`.

**EVM (Base):** sign an EIP-3009 `transferWithAuthorization` for
`maxAmountRequired` USDC to `payTo`. No gas needed from you — the facilitator
submits it.

**Solana:** build an SPL `transferChecked` of `maxAmountRequired` USDC to
`payTo`, with `extra.feePayer` as the transaction fee payer, and sign it. You
need USDC only — the facilitator sponsors the SOL fee.

Either way, base64-encode the x402 payload:

```json
{ "x402Version": 1, "scheme": "exact", "network": "<the rail you picked>", "payload": { … } }
```

In practice, let a library do it:

```bash
PRIVATE_KEY=0xYourTestKey npm run client
```

## 4. Repeat the request with the header → 200 + artifact

```bash
curl -s -i -H "X-PAYMENT: <base64 payload>" "http://localhost:4021/search?q=attention%20is%20all%20you%20need&limit=5"
```

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-PAYMENT-RESPONSE: eyJzdWNjZXNzIjp0cnVlLCJyYWlsIjoiZXZtIiwi…
```

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

Decode the receipt:

```bash
echo '<X-PAYMENT-RESPONSE value>' | base64 -d | jq
# { "success": true, "rail": "evm", "network": "base-sepolia",
#   "transaction": "0x…", "payer": "0x…", "amount": "2000", "asset": "USDC" }
```

The artifact is in the body of that same 200. There is nothing else to fetch.

## All paid routes

### `GET /search` — $0.002

```bash
curl -s -H "X-PAYMENT: <payload>" "http://localhost:4021/search?q=attention%20is%20all%20you%20need&limit=5"
```

### `GET /paper/:id` — $0.003

```bash
curl -s -H "X-PAYMENT: <payload>" "http://localhost:4021/paper/10.1038/nature14539"
```

### `POST /bibliography` — $0.005

```bash
curl -s -H "X-PAYMENT: <payload>" -X POST "http://localhost:4021/bibliography" \
  -H 'content-type: application/json' \
  -d '{"dois":["10.1038/nature14539","10.1145/3292500.3330701"],"format":"both"}'
```
