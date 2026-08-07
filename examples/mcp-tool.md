# Exposing x402-research as an MCP tool

[MCP](https://modelcontextprotocol.io) lets Claude (and other MCP clients) call
this service directly. The wrapper below holds the wallet, pays the x402
invoice, and hands the artifact straight back to the model.

## Minimal server

```ts
// mcp-x402-research.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSigner, wrapFetchWithPayment } from "x402-fetch";
import { z } from "zod";

const BASE_URL = process.env.RESEARCH_URL ?? "http://localhost:4021";

const signer = await createSigner("base-sepolia", process.env.PRIVATE_KEY!);
const payFetch = wrapFetchWithPayment(fetch, signer);

const server = new McpServer({ name: "x402-research", version: "0.1.0" });

server.tool(
  "search_papers",
  "Ranked scholarly search across arXiv, Crossref, and Semantic Scholar",
  {
    q: z.string().describe("Free-text search terms, passed to all three upstreams."),
    limit: z.number().optional().describe("Papers to return, 1–25. Each source is asked for this many before merging. Default 10."),
  },
  async (args) => {
    const url = `${BASE_URL}/search?q=${encodeURIComponent(args.q)}&limit=${args.limit ?? 10}`;
    const res = await payFetch(url);
    if (!res.ok) throw new Error(`GET /search → ${res.status}`);
    return { content: [{ type: "text", text: JSON.stringify(await res.json(), null, 2) }] };
  },
);

server.tool(
  "get_paper",
  "Paper metadata, abstract, TL;DR, and a two-sided citation graph",
  {
    id: z.string().describe("A DOI (`10.1038/nature14539` — raw slashes are fine), an arXiv id (`1706.03762` or `arXiv:1706.03762`), a Semantic Scholar paper id, or `CorpusId:…`."),
  },
  async (args) => {
    const url = `${BASE_URL}/paper/${encodeURIComponent(args.id)}`;
    const res = await payFetch(url);
    if (!res.ok) throw new Error(`GET /paper/:id → ${res.status}`);
    return { content: [{ type: "text", text: JSON.stringify(await res.json(), null, 2) }] };
  },
);

server.tool(
  "build_bibliography",
  "Formatted BibTeX and APA entries for a list of DOIs",
  {
    dois: z.string().describe("DOIs to format. De-duplicated; capped at 25 per call."),
    format: z.string().optional().describe("Output format. Default `both`."),
  },
  async (args) => {
    const url = `${BASE_URL}/bibliography`;
    const res = await payFetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dois: args.dois, format: args.format ?? "both" }),
    });
    if (!res.ok) throw new Error(`POST /bibliography → ${res.status}`);
    return { content: [{ type: "text", text: JSON.stringify(await res.json(), null, 2) }] };
  },
);

await server.connect(new StdioServerTransport());
```

## Wire it into Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402-research": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp-x402-research.ts"],
      "env": {
        "PRIVATE_KEY": "0xYourFundedTestKey",
        "RESEARCH_URL": "http://localhost:4021"
      }
    }
  }
}
```

## Spending caps

Each GET /search call costs $0.002. Wrap `payFetch` with a
budget so a runaway loop cannot drain the wallet:

```ts
let spentMicros = 0;
const CAP_MICROS = 1_000_000; // $1.00

const cappedFetch: typeof fetch = async (input, init) => {
  if (spentMicros >= CAP_MICROS) throw new Error("x402 spend cap reached");
  const res = await payFetch(input, init);
  const receipt = res.headers.get("X-PAYMENT-RESPONSE");
  if (receipt) {
    const { amount } = JSON.parse(Buffer.from(receipt, "base64").toString());
    spentMicros += Number(amount ?? 0);
  }
  return res;
};
```

## Notes

- The tool descriptions above come from [`skill.md`](../skill.md) — keep them in
  sync so the model knows exactly what it is buying.
- Paying on Solana instead? Swap `x402-fetch` for a Solana x402 client; the 402
  challenge already advertises the `solana` rail, so nothing on this
  server changes.
- Discovery for autonomous agents: [`/.well-known/x402`](../public/.well-known/x402).
