# x402-research — agent skill

Search the scholarly literature and get papers back in the same response. One
query fans out to arXiv, Crossref, and Semantic Scholar in parallel; the hits
are merged by DOI and normalized title, then ranked by citation count and
recency. `/paper/{id}` returns full metadata, the abstract, a TL;DR, and both
sides of the citation graph. `/bibliography` turns a list of DOIs into
paste-ready BibTeX and APA. Every upstream is keyless and queried live — there
is no local index to go stale, and no fixture data anywhere in this service.

**Base URL:** `{BASE_URL}` (local default `http://localhost:4021`)

Every paid call returns the purchased artifact **in the 200 response body**.
There is nothing to poll and nothing to collect later.

## Payment

This service speaks **x402** (HTTP 402 Payment Required, <https://x402.org>).

**Pay in USDC on Base or Solana — your client picks the rail.**

| Rail | Network | Asset | payTo |
|------|---------|-------|-------|
| EVM | `base-sepolia` (`base` on mainnet) | USDC | `0x40252CFDF8B20Ed757D61ff157719F33Ec332402` |
| Solana | `solana` (`solana-devnet` on devnet) | USDC | `WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW` |

Facilitator: `https://x402.org/facilitator` (verifies and settles both rails).

Flow:

1. Call the endpoint with no `X-PAYMENT` header. You get **402** with an
   `accepts` array holding **both** rails.
2. Pick a rail, sign the payment, and put the base64 payload in `X-PAYMENT`.
3. Repeat the request. You get **200** with the artifact, and a settlement
   receipt in the `X-PAYMENT-RESPONSE` header (base64 JSON:
   `{ success, rail, network, transaction, payer, amount, asset }`).

Use `x402-fetch` (EVM), a Solana x402 client, or any x402-aware HTTP client —
the wire format is the standard one.

```ts
import { wrapFetchWithPayment, createSigner } from "x402-fetch";
const signer = await createSigner("base-sepolia", process.env.PRIVATE_KEY!);
const pay = wrapFetchWithPayment(fetch, signer);
const res = await pay("{BASE_URL}/search?q=attention%20is%20all%20you%20need&limit=5");
const artifact = await res.json();
```

## Endpoints

### `GET /search` — $0.002

Ranked scholarly search across arXiv, Crossref, and Semantic Scholar

| Param | In | Required | Type | Description |
|-------|----|----------|------|-------------|
| `q` | query | yes | string | Free-text search terms, passed to all three upstreams. |
| `limit` | query | no | integer | Papers to return, 1–25. Each source is asked for this many before merging. Default 10. |

**Returns** (`200 application/json`) — Merged, de-duplicated, citation-ranked papers with authors, venue, DOI, abstract, and citation count, plus a per-source status block

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

---

### `GET /paper/:id` — $0.003

Paper metadata, abstract, TL;DR, and a two-sided citation graph

| Param | In | Required | Type | Description |
|-------|----|----------|------|-------------|
| `id` | path | yes | string | A DOI (`10.1038/nature14539` — raw slashes are fine), an arXiv id (`1706.03762` or `arXiv:1706.03762`), a Semantic Scholar paper id, or `CorpusId:…`. |

**Returns** (`200 application/json`) — Full metadata, abstract, TL;DR, open-access PDF link, plus the top citing works and the reference list

```json
{
  "id": "10.1038/nature14539",
  "resolvedAs": "DOI:10.1038/nature14539",
  "title": "Deep learning",
  "abstract": "Deep learning allows computational models that are composed of multiple processing layers to learn representations of data with multiple levels of abstraction…",
  "tldr": "Deep learning discovers intricate structure in large data sets by using backpropagation.",
  "year": 2015,
  "venue": "Nature",
  "publicationDate": "2015-05-27",
  "authors": [
    "Yann LeCun",
    "Yoshua Bengio",
    "Geoffrey Hinton"
  ],
  "externalIds": {
    "DOI": "10.1038/nature14539",
    "MAG": "2126779391",
    "CorpusId": 3074096
  },
  "fieldsOfStudy": [
    "Computer Science",
    "Medicine"
  ],
  "openAccessPdf": null,
  "citationGraph": {
    "citationCount": 61234,
    "referenceCount": 96,
    "influentialCitationCount": 4102,
    "topCitations": [
      {
        "title": "Deep Residual Learning for Image Recognition",
        "year": 2015,
        "doi": null,
        "arxivId": "1512.03385",
        "citationCount": 180321
      }
    ],
    "references": [
      {
        "title": "ImageNet Classification with Deep Convolutional Neural Networks",
        "year": 2012,
        "doi": null,
        "arxivId": null,
        "citationCount": 108442
      }
    ]
  },
  "source": "semantic-scholar",
  "retrievedAt": "2026-08-07T09:15:04.882Z"
}
```

---

### `POST /bibliography` — $0.005

Formatted BibTeX and APA entries for a list of DOIs

| Param | In | Required | Type | Description |
|-------|----|----------|------|-------------|
| `dois` | body | yes | array | DOIs to format. De-duplicated; capped at 25 per call. |
| `format` | body | no | string | Output format. Default `both`. |

**Request body** (`application/json`)

```json
{
  "dois": [
    "10.1038/nature14539",
    "10.1145/3292500.3330701"
  ],
  "format": "both"
}
```

**Returns** (`200 application/json`) — Paste-ready BibTeX and/or APA 7 references, one entry per DOI

```json
{
  "format": "both",
  "count": 2,
  "entries": [
    {
      "doi": "10.1038/nature14539",
      "status": "ok",
      "bibtex": "@article{LeCun_2015, title={Deep learning}, volume={521}, ISSN={1476-4687}, url={http://dx.doi.org/10.1038/nature14539}, DOI={10.1038/nature14539}, number={7553}, journal={Nature}, publisher={Springer Science and Business Media LLC}, author={LeCun, Yann and Bengio, Yoshua and Hinton, Geoffrey}, year={2015}, month=may, pages={436-444} }",
      "apa": "LeCun, Y., Bengio, Y., & Hinton, G. (2015). Deep learning. Nature, 521(7553), 436-444. https://doi.org/10.1038/nature14539"
    },
    {
      "doi": "10.1145/3292500.3330701",
      "status": "error",
      "error": "HTTP 404 from api.crossref.org"
    }
  ],
  "retrievedAt": "2026-08-07T09:16:41.003Z"
}
```


## Free endpoints

- `GET /` — Service metadata, live prices, active payment rails, upstream list
- `GET /health` — Liveness probe
- `GET /.well-known/x402` — Machine-readable discovery manifest
- `GET /skill.md` — This agent skill card
- `GET /openapi.json` — OpenAPI 3.1 spec

## Error codes

| HTTP | `error` | Meaning |
|------|---------|---------|
| 400 | `missing_query` | `GET /search` called without `q`. |
| 400 | `missing_id` | `GET /paper/{id}` called with an empty id. |
| 400 | `invalid_body` | `POST /bibliography` body is not `{ dois: string[] }`. |
| 404 | `paper_not_found` | No paper matched that DOI / arXiv id / S2 id. |
| 502 | `upstream_error` | Every upstream failed or timed out. Nothing settled — retry. |
| 402 | — | Payment required or rejected. Body carries `accepts` (both rails) and an `error` reason. |
| 500 | `no_payment_rail_configured` | Server has neither a valid EVM nor Solana payTo. |

## Data source

Three live, keyless upstreams, queried in parallel on every request with a
12-second timeout:

- **[arXiv API](https://info.arxiv.org/help/api/)** (`export.arxiv.org`) — preprint full-text search, Atom XML.
- **[Crossref REST](https://api.crossref.org)** — DOI metadata, citation counts, and the BibTeX transform.
- **[Semantic Scholar Graph](https://api.semanticscholar.org)** — abstracts, TL;DRs, citations and references.

A source that fails or rate-limits is reported per-source in the response's
`sources` block rather than failing the request — you still get everything the
other two returned. Only when all three fail does the call return 502, and then
nothing is settled. There are no fixtures in this repo: every response is live
data.

## Discovery

Machine-readable manifest: **`GET /.well-known/x402`**
(also at <https://github.com/nirholas/x402-research/blob/main/public/.well-known/x402>).
Indexed by [x402scan.com](https://x402scan.com), the x402 Bazaar, and
[agentic.market](https://agentic.market).

OpenAPI 3.1: [`openapi.json`](https://github.com/nirholas/x402-research/blob/main/openapi.json)

## Contact

nichxbt@gmail.com · <https://github.com/nirholas/x402-research>
