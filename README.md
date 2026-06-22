# cambrils-calendar-dev

Dev repo for the Cambrils calendar PWA.

## Headroom (token saver)

This project includes [Headroom](https://github.com/chopratejas/headroom) to compress tool outputs and context before they reach the LLM, cutting token use by roughly 60–95%.

### One-time install (on your machine)

```bash
pip install "headroom-ai[proxy,mcp]"
```

Requires Python 3.10+.

### Start Headroom with Cursor

From the project root:

```bash
headroom wrap cursor
```

This starts the local proxy (port 8787), injects RTK token-saving shell rules into `.cursorrules`, and prints the Cursor model base URLs to paste into **Settings → Models**.

For this repo, use:

| Provider | Override base URL |
|----------|-------------------|
| OpenAI | `http://127.0.0.1:8787/p/cambrils-calendar-dev/v1` |
| Anthropic | `http://127.0.0.1:8787/p/cambrils-calendar-dev` |

Keep your normal API keys; Headroom sits in front of the provider.

### MCP tools (already configured)

`.cursor/mcp.json` registers the Headroom MCP server (`headroom_compress`, `headroom_retrieve`, `headroom_stats`). Reload Cursor after install so it picks up the server.

### Check savings

```bash
headroom perf
curl http://127.0.0.1:8787/stats
```

### Docs

- [Headroom docs](https://headroom-docs.vercel.app/docs/quickstart)
- [Proxy mode](https://headroom-docs.vercel.app/docs/proxy)
- [MCP tools](https://headroom-docs.vercel.app/docs/mcp)
