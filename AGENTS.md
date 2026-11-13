# job-hunter-agent

Bot Development Kit (BDK) project (`@cursor/bdk`). This file is
for coding agents editing the project. The served agent's prompt is
`bot/instructions.md`.

## Loop

```bash
bdk validate --dir .
bdk info --dir . --json
bdk run --dir . --message "..."
bdk eval --dir .
npm run check
```

Run the CLI under Node, never Bun.

## Layout

- `bot/instructions.md` is the always-on prompt. Keep it short.
- `bot/tools/<name>.ts` is one tool per file. The filename is the tool name.
- `bot/lib/` is shared code. Never discovered.
- `evals/` is filesystem evals (`evals/evals.config.ts` required).
  Not `bot/evals/`. That path is ignored.

## Do not

- Grow host TypeScript for formatting, classification, or reply composition.
  That stays in instructions/skills. Host code owns auth, idempotency,
  evidence seeding, and side-effect gates.
- Add npm deps on a first cut. Stick to what `@cursor/bdk` already ships.
- Point `serve` at a parent folder during bring-up. It mounts every sibling.

## Pointers

- Package loop: `node_modules/@cursor/bdk/AGENTS.md`
- Skills: `node_modules/@cursor/bdk/skills/` (`create-agent`, `deploy`, `evals`, `hillclimb`, `debug`)
- Docs: `npx @cursor/bdk docs`
- LLM docs index: `node_modules/@cursor/bdk/dist/docs/llms.txt`

## Cloud Agent

Node 22 is on the default image. Install with `npm ci`. Run the CLI under Node, never Bun.

`bdk dev` and `bdk call` refuse to boot when this host has no Cursor credential, because `bot/mcp-connections/account.ts` declares an optional Canva account connection. `SERPAPI_API_KEY` is optional and only enables Google Jobs. Without a credential, serve on loopback:

```bash
npx bdk dev --host 127.0.0.1 --port 3000 --allow-anonymous --allow-anonymous-cursor-account-mcp
```

The environment start script launches that server when the playground is down. It listens at `http://127.0.0.1:3000/job-hunter-agent/playground`. Call tools against that agent URL:

```bash
npx bdk call search_jobs --url http://127.0.0.1:3000/job-hunter-agent --input '{"regions":["armenia"],"sources":["staffam"]}'
```
