# ChatTenexity Deployment and Demo Runbook

## Current Live Target

- Railway project: `ChatTenexity`
- Railway environment: `production`
- App service: `LibreChat`
- Public app URL: `https://librechat-production-43c8.up.railway.app`
- Config URL: `https://raw.githubusercontent.com/nicktenexity/ChatTenexity/main/librechat.tenexity.yaml`
- Doppler project/config: `chattenexity` / `prd`

## What Is Deployed

The Railway LibreChat template provisions the full runtime stack:

- `LibreChat`: the web app and API container.
- `MongoDB`: conversation, user, prompt, and app data.
- `Meilisearch`: conversation/message search.
- `VectorDB`: pgvector-backed store used by the RAG API.
- `RAG API`: document embedding and retrieval service.

## Required Production Variables

Set these on the `LibreChat` service:

- `APP_TITLE=ChatTenexity`
- `CUSTOM_FOOTER=ChatTenexity demo workspace`
- `CONFIG_PATH=https://raw.githubusercontent.com/nicktenexity/ChatTenexity/main/librechat.tenexity.yaml`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `ALLOW_EMAIL_LOGIN=true`
- `ALLOW_REGISTRATION=true` for demos, then switch to `false` once demo accounts are created.

Set this on the `RAG API` service:

- `RAG_OPENAI_API_KEY`

## CLI Commands

Check project linkage:

```bash
railway status
railway service list
```

Set non-secret variables:

```bash
railway variable set --service LibreChat APP_TITLE=ChatTenexity
railway variable set --service LibreChat CUSTOM_FOOTER="ChatTenexity demo workspace"
railway variable set --service LibreChat CONFIG_PATH=https://raw.githubusercontent.com/nicktenexity/ChatTenexity/main/librechat.tenexity.yaml
```

Set secrets without printing them:

```bash
doppler secrets get OPENAI_API_KEY --project chattenexity --config prd --plain | railway variable set --service LibreChat --stdin OPENAI_API_KEY
doppler secrets get ANTHROPIC_API_KEY --project chattenexity --config prd --plain | railway variable set --service LibreChat --stdin ANTHROPIC_API_KEY
doppler secrets get RAG_OPENAI_API_KEY --project chattenexity --config prd --plain | railway variable set --service "RAG API" --stdin RAG_OPENAI_API_KEY
```

Redeploy after config or secret changes:

```bash
railway redeploy --service LibreChat
railway redeploy --service "RAG API"
```

Inspect deployment health:

```bash
railway service list
railway logs --service LibreChat
railway logs --service "RAG API"
```

## Demo Account Flow

1. Open `https://librechat-production-43c8.up.railway.app`.
2. Register a demo account while `ALLOW_REGISTRATION=true`.
3. Confirm the model selector includes `Tenexity Demo Modes`.
4. Run the demo prompts in [demo-prompts.md](../demo/demo-prompts.md).
5. After creating demo accounts, set `ALLOW_REGISTRATION=false` and redeploy `LibreChat`.

## Demo Readiness Checks

- App URL returns an HTML page.
- Login/register page loads.
- `APP_TITLE` displays as `ChatTenexity`.
- Model selector shows `Tenexity Demo Builder`, `Presentation Studio`, `Report Analyst`, and `Client Workshop`.
- A short prompt to `Presentation Studio` returns a slide outline.
- A file upload to `Report Analyst` can be summarized with citations.
- `RAG API` is running with a real `RAG_OPENAI_API_KEY`.

## Known Host-Level Blocker

This local Mac does not currently have Docker installed, so local `npm run start:deployed` cannot run here. The live deployment path uses Railway's hosted containers instead.
