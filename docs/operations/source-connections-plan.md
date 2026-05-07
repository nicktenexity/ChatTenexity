# Tenexity Source Connections Plan

## Goal

Tenexity AI Workspace should let a client connect the systems they already use, decide what the assistant is allowed to see or do, and then use those sources as chat tools and indexed knowledge.

The product should make two paths clear:

1. Live tools: the agent can call a connected system in real time.
2. Ingestion: selected source content is indexed for retrieval, synthesis, reporting, and workflow support.

This keeps Tenexity from becoming a generic file upload chat. The workspace becomes a governed operating layer across client systems.

## Current Starting Point

The existing LibreChat configuration already enables the core agent capabilities needed for this:

- Tools and actions.
- File search and RAG.
- Web search.
- Artifacts.
- Subagents.
- OCR.
- User-facing agents and model modes.

The missing layer is the Tenexity connection product:

- A curated connector catalog.
- Client-friendly setup flows.
- Production MCP services for each source family.
- Source ingestion jobs.
- Permission-aware retrieval.
- Admin visibility into connected sources, scopes, sync health, and tool usage.

The current app now exposes an authenticated readiness/catalog surface for demos and future admin UI work:

```text
GET /api/tenexity/readiness
GET /api/tenexity/source-catalog
```

These endpoints intentionally show safe status and catalog metadata only. They do not expose credentials or raw connector secrets.

## Connection Types

### User OAuth Connectors

Use this for systems where access should follow the logged-in user.

Examples:

- Google Drive.
- Gmail.
- Google Calendar.
- Microsoft OneDrive.
- SharePoint.
- Outlook Mail.
- Outlook Calendar.
- Dropbox.

The user clicks "Connect", completes OAuth, chooses what to expose, and the assistant receives only the tools and content that user has authorized.

### Admin Workspace Connectors

Use this for shared systems that should be managed by Tenexity or a client admin.

Examples:

- Salesforce.
- HubSpot.
- NetSuite.
- ERP reporting databases.
- SQL databases.
- Shared SharePoint sites.
- Shared Google Drive folders.

Secrets should live in Doppler and be synced to Railway. The app should show status and metadata, never raw credentials.

### Read-Only Data Connectors

Use this for databases and operational systems where writes would be too risky from chat.

Examples:

- Postgres reporting database.
- SQL Server data warehouse.
- MySQL or MariaDB ERP database.
- Snowflake or BigQuery analytics warehouse.

The recommended pattern is a dedicated MCP service with:

- Read-only database credentials.
- Schema allowlists.
- Row limits.
- PII redaction.
- Query audit logs.
- Business-domain tools before raw SQL.

## Priority Connector Roadmap

### 1. Google Workspace

This should be the first visible client connector because it creates immediate demo value.

Initial tools:

- Search Drive files.
- Read selected documents, sheets, slides, PDFs, and folders.
- Save generated artifacts back to Drive.
- Search Gmail.
- Draft email replies.
- Inspect calendar availability.
- Create draft calendar events or scheduling recommendations.

Initial ingestion:

- Selected Drive folders.
- Selected file types.
- File metadata, owners, modified dates, source links, and permissions.

### 2. SQL and ERP Reporting

This is the highest-value operational connector.

Initial tools:

- Show connection profile and guardrails.
- Inspect allowed schemas.
- Run validated read-only queries.
- Answer inventory, order, fulfillment, purchasing, or manufacturing questions through domain-specific tools.

Initial ingestion:

- Schema metadata.
- Table and field descriptions.
- Saved query outputs only when explicitly configured.

### 3. Microsoft 365

This should follow Google Workspace because many enterprise clients live in Microsoft.

Initial tools:

- Search SharePoint and OneDrive.
- Read selected Office files and PDFs.
- Search Outlook mail.
- Inspect Outlook calendar.

Initial ingestion:

- Selected SharePoint sites.
- Selected OneDrive folders.
- Permission-aware document chunks.

### 4. Salesforce and CRM

