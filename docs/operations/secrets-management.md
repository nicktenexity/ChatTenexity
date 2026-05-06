# ChatTenexity Secrets Management

## Source of Truth

Doppler is the source of truth for ChatTenexity application secrets.

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

- `OPENAI_API_KEY`: primary model provider for ChatTenexity demo modes.
- `ANTHROPIC_API_KEY`: secondary model provider for workshop-style demo modes.
- `RAG_OPENAI_API_KEY`: embedding/retrieval key for the LibreChat RAG API.

App/runtime config:

- `APP_TITLE`
- `CUSTOM_FOOTER`
- `CONFIG_PATH`
- `DOMAIN_CLIENT`
- `DOMAIN_SERVER`
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
doppler secrets get ANTHROPIC_API_KEY --project chattenexity --config prd --plain | railway variable set --service LibreChat --stdin ANTHROPIC_API_KEY
doppler secrets get RAG_OPENAI_API_KEY --project chattenexity --config prd --plain | railway variable set --service "RAG API" --stdin RAG_OPENAI_API_KEY
```

Non-secret or low-sensitivity runtime variables:

```bash
railway variable set --service LibreChat \
  APP_TITLE=ChatTenexity \
  CUSTOM_FOOTER="ChatTenexity demo workspace" \
  CONFIG_PATH=https://raw.githubusercontent.com/nicktenexity/ChatTenexity/main/librechat.tenexity.yaml \
  ALLOW_EMAIL_LOGIN=true \
  ALLOW_REGISTRATION=true \
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
- Decide on a custom domain, for example `chat.tenexity.ai`, then set `DOMAIN_CLIENT` and `DOMAIN_SERVER` to that domain.
- After demo accounts are created, set `ALLOW_REGISTRATION=false`.
- Before broader public use, consider setting `BAN_VIOLATIONS=true` again and testing from a normal browser.
- Add SMTP/email provider credentials if you want production email verification and password reset.
- Add a search provider key such as Tavily or Serper if web-search demos should be reliable.
