/**
 * x402-research — Express server with the dual-rail x402 paywall.
 *
 * Paid routes return the purchased artifact directly in the 200 response body.
 * Buyers pay in USDC on Base (EVM) or on Solana; the 402 challenge advertises
 * both rails and the client picks.
 */
import "dotenv/config";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  facilitatorUrl,
  paywall,
  rails,
  solanaCheckoutRouter,
  usingSuiteDefaultPayTo,
  type RoutePrices,
} from "./payments.js";
import { bibliography, paperDetail, search, UPSTREAMS } from "./service.js";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");

/** Paid routes. Anything not listed here is free. */
const ROUTES: RoutePrices = {
  "GET /search": {
    price: "$0.002",
    description:
      "Ranked scholarly search across arXiv, Crossref, and Semantic Scholar. Returns merged, de-duplicated papers with authors, venue, DOI, abstract, and citation count.",
    outputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        count: { type: "integer" },
        papers: { type: "array", items: { type: "object" } },
        sources: { type: "object" },
      },
    },
  },
  // `**` matches the rest of the path, so DOIs keep their raw slashes:
  // /paper/10.1038/nature14539
  "GET /paper/**": {
    price: "$0.003",
    description:
      "Paper metadata, abstract, TL;DR, and a two-sided citation graph for a DOI, arXiv id, or Semantic Scholar id.",
    outputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        abstract: { type: "string" },
        authors: { type: "array", items: { type: "string" } },
        citationGraph: { type: "object" },
      },
    },
  },
  "POST /bibliography": {
    price: "$0.005",
    description: "Formatted BibTeX and APA 7 entries for a list of DOIs (up to 25 per call).",
    outputSchema: {
      type: "object",
      properties: {
        format: { type: "string" },
        count: { type: "integer" },
        entries: { type: "array", items: { type: "object" } },
      },
    },
  },
};

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

// Dual-rail x402 paywall: USDC on Base or Solana.
app.use(paywall(ROUTES, { service: "x402-research" }));

// Optional: browser (Phantom) Solana checkout helper. No-op when the modal
// package is not installed — agent clients never need it.
const checkoutRouter = await solanaCheckoutRouter();
if (checkoutRouter) app.use("/api/x402-checkout", checkoutRouter);

// Discovery manifest — registered before express.static so it keeps an explicit
// application/json content type (the file has no extension).
app.get("/.well-known/x402", (_req, res) => {
  res.type("application/json").sendFile(join(publicDir, ".well-known", "x402"));
});

// Agent-facing contract and machine spec, served from the repo root.
app.get("/skill.md", (_req, res) => {
  res.type("text/markdown").sendFile(join(root, "skill.md"));
});
app.get("/openapi.json", (_req, res) => {
  res.type("application/json").sendFile(join(root, "openapi.json"));
});

// Static site.
app.use(express.static(publicDir));

// Free: service info.
app.get("/", (_req, res) => {
  res.json({
    name: "x402-research",
    description:
      "Scholarly search over arXiv, Crossref, and Semantic Scholar — papers, citation graphs, formatted bibliographies",
    payment: {
      protocol: "x402",
      note: "Pay in USDC on Base or Solana — your client picks the rail.",
      facilitator: facilitatorUrl(),
      rails: rails(),
    },
    backend: {
      live: true,
      keyless: true,
      upstreams: UPSTREAMS,
      note: "All three sources are keyless and queried live on every request. Optional CONTACT_EMAIL joins Crossref's polite pool; optional S2_API_KEY raises Semantic Scholar limits.",
    },
    routes: {
      "GET /search": {
        price: "$0.002",
        params: "q (required), limit (1-25, default 10)",
        returns: "merged, de-duplicated, citation-ranked papers + per-source status",
      },
      "GET /paper/{id}": {
        price: "$0.003",
        params: "id — DOI, arXiv id, or Semantic Scholar paper id",
        returns: "metadata, abstract, TL;DR, citations and references",
      },
      "POST /bibliography": {
        price: "$0.005",
        params: 'JSON body { dois: string[], format?: "bibtex" | "apa" | "both" }',
        returns: "paste-ready BibTeX and/or APA entries",
      },
      "GET /health": { price: "free" },
      "GET /.well-known/x402": { price: "free" },
      "GET /skill.md": { price: "free" },
      "GET /openapi.json": { price: "free" },
    },
    docs: "https://nirholas.github.io/x402-research/",
    skill: "https://github.com/nirholas/x402-research/blob/main/skill.md",
  });
});

