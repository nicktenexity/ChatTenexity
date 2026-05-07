# Client Demo and Production Plan

## Current Demo Position

Tenexity AI Workspace is live at `https://chat.tenexity.ai` as a branded ChatGPT workspace.

The demo should position the product in two layers:

1. Working now: a Tenexity-branded ChatGPT workspace for questions, drafting, planning, file review, and artifacts.
2. Implementation next: governed source connections that let the assistant answer from company systems and act through approved tools.

This is stronger than claiming every connector is already live. The product works today, and the implementation path is clear.

## What People Do With It

Users can:

- Ask business questions.
- Draft emails, proposals, plans, reports, and client follow-ups.
- Upload working files and ask for summaries, risks, next steps, and rewritten artifacts.
- Use a clean ChatGPT-only experience without choosing models or providers.
- See the connected-source roadmap directly in the workspace readiness panel.

Future connected users will also be able to:

- Ask questions from approved Drive, SharePoint, Dropbox, email, calendar, CRM, and SQL sources.
- Use Teams as a fast chat surface for the same assistant.
- Run read-only operational queries through governed database tools.
- Draft updates for email, calendar, CRM, and documents before a human approves sending or writing.

## How To Share It

Use:

```text
https://chat.tenexity.ai
```

Recommended sharing pattern:

- Create named demo accounts for each client or stakeholder.
- Keep public registration disabled after those accounts exist.
- Do not store demo passwords in the repo.
- Do not share admin credentials.
- Use sanitized sample files for the demo.
- Keep source connectors read-only or mocked until the client approves real access.

## 15-Minute Demo Flow

1. Sign in and show the Tenexity-branded workspace.
2. Point out that the model experience is intentionally simplified to ChatGPT.
3. Ask a business prompt:

```text
Create a client follow-up email after a discovery call where they need help connecting SharePoint, Salesforce, and SQL data.
```

4. Ask for structured planning:

```text
Turn this into a 30-day implementation plan with owners, risks, validation checks, and client decisions needed.
```

5. Upload a sanitized document, then ask:

```text
Summarize this for an executive sponsor. Pull out risks, action items, open questions, and a follow-up email.
```

6. Show the readiness panel:
   - ChatGPT is live.
   - Files are ready for demo.
   - Teams has code in place but needs Azure setup.
   - Sources have a catalog and implementation path.
   - Access should be invite-only for client demos.

7. Close with the implementation path:

```text
The web app is the front door. The next step is connecting the client's approved systems, starting with the two or three sources that matter most.
```

## Production Work Remaining

### Access and Trust

- Keep `ALLOW_REGISTRATION=false`.
- Create named demo/client users.
- Configure SMTP so password reset and verification work.
- Decide whether each client needs a separate deployment, tenant, or shared demo environment.
- Add terms/privacy links before broad external use.

### Source Connections

Prioritize the first client source set instead of enabling every connector at once.

Recommended order:

1. Document source: Google Drive or SharePoint.
2. Communication source: Gmail/Calendar or Outlook/Calendar.
3. Operating source: Salesforce or SQL reporting database.

Each connector needs:

- OAuth or read-only service credentials.
- Scope selection.
- Permission-aware ingestion.
- Tool-call audit logging.
- Draft-before-write guardrails.
- Refresh/sync schedule.

### Teams

Code exists for:

- `POST /api/teams/messages`
- `GET /api/teams/health`
- Fast OpenAI-backed Teams answers.

Still needed:

- Azure Bot registration.
- Teams channel enablement.
- App manifest packaging with icons.
- Doppler/Railway Teams variables.
- Tenant install and live Teams smoke test.

### Monitoring

- Railway deploy and runtime logs.
- OpenAI usage and cost tracking.
- Basic error tracking.
- Connector sync logs once sources are enabled.
- Audit logs for tool calls and future write proposals.

## Demo Readiness Checklist

- `https://chat.tenexity.ai/health` returns `OK`.
- Login works with a named demo account.
- Registration is disabled.
- ChatGPT returns a response.
- New-chat landing shows readiness tiles.
- File upload demo works with a sanitized document.
- `/api/tenexity/readiness` works after login.
- Teams health endpoint exists, even if not configured yet.
- Client-facing prompts are ready in `docs/demo/demo-prompts.md`.
