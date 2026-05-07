# Tenexity AI Workspace Secrets Management

## Source of Truth

Doppler is the source of truth for Tenexity AI Workspace application secrets.

- Doppler project: `chattenexity`
- Doppler production config: `prd`
- Local repo scope: `/Users/np/Documents/GitHub/ChatTenexity`

Check local Doppler scope:

```bash
doppler configure debug --scope /Users/np/Documents/GitHub/ChatTenexity
```

List configured secret names without exposing values:

```bash
doppler secrets --only-names --project chattenexity --config prd
```

## Current Secret Categories

Provider keys:

- `OPENAI_API_KEY`: primary model provider for the current ChatGPT-only production mode.
- `RAG_OPENAI_API_KEY`: embedding/retrieval key for the LibreChat RAG API.

Optional future provider keys:

- `ANTHROPIC_API_KEY`: only needed if Anthropic modes are re-enabled.
- `OPENROUTER_KEY`: only needed if OpenRouter model routing and comparison modes are re-enabled.

Microsoft Teams bot:

- `TEAMS_BOT_ENABLED`: set to `true` only after the Azure Bot registration points to `/api/teams/messages`.
- `TEAMS_BOT_APP_ID`: Microsoft App ID from the Azure Bot registration.
- `TEAMS_BOT_APP_PASSWORD`: Azure Bot client secret.
- `TEAMS_BOT_TENANT_ID`: optional tenant ID for single-tenant deployments.
- `TEAMS_BOT_APP_TYPE`: `SingleTenant` or `MultiTenant`.
- `TEAMS_BOT_MODEL`: fast model for Teams answers, default `gpt-5.4-mini`.
- `TEAMS_BOT_REPLY_TIMEOUT_MS`: response budget before a graceful Teams fallback.
- `TEAMS_BOT_MAX_INPUT_CHARS`: input cap for Teams latency control.

ERP MCP/database secrets:

- `TENEXITY_ERP_MCP_URL`: deployed ERP MCP endpoint, for example `https://.../mcp`.
- `TENEXITY_ERP_MCP_API_KEY`: bearer token LibreChat uses to call the ERP MCP service.
- `ERP_DB_DIALECT`: `postgres`, `mysql`, or `mssql`.
- `ERP_DATABASE_URL`: read-only reporting database URL, or use host/user/password fields.
- `ERP_DB_HOST`, `ERP_DB_PORT`, `ERP_DB_NAME`, `ERP_DB_USER`, `ERP_DB_PASSWORD`, `ERP_DB_SSL`.
- `ERP_TABLE_MAP_JSON`: manufacturing/distribution table map used by domain tools.
- `ERP_QUERY_MAX_ROWS`, `ERP_QUERY_DEFAULT_ROWS`, `ERP_ALLOWED_SCHEMAS`, `ERP_QUERY_AUDIT_LOG`.

App/runtime config:

- `APP_TITLE`
- `CUSTOM_FOOTER`
- `CONFIG_PATH`
- `DOMAIN_CLIENT`
- `DOMAIN_SERVER`
- `OPENAI_MODELS`
- `ALLOW_EMAIL_LOGIN`
- `ALLOW_REGISTRATION`
- `BAN_VIOLATIONS`

Railway/template-generated internal secrets that should be mirrored into Doppler for full recovery:

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CREDS_KEY`
- `CREDS_IV`
- `MEILI_MASTER_KEY`
- MongoDB root/user password or full `MONGO_URI`
- VectorDB/Postgres credentials used by `RAG API`

## Sync Doppler to Railway

Railway currently hosts the runtime. Use Doppler as the source and push values into Railway variables.

```bash
doppler secrets get OPENAI_API_KEY --project chattenexity --config prd --plain | railway variable set --service LibreChat --stdin OPENAI_API_KEY
doppler secrets get RAG_OPENAI_API_KEY --project chattenexity --config prd --plain | railway variable set --service "RAG API" --stdin RAG_OPENAI_API_KEY
```

Non-secret or low-sensitivity runtime variables:

```bash
railway variable set --service LibreChat \
  APP_TITLE="Tenexity AI Workspace" \
  CUSTOM_FOOTER="Tenexity AI Workspace" \
  CONFIG_PATH=https://raw.githubusercontent.com/tenexity/ChatTenexity/main/librechat.tenexity.yaml \
  DOMAIN_CLIENT=https://chat.tenexity.ai \
  DOMAIN_SERVER=https://chat.tenexity.ai \
  OPENAI_MODELS=gpt-5.4-mini \
  ALLOW_EMAIL_LOGIN=true \
  ALLOW_REGISTRATION=false \
  BAN_VIOLATIONS=false
```

Redeploy after changes:

```bash
railway redeploy --service LibreChat --yes
railway redeploy --service "RAG API" --yes
```

## Setup Still Recommended

- Re-authenticate Railway CLI when needed with `railway login`; the local token can expire.
- Mirror the Railway-generated internal secrets into Doppler so the full environment can be recreated from Doppler.
- Add `chat.tenexity.ai` to Railway as a custom domain, create the Cloudflare DNS record Railway provides with proxy status set to DNS-only, then set `DOMAIN_CLIENT` and `DOMAIN_SERVER` to that domain.
- After demo accounts are created, set `ALLOW_REGISTRATION=false`.
- Before broader public use, consider setting `BAN_VIOLATIONS=true` again and testing from a normal browser.
- Add SMTP/email provider credentials if you want production email verification and password reset.
- Add a search provider key such as Tavily or Serper if web-search demos should be reliable.
- Add `OPENROUTER_KEY` or other provider keys only if you want to re-enable additional provider modes. The current production config intentionally exposes only ChatGPT.
