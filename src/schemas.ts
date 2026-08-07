/**
 * Per-route request/response schemas published in the x402 402 challenge.
 *
 * Generated from `openapi.json` so the discovery metadata and the runtime
 * challenge cannot drift apart: `accepts[].outputSchema.input` describes how to
 * call the route, `accepts[].outputSchema.output` describes what the paid 200
 * returns. Keys match the paywall route map in `server.ts` exactly.
 *
 * Update `openapi.json` first, then re-derive this file.
 */

/** x402 Bazaar-style schema pair carried by every accept entry. */
export type RouteSchema = {
  /** How to invoke the route: method, query params and/or JSON body fields. */
  input: Record<string, unknown>;
  /** JSON Schema of the paid 200 response body. */
  output: Record<string, unknown>;
};

export const ROUTE_SCHEMAS: Record<string, RouteSchema> = {
  "GET /search": {
    "input": {
      "type": "http",
      "method": "GET",
      "queryParams": {
        "q": {
          "type": "string",
          "description": "Free-text search terms, passed to all three upstreams.",
          "example": "attention is all you need"
        },
        "limit": {
          "type": "integer",
          "description": "Papers to return, 1–25. Each source is asked for this many before merging. Default 10.",
          "example": 5
        }
      },
      "queryParamsRequired": [
        "q"
      ]
    },
    "output": {
      "type": "object",
      "required": [
        "query",
        "count",
        "papers",
        "sources",
        "retrievedAt"
      ],
      "properties": {
        "query": {
          "type": "string"
        },
        "count": {
          "type": "integer",
          "description": "Equals `papers.length`."
        },
        "papers": {
          "type": "array",
          "items": {
            "type": "object",
            "required": [
              "title",
              "authors",
              "source"
            ],
            "properties": {
              "title": {
                "type": "string"
              },
              "authors": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "year": {
                "type": [
                  "integer",
                  "null"
                ]
              },
              "venue": {
                "type": [
                  "string",
                  "null"
                ],
                "description": "Journal, conference, or `arXiv`."
              },
              "doi": {
                "type": [
                  "string",
                  "null"
                ],
                "description": "Feed straight into POST /bibliography."
              },
              "arxivId": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "url": {
                "type": [
                  "string",
                  "null"
                ],
                "format": "uri"
              },
              "abstract": {
                "type": [
                  "string",
                  "null"
                ]
              },
              "citationCount": {
                "type": [
                  "integer",
                  "null"
                ]
              },
              "source": {
                "type": "string",
                "enum": [
                  "arxiv",
                  "crossref",
                  "semantic-scholar"
                ],
                "description": "Which upstream contributed the base record."
              }
            }
          }
        },
        "sources": {
          "type": "object",
          "additionalProperties": {
            "type": "string"
          },
          "description": "`ok`, `rate-limited`, or an error string, keyed by upstream."
        },
        "retrievedAt": {
          "type": "string",
          "format": "date-time"
        }
      }
    }
  },
  "GET /paper/**": {
    "input": {
      "type": "http",
      "method": "GET",
      "pathParams": {
        "id": {
          "type": "string",
          "description": "A DOI (`10.1038/nature14539` — raw slashes are fine), an arXiv id (`1706.03762` or `arXiv:1706.03762`), a Semantic Scholar paper id, or `CorpusId:…`.",
          "example": "10.1038/nature14539"
        }
      },
      "queryParams": {}
    },
    "output": {
      "type": "object",
      "required": [
        "id",
        "resolvedAs",
        "source",
        "retrievedAt"
      ],
      "properties": {
        "id": {
          "type": "string",
          "description": "The identifier you passed."
        },
        "resolvedAs": {
          "type": "string",
          "description": "How it was resolved upstream, e.g. `DOI:10.1038/nature14539`."
        },
        "title": {
          "type": [
            "string",
            "null"
          ]
        },
        "abstract": {
          "type": [
            "string",
            "null"
          ],
          "description": "Abstract, falling back to the TL;DR."
        },
        "tldr": {
          "type": [
            "string",
            "null"
          ]
        },
        "year": {
          "type": [
            "integer",
            "null"
          ]
        },
        "venue": {
          "type": [
            "string",
            "null"
          ]
        },
        "publicationDate": {
          "type": [
            "string",
            "null"
          ]
        },
        "authors": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "externalIds": {
          "type": "object",
          "additionalProperties": true
        },
        "fieldsOfStudy": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "openAccessPdf": {
          "type": [
            "string",
            "null"
          ],
          "format": "uri"
        },
        "citationGraph": {
          "type": "object",
          "properties": {
            "citationCount": {
              "type": [
                "integer",
                "null"
              ]
            },
            "referenceCount": {
              "type": [
                "integer",
                "null"
              ]
            },
            "influentialCitationCount": {
              "type": [
                "integer",
                "null"
              ]
            },
            "topCitations": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": true
              }
            },
            "references": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": true
              }
            }
          }
        },
        "partial": {
          "type": "boolean",
          "description": "True when the Crossref fallback was used (no citation lists)."
        },
        "source": {
          "type": "string",
          "enum": [
            "semantic-scholar",
            "crossref"
          ]
        },
        "retrievedAt": {
          "type": "string",
          "format": "date-time"
        }
      }
    }
  },
  "POST /bibliography": {
    "input": {
      "type": "http",
      "method": "POST",
      "bodyType": "json",
      "bodyFields": {
        "dois": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "minItems": 1,
          "maxItems": 25,
          "description": "DOIs to format."
        },
        "format": {
          "type": "string",
          "enum": [
            "bibtex",
            "apa",
            "both"
          ],
          "default": "both"
        }
      },
      "bodyFieldsRequired": [
        "dois"
      ]
    },
    "output": {
      "type": "object",
      "required": [
        "format",
        "count",
        "entries",
        "retrievedAt"
      ],
      "properties": {
        "format": {
          "type": "string",
          "enum": [
            "bibtex",
            "apa",
            "both"
          ]
        },
        "count": {
          "type": "integer"
        },
        "entries": {
          "type": "array",
          "items": {
            "type": "object",
            "required": [
              "doi",
              "status"
            ],
            "properties": {
              "doi": {
                "type": "string"
              },
              "status": {
                "type": "string",
                "enum": [
                  "ok",
                  "error"
                ]
              },
              "bibtex": {
                "type": "string",
                "description": "BibTeX record from Crossref's transform."
              },
              "apa": {
                "type": "string",
                "description": "APA 7 reference built from structured Crossref metadata."
              },
              "error": {
                "type": "string",
                "description": "Present when `status` is `error`."
              }
            }
          }
        },
        "retrievedAt": {
          "type": "string",
          "format": "date-time"
        }
      }
    }
  },
};