// Free: health check.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Paid: $0.002 — scholarly search. Artifact returned in this response body.
app.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.status(400).json({
      error: "missing_query",
      message: "Query param 'q' is required, e.g. /search?q=diffusion%20models",
    });
    return;
  }
  const limit = req.query.limit != null ? Number(req.query.limit) : 10;
  if (!Number.isFinite(limit) || limit < 1 || limit > 25) {
    res.status(400).json({
      error: "invalid_limit",
      message: "Query param 'limit' must be a number between 1 and 25.",
    });
    return;
  }
  try {
    res.json(await search(q, limit));
  } catch (err) {
    res.status(502).json({
      error: "upstream_error",
      message: err instanceof Error ? err.message : "Upstream request failed",
    });
  }
});

// Paid: $0.003 — paper detail. The regex route lets DOIs keep their raw
// slashes (/paper/10.1038/nature14539) instead of forcing double-encoding.
app.get(/^\/paper\/(.+)$/, async (req, res) => {
  const id = decodeURIComponent((req.params as Record<string, string>)[0] ?? "").trim();
  if (!id) {
    res.status(400).json({ error: "missing_id", message: "Provide a DOI, arXiv id, or S2 paper id." });
    return;
  }
  try {
    res.json(await paperDetail(id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed";
    if (/\b404\b/.test(message)) {
      res.status(404).json({
        error: "paper_not_found",
        id,
        message:
          "No paper matched that identifier. Use a DOI (10.x/…), an arXiv id (1706.03762), or a Semantic Scholar paper id.",
      });
      return;
    }
    res.status(502).json({ error: "upstream_error", message });
  }
});

// Paid: $0.005 — bibliography. Artifact returned in this response body.
app.post("/bibliography", async (req, res) => {
  const body = (req.body ?? {}) as { dois?: unknown; format?: unknown };
  const dois = body.dois;
  if (!Array.isArray(dois) || dois.length === 0 || !dois.every((d) => typeof d === "string")) {
    res.status(400).json({
      error: "invalid_body",
      message: 'POST JSON: { "dois": ["10.1038/nature14539"], "format": "both" }',
    });
    return;
  }
  const format =
    body.format === "bibtex" || body.format === "apa" || body.format === "both"
      ? body.format
      : "both";
  try {
    res.json(await bibliography(dois as string[], format));
  } catch (err) {
    res.status(502).json({
      error: "upstream_error",
      message: err instanceof Error ? err.message : "Upstream request failed",
    });
  }
});

// Unknown route.
app.use((_req, res) => {
  res.status(404).json({ error: "not_found", docs: "https://nirholas.github.io/x402-research/" });
});

const port = Number(process.env.PORT ?? 4021);
app.listen(port, () => {
  const pkg = require("../package.json") as { version: string };
  console.log(`x402-research v${pkg.version} listening on :${port}`);
  console.log("  payment rails:");
  for (const rail of rails()) {
    console.log(
      `    ${rail.rail === "evm" ? "EVM   " : "Solana"}  ${rail.network.padEnd(14)} ${rail.asset} → ${rail.payTo}`,
    );
  }
  console.log(`  facilitator: ${facilitatorUrl()}`);
  if (usingSuiteDefaultPayTo()) {
    console.log(
      "  note:        using suite default payTo — set PAY_TO_ADDRESS/SOLANA_PAY_TO_ADDRESS to receive funds yourself",
    );
  }
  console.log(`  backend:     ${UPSTREAMS.join(", ")} (keyless, live)`);
  console.log("  paid routes:");
  for (const [route, spec] of Object.entries(ROUTES)) {
    console.log(`    ${route.padEnd(28)} ${typeof spec === "string" ? spec : spec.price}`);
  }
  console.log("  free routes: GET /, GET /health, GET /.well-known/x402, GET /skill.md");
});
