# API reference — x402-research

Base URL: `http://localhost:4021` in development.
Machine-readable: [`openapi.json`](https://github.com/nirholas/x402-research/blob/main/openapi.json) (OpenAPI 3.1).

All paid routes return the purchased artifact in the **200 response body**.

## Payment

Every paid route answers an unpaid request with **402** and an `accepts` array
holding both rails:

| Rail | Network | Asset | payTo |
|------|---------|-------|-------|
| EVM | `base-sepolia` (`base` on mainnet) | USDC | `0x40252CFDF8B20Ed757D61ff157719F33Ec332402` |
| Solana | `solana` (`solana-devnet` on devnet) | USDC | `WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW` |

Prices are quoted in USDC base units (6 decimals) as `maxAmountRequired`.
On success the response carries `X-PAYMENT-RESPONSE`: base64 JSON with
`{ success, rail, network, transaction, payer, amount, asset }`.

---

## `GET /search`

**$0.002** — Ranked scholarly search across arXiv, Crossref, and Semantic Scholar

### Parameters

| Param | In | Required | Type | Description |
|-------|----|----------|------|-------------|
| `q` | query | yes | string | Free-text search terms, passed to all three upstreams. |
| `limit` | query | no | integer | Papers to return, 1–25. Each source is asked for this many before merging. Default 10. |

### Example request

```bash
curl -s -H "X-PAYMENT: <base64 payload>" "http://localhost:4021/search?q=attention%20is%20all%20you%20need&limit=5"
```

### Response `200 application/json`

`papers` is merged across all three sources: duplicates are collapsed by DOI, then by normalized title, keeping whichever record carried the citation count and abstract. `sources` reports `ok`, `rate-limited`, or an error string for each upstream, so you always know how complete the merge is.

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

### Errors

| HTTP | `error` | When |
|------|---------|------|
| 400 | `missing_query` | No `q` parameter. Nothing settled. |
| 502 | `upstream_error` | All three sources failed or timed out. Nothing settled. |
| 402 | — | No or invalid `X-PAYMENT`. Body carries `accepts` with both rails. |
| 502 | `upstream_error` | The upstream data source failed or timed out. |

---

## `GET /paper/:id`

**$0.003** — Paper metadata, abstract, TL;DR, and a two-sided citation graph

### Parameters

| Param | In | Required | Type | Description |
|-------|----|----------|------|-------------|
| `id` | path | yes | string | A DOI (`10.1038/nature14539` — raw slashes are fine), an arXiv id (`1706.03762` or `arXiv:1706.03762`), a Semantic Scholar paper id, or `CorpusId:…`. |

### Example request

```bash
curl -s -H "X-PAYMENT: <base64 payload>" "http://localhost:4021/paper/10.1038/nature14539"
```

### Response `200 application/json`

`citationGraph.topCitations` and `.references` are each capped at 25 entries. If Semantic Scholar is unreachable and you passed a DOI, the service falls back to Crossref metadata and sets `partial: true` — you get the counts but not the citation lists.

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

### Errors

| HTTP | `error` | When |
|------|---------|------|
| 400 | `missing_id` | Empty path segment. Nothing settled. |
| 404 | `paper_not_found` | No paper matched that identifier. |
| 502 | `upstream_error` | Semantic Scholar and the Crossref fallback both failed. |
| 402 | — | No or invalid `X-PAYMENT`. Body carries `accepts` with both rails. |
| 502 | `upstream_error` | The upstream data source failed or timed out. |

---

## `POST /bibliography`

**$0.005** — Formatted BibTeX and APA entries for a list of DOIs

### Parameters

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

### Example request

```bash
curl -s -H "X-PAYMENT: <base64 payload>" -X POST "http://localhost:4021/bibliography" \
  -H 'content-type: application/json' \
  -d '{"dois":["10.1038/nature14539","10.1145/3292500.3330701"],"format":"both"}'
```

### Response `200 application/json`

Entries are resolved independently, so one bad DOI does not sink the batch — it comes back with `status: "error"` and the rest still succeed. DOIs are de-duplicated and capped at 25 per call.

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

### Errors

| HTTP | `error` | When |
|------|---------|------|
| 400 | `invalid_body` | `dois` missing, empty, or not an array of strings. Nothing settled. |
| 502 | `upstream_error` | Crossref unreachable for the whole batch. Nothing settled. |
| 402 | — | No or invalid `X-PAYMENT`. Body carries `accepts` with both rails. |
| 502 | `upstream_error` | The upstream data source failed or timed out. |


---

## Free routes

### `GET /`

Service metadata: description, live prices, active payment rails, data-source
status, and docs links.

### `GET /health`

```json
{ "status": "ok", "uptime": 12.5 }
```

### `GET /.well-known/x402`

The discovery manifest — every resource with its price, output schema, and both
accepted rails. See [agents.md](agents.md).
