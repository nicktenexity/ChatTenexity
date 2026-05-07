# Microsoft Teams Integration

## Goal

Users should be able to add Tenexity AI to Microsoft Teams and ask questions from a personal chat, group chat, or channel. The first implementation is a Bot Framework endpoint that answers quickly from the configured OpenAI model and points users back to the full Tenexity workspace for deeper work.

This is the right first step because a Teams incoming webhook is only a notification path. A Bot Framework bot supports actual chat interaction, Teams app installation, Microsoft authentication, and direct replies.

Microsoft references:

- Bot Connector authentication: https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication
- Teams bot authentication and Azure Bot registration: https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/add-authentication
- Teams manifest schema: https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema

## Implemented Surface

Runtime endpoint:

```text
POST /api/teams/messages
```

Health endpoint:

```text
GET /api/teams/health
```

Code paths:

- `api/server/routes/teams.js`
- `api/server/services/Teams/answer.js`
- `api/server/services/Teams/bot.js`
- `integrations/teams/manifest.template.json`

The Teams bot currently provides:

- Bot Framework request handling through the Microsoft `botbuilder` SDK.
- A typing indicator before answer generation.
- Fast OpenAI-backed answers through `TEAMS_BOT_MODEL`.
- Short in-memory conversation context per Teams conversation.
- Teams-safe text cleanup and reply chunking.
- A setup/welcome message when added to a conversation.
- A health endpoint that reports whether Teams and answer generation are configured.

## Environment Variables

Required:

```bash
TEAMS_BOT_ENABLED=true
TEAMS_BOT_APP_ID=...
TEAMS_BOT_APP_PASSWORD=...
OPENAI_API_KEY=...
DOMAIN_CLIENT=https://chat.tenexity.ai
```

Optional:

```bash
TEAMS_BOT_TENANT_ID=...
TEAMS_BOT_APP_TYPE=SingleTenant
TEAMS_BOT_MODEL=gpt-5.4-mini
TEAMS_BOT_REPLY_TIMEOUT_MS=18000
TEAMS_BOT_MAX_INPUT_CHARS=6000
TEAMS_BOT_SYSTEM_PROMPT="..."
TEAMS_BOT_HIDE_WORKSPACE_LINK=false
```

Use `SingleTenant` when the bot should only work inside the client's Microsoft tenant. Use `MultiTenant` when the same bot registration should support multiple tenants.

## Doppler Setup

Store the Teams secrets in Doppler first:

```bash
doppler secrets set TEAMS_BOT_ENABLED=true --project chattenexity --config prd --no-interactive
doppler secrets set TEAMS_BOT_APP_ID=... --project chattenexity --config prd --no-interactive
doppler secrets set TEAMS_BOT_APP_PASSWORD=... --project chattenexity --config prd --no-interactive
doppler secrets set TEAMS_BOT_TENANT_ID=... --project chattenexity --config prd --no-interactive
doppler secrets set TEAMS_BOT_APP_TYPE=SingleTenant --project chattenexity --config prd --no-interactive
doppler secrets set TEAMS_BOT_MODEL=gpt-5.4-mini --project chattenexity --config prd --no-interactive
```

Then sync those variables to Railway and redeploy the LibreChat service.

## Azure Bot Setup

1. Create an Azure Bot resource or Bot Framework registration.
2. Set the messaging endpoint to:

```text
https://chat.tenexity.ai/api/teams/messages
```

3. Save the Microsoft App ID and client secret.
4. Put those values into Doppler as `TEAMS_BOT_APP_ID` and `TEAMS_BOT_APP_PASSWORD`.
5. Enable the Microsoft Teams channel for the bot.
6. Redeploy Railway.
7. Confirm:

```bash
curl -s https://chat.tenexity.ai/api/teams/health
```

Expected shape:

```json
{
  "enabled": true,
  "configured": true,
  "botConfigured": true,
  "answerConfigured": true,
  "model": "gpt-5.4-mini",
  "endpoint": "/api/teams/messages"
}
```

## Teams App Package

Start from:

```text
integrations/teams/manifest.template.json
```

Replace:

- `${TEAMS_APP_PACKAGE_ID}` with a stable UUID for the Teams app package.
- `${TEAMS_BOT_APP_ID}` with the Azure Bot Microsoft App ID.

Package the manifest with two icon files:

- `color.png`
- `outline.png`

Then upload the package through the Teams admin center or sideload it in a dev tenant where custom app upload is allowed.

The template enables:

- Personal chat.
- Team/channel scope.
- Group chat scope.
- Commands for ask, summarize, and plan.

## User Experience

In personal chat:

```text
User: What should I do next for the Acme implementation?
Tenexity AI: Here are the practical next steps...
```

In a channel:

```text
User: @Tenexity AI summarize this thread and give us a follow-up plan.
Tenexity AI: Summary...
Next actions...
Open the full workspace: https://chat.tenexity.ai
```

The Teams bot should stay concise. For deeper artifact work, file review, dashboards, or source-connection setup, it should direct the user back to the full Tenexity workspace.

## Latency Strategy

Teams should feel immediate, so this implementation favors:

- A fast default model.
- A typing indicator as soon as a message is received.
- Input truncation for very long messages.
- Short conversation memory.
- Reply timeout with a graceful fallback.
- Chunked replies instead of one oversized Teams message.

Recommended production starting point:

```bash
TEAMS_BOT_MODEL=gpt-5.4-mini
TEAMS_BOT_REPLY_TIMEOUT_MS=18000
TEAMS_BOT_MAX_INPUT_CHARS=6000
```

For higher-quality answers, use a stronger model after basic Teams latency is validated.

## Source Connection Roadmap

The bot is currently a fast chat surface. The next product step is to let the Teams bot call the same governed Tenexity source tools described in `docs/operations/source-connections-plan.md`.

Recommended order:

1. Let Teams answers use indexed Drive/SharePoint content.
2. Let Teams users ask calendar and email questions after OAuth.
3. Let Teams users query approved CRM and SQL/ERP MCP tools.
4. Add "open in Tenexity" links that carry context from the Teams conversation into the browser workspace.

## Guardrails

- Keep Bot Framework authentication enabled through the SDK.
- Do not expose `/api/teams/messages` unless `TEAMS_BOT_ENABLED=true`.
- Use `SingleTenant` for client-specific deployments.
- Keep direct writes off by default.
- Prefer draft-before-send for email, CRM, calendar, and file actions.
- Audit future source-tool calls from Teams the same way browser tool calls are audited.
