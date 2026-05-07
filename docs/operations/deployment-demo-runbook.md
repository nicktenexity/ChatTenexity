# Tenexity AI Workspace Deployment and Demo Runbook

## Current Live Target

- Railway project: `ChatTenexity`
- Railway environment: `production`
- App service: `LibreChat`
- Public app URL: `https://chat.tenexity.ai`
- Railway fallback URL: `https://librechat-production-43c8.up.railway.app`
- Config URL: `https://raw.githubusercontent.com/tenexity/ChatTenexity/main/librechat.tenexity.yaml`
- Doppler project/config: `chattenexity` / `prd`

As of May 7, 2026, `https://chat.tenexity.ai` is resolving through Cloudflare DNS to Railway and the app is live.

## What Is Deployed

The Railway LibreChat template provisions the full runtime stack:

- `LibreChat`: the web app and API container.
- `MongoDB`: conversation, user, prompt, and app data.
- `Meilisearch`: conversation/message search.
- `VectorDB`: pgvector-backed store used by the RAG API.
- `RAG API`: document embedding and retrieval service.

## Required Production Variables

Set these on the `LibreChat` service:

- `APP_TITLE=Tenexity AI Workspace`
- `CUSTOM_FOOTER=Tenexity AI Workspace`
- `CONFIG_PATH=https://raw.githubusercontent.com/tenexity/ChatTenexity/main/librechat.tenexity.yaml`
- `DOMAIN_CLIENT=https://chat.tenexity.ai`
- `DOMAIN_SERVER=https://chat.tenexity.ai`
- `OPENAI_MODELS=gpt-5.4-mini`
- `OPENAI_API_KEY`
- `ALLOW_EMAIL_LOGIN=true`
- `ALLOW_REGISTRATION=false` once demo accounts are created.
- `BAN_VIOLATIONS=false` for demos that may be tested from scripts or unusual browsers. Re-enable it before broader public use.

Set this on the `RAG API` service:

- `RAG_OPENAI_API_KEY`

Other model-provider keys are optional. Do not expose additional model presets until the relevant keys exist in Doppler, have been synced to Railway, and have been smoke-tested.

## Recommended Host

Use Railway for this application. LibreChat runs as a long-lived API/web container and depends on MongoDB, Meilisearch, pgvector, persistent uploads, and the RAG API. Railway can host that full service graph in one project. Vercel is a better fit for static/front-end apps and serverless functions; it is not the right primary host for this unmodified LibreChat stack.

Vercel would only make sense if the app were split into a custom static frontend on Vercel plus separately hosted API, MongoDB, Meilisearch, VectorDB, and RAG services. That is more moving parts for no benefit at this stage.

## Custom Domain Flow

1. Re-authenticate Railway locally if needed:

```bash
railway login
```

2. Confirm the repo is linked to the production project:

```bash
railway status
railway service list
```

3. In Railway, open project `ChatTenexity`, service `LibreChat`, then add `chat.tenexity.ai` under the service networking/custom-domain settings.

4. Railway will show the required DNS target. In Cloudflare DNS for `tenexity.ai`, create the record Railway gives you. For a subdomain this is typically a `CNAME`:

```text
Type: CNAME
Name: chat
Value: <Railway-provided target>
Proxy status: DNS only
```

Keep the record DNS-only until Railway verifies the custom domain and issues TLS. After the app is healthy on `https://chat.tenexity.ai`, you can test Cloudflare proxying. If proxying causes redirect, TLS, WebSocket, or upload issues, leave this record DNS-only and let Railway terminate TLS directly.

5. After DNS verifies, set the app domains:

```bash
railway variable set --service LibreChat DOMAIN_CLIENT=https://chat.tenexity.ai
railway variable set --service LibreChat DOMAIN_SERVER=https://chat.tenexity.ai
railway redeploy --service LibreChat --yes
```

6. Validate:

```bash
curl -I https://chat.tenexity.ai
```

Expected result: HTTP `200` with `server: railway-edge`.

## CLI Commands

Check project linkage:

```bash
railway status
railway service list
```

Set non-secret variables:

```bash
railway variable set --service LibreChat APP_TITLE="Tenexity AI Workspace"
railway variable set --service LibreChat CUSTOM_FOOTER="Tenexity AI Workspace"
railway variable set --service LibreChat CONFIG_PATH=https://raw.githubusercontent.com/tenexity/ChatTenexity/main/librechat.tenexity.yaml
railway variable set --service LibreChat DOMAIN_CLIENT=https://chat.tenexity.ai
railway variable set --service LibreChat DOMAIN_SERVER=https://chat.tenexity.ai
railway variable set --service LibreChat OPENAI_MODELS=gpt-5.4-mini
railway variable set --service LibreChat ALLOW_REGISTRATION=false
```

Set secrets without printing them:

```bash
doppler secrets get OPENAI_API_KEY --project chattenexity --config prd --plain | railway variable set --service LibreChat --stdin OPENAI_API_KEY
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

1. Open `https://chat.tenexity.ai`.
2. Sign in with a named demo account. Do not store demo passwords in the repo.
3. Confirm the app defaults to `ChatGPT` and model switching is hidden.
4. Run the demo prompts in [demo-prompts.md](../demo/demo-prompts.md).
5. Confirm `/api/tenexity/readiness` returns the expected authenticated readiness state.

## Demo Readiness Checks

- App URL returns an HTML page.
- Login/register page loads.
- `APP_TITLE` displays as `Tenexity AI Workspace`.
- The app defaults to the single `ChatGPT` mode and model switching is hidden.
- A short prompt to `ChatGPT` returns a normal answer.
- A file upload to `ChatGPT` can be summarized.
- `RAG API` is running with a real `RAG_OPENAI_API_KEY`.
- `/api/tenexity/readiness` reports ChatGPT configured, custom domain ready, Teams code-ready, and registration closed.

## Known Host-Level Blocker

This local Mac does not currently have Docker installed, so local `npm run start:deployed` cannot run here. The live deployment path uses Railway's hosted containers instead.