This makes the assistant useful for account and sales workflows.

Initial tools:

- Search accounts, contacts, opportunities, cases, and notes.
- Summarize account history.
- Draft follow-up notes or emails.
- Create proposed CRM updates in draft mode.

Initial ingestion:

- Account metadata.
- Opportunity history.
- Case notes.
- Activity summaries.

### 5. Dropbox, Box, and Secondary Storage

These are important but should follow the core workspace and CRM connectors unless a client specifically needs them first.

## Client Discovery Flow

Many clients will not know which systems to connect first. The product should not make them start with a technical connector list. It should start with the outcome they want.

### Step 1: Pick The Business Outcome

Ask the client what they want the workspace to help with:

- Answer questions from company documents.
- Prepare client reports or presentations.
- Search email and meeting history.
- Understand sales accounts and opportunities.
- Analyze operational data.
- Monitor orders, inventory, jobs, or service work.
- Build dashboards.
- Draft follow-ups and action plans.

The app can map each outcome to recommended source connections.

Example:

| Client says                                             | Recommended sources                           |
| ------------------------------------------------------- | --------------------------------------------- |
| "We want the assistant to answer from our company docs" | Drive, SharePoint, OneDrive, Dropbox          |
| "We want sales/account intelligence"                    | Salesforce, Gmail or Outlook, Calendar, Drive |
| "We want operational answers"                           | SQL database, ERP, warehouse, CSV exports     |
| "We want proposal and report generation"                | Drive, CRM, email, calendar                   |
| "We want meeting follow-up automation"                  | Calendar, email, Drive or SharePoint          |

### Step 2: Identify The Source Of Truth

For each outcome, ask:

- Where does this information live today?
- Who owns that system?
- Is the source personal, team-wide, or company-wide?
- Is it safe for Tenexity to read directly, or should it use exports first?
- Does the assistant need live access, indexed access, or both?

This turns vague requests into a connection plan.

### Step 3: Choose Access Mode

Each source should be classified before connecting:

| Access mode          | Best for                           | Example                                   |
| -------------------- | ---------------------------------- | ----------------------------------------- |
| User OAuth           | Personal or permissioned user data | A user connects their own Gmail and Drive |
| Admin OAuth          | Shared business systems            | Client admin connects Salesforce          |
| Service account      | Managed company repositories       | Shared Drive or SharePoint ingestion      |
| Read-only credential | Databases and ERP systems          | SQL Server reporting user                 |
| Export-first         | High-risk or early discovery       | CSV, XLSX, PDF, or data extract upload    |

If the client does not know what is safe, start with export-first or read-only access.

### Step 4: Define What The Assistant Can Do

The setup flow should separate read, index, draft, and write permissions.

Default posture:

- Read: allowed after source approval.
- Index: allowed only for selected folders, sites, objects, or schemas.
- Draft: allowed for emails, CRM notes, calendar invites, and documents.
- Write: off by default until explicitly approved.

This makes the system feel powerful without making clients nervous about uncontrolled automation.

### Step 5: Show A Connection Readiness Plan

After discovery, the app should generate a plain-English readiness plan:

- Sources to connect first.
- Who needs to approve each source.
- Credentials or OAuth steps needed.
- Data that will be indexed.
- Tools that will become available in chat.
- Risks and recommended guardrails.
- First demo questions to validate the connection.

Example output:

```text
Recommended first connection: Google Drive
Why: Your proposal, onboarding, and service documents already live there.
Access: Admin OAuth or shared-drive service account.
Scope: Connect only the Sales Enablement and Operations folders.
Assistant tools: search files, read docs, summarize folders, cite source links.
Ingestion: nightly sync of PDFs, Docs, Sheets, Slides, and text files.
Guardrails: read-only at launch; no file writes until approved.
Validation prompt: "Build a service proposal outline using our latest onboarding and pricing material."
```

## Product Surface

### Microsoft Teams Chat Surface

Teams should be a lightweight front door into the same governed source tools.

Initial behavior:

- User asks Tenexity AI a question from Teams.
- The bot answers quickly with a concise response.
- The answer links back to the full Tenexity workspace for deeper work.
- Once source connectors are live, the Teams bot should call only the sources the user or workspace has approved.

Do not make Teams the full admin surface. Keep connection setup, scope selection, ingestion review, and write-permission approval in the browser workspace. Teams should be where users ask fast questions and trigger follow-up work.

### Connections Page

Add a first-class Connections area with cards for each source.

Each card should show:

- Source name and icon.
- Connection status.
- Auth mode.
- Owner.
- Scopes.
- Last sync.
- Objects indexed.
- Tools enabled.
- Write mode: off, draft-only, or approved.
- Recent errors.

### Guided Setup

For clients who do not know what to do, setup should start with outcome selection rather than provider selection.

Recommended first screen:

- "What do you want Tenexity to help with?"
- Then show suggested connectors and a readiness checklist.

### Chat Tool Visibility

In the chat composer or side panel, users should see which sources are available:

- Drive.
- Email.
- Calendar.
- Salesforce.
- SQL.
- SharePoint.

The agent should also disclose when it is using a source:

```text
Searching Drive and Salesforce...
Found 4 related documents and 2 open opportunities.
```

## MCP Implementation Pattern

Production source integrations should be exposed through remote MCP services using `streamable-http` where possible.

Each MCP service should provide:

- A small, named set of tools.
- Clear descriptions for model tool selection.
- Auth through OAuth, admin API key, or user-provided API key.
- Health checks.
- Structured errors.
- Audit logging.

Avoid exposing broad raw APIs directly to the model when a safer domain tool would work.

## Ingestion Pattern

Ingestion should be separate from live tool calls.

Recommended flow:

1. Source selected.
2. Auth confirmed.
3. Scope selected: folders, sites, schemas, objects, mail labels, calendars.
4. Crawl job queued.
5. Content extracted and chunked.
6. Metadata and permissions stored with each chunk.
7. Retrieval tests run.
8. Connection card shows indexed count and last sync.

The assistant should cite source links and timestamps whenever answering from indexed content.

## Guardrails

Required for client trust:

- Least-privilege scopes.
- Per-user OAuth for personal data.
- Admin approval for shared data.
- Read-only database access.
- No broad SQL writes.
- No silent email, CRM, calendar, or file writes.
- Draft-before-send for outbound actions.
- Audit logs for every tool call and ingestion job.
- Source citations in answers.
- Permission-aware retrieval.

## MVP Build

### Phase 1: Visible Connection Product

- Add a Connections page.
- Add connector cards for Google Drive, Gmail, Calendar, SharePoint, Salesforce, SQL, and Dropbox.
- Add outcome-first setup guidance.
- Add static readiness states backed by config.

### Phase 2: First Live Connector

- Connect Google Drive through OAuth or an admin-managed MCP service.
- Allow scoped folder selection.
- Expose search and read tools in chat.
- Show source status in the Connections page.

### Phase 3: First Operational Connector

- Deploy a read-only SQL/ERP MCP service.
- Add schema inspection and controlled query tools.
- Add Tenexity database analyst mode guidance.

### Phase 4: Ingestion

- Add background sync for selected Drive folders.
- Store source metadata, permissions, and citations.
- Show indexed object counts and last sync.

### Phase 5: Enterprise Sources

- Add Microsoft 365.
- Add Salesforce.
- Add Dropbox or Box based on client demand.

## First Demo Scenario

The strongest demo flow is:

1. Client chooses "Prepare a client report from our company material."
2. Tenexity recommends Google Drive and CRM.
3. User connects Google Drive.
4. User selects one folder.
5. Tenexity indexes the folder.
6. Chat asks: "Build an executive report from the latest onboarding, pricing, and implementation docs."
7. Assistant searches Drive, cites source docs, produces a report, and offers to save it back as a document.

This demonstrates the full product loop: connect, scope, ingest, reason, cite, and create.
