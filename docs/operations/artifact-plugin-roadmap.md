# Tenexity Artifact and Plugin Roadmap

## What Works Now

Tenexity AI Workspace already has the right core for a demo:

- Artifacts are enabled in the Tenexity model specs.
- Files and RAG are enabled through the LibreChat RAG API.
- OpenAI and Anthropic provider keys are configured.
- OpenRouter is now wired as a custom endpoint and will become active when `OPENROUTER_KEY` is added to Doppler and Railway.

LibreChat's artifact system can generate React components, HTML, and Mermaid diagrams, and the docs recommend configuring artifacts at the agent/model-spec level for granular control.

Source: https://www.librechat.ai/docs/features/artifacts

## OpenRouter Strategy

OpenRouter should be used as the model gateway for experimentation and model comparison, not as the only provider.

Configured Tenexity OpenRouter modes:

- `OpenRouter Auto`: uses `openrouter/auto` so OpenRouter can choose a strong model for the task.
- `OpenRouter Strategy`: uses Claude through OpenRouter for executive writing and workshop material.
- `OpenRouter Dashboard Builder`: uses Gemini through OpenRouter for analytics-heavy prompts.
- `OpenRouter Artifact Coder`: uses Qwen Coder through OpenRouter for React, HTML, Mermaid, and dashboard artifacts.

Why this is useful:

- OpenRouter supports OpenAI-compatible API calls through `https://openrouter.ai/api/v1`.
- OpenRouter API keys should be stored as secrets and sent as Bearer tokens.
- The Auto Router can select a model for the prompt and report which model was used.

Sources:

- https://www.librechat.ai/docs/quick_start/custom_endpoints
- https://openrouter.ai/docs/api/reference/authentication
- https://openrouter.ai/docs/guides/routing/routers/auto-router

## Recommended Plugin/MCP Stack

For the broader connector product, client discovery flow, access modes, and ingestion plan, see `docs/operations/source-connections-plan.md`.

### 1. Google Drive / Workspace MCP

Use this when the goal is turning client source material into outputs:

- Read source docs, PDFs, spreadsheets, and folders.
- Pull context from client materials.
- Save generated reports or outlines back to a workspace.

This is most valuable when demos need to feel connected to real files rather than pasted prompts.

Sources:

- https://www.mcpstack.org/use/google-drive/mcp-server/with/28
- https://mcp-marketplace.io/server/google-drive

### 2. Chart and Visualization MCP

Use chart-focused MCP servers for dashboard demos:

- Generate chart specs from CSV/XLSX/JSON or database-backed data.
- Produce chart images, specs, or interactive HTML.
- Support report/dashboard prompts such as "build a KPI dashboard from this spreadsheet."

VChart is a good candidate because it exposes chart-generation tools and supports image, spec, and HTML outputs.

Source: https://mcp.directory/servers/vchart

### 3. Browser / Web QA MCP

Use browser automation for demo validation and web artifact QA:

- Open generated dashboard artifacts.
- Capture screenshots.
- Verify links, layout, and rendering.

For Railway production, prefer remote `streamable-http` MCP services over local-only `stdio` tools.

Source: https://www.librechat.ai/docs/features/mcp

### 4. Tenexity Artifact Export MCP

This should be a custom Tenexity MCP service hosted on Railway.

Core tools:

- `create_presentation`: turn a structured slide outline into PPTX.
- `create_report_doc`: turn a report outline into DOCX/PDF.
- `create_dashboard_html`: turn KPI specs into a branded HTML dashboard.
- `create_spreadsheet`: turn assumptions and tables into XLSX.
- `save_to_drive`: write generated artifacts to Google Drive.

This is the highest-leverage custom plugin because LibreChat artifacts are excellent for interactive code/HTML/Mermaid, but client demos often need downloadable PPTX, DOCX, XLSX, and PDF outputs.

### 5. Tenexity ERP Query MCP

Use this for live manufacturing and distribution demos where the agent needs to answer from ERP data instead of uploaded files.

Implemented scaffold:

- `mcp/tenexity-erp-query`
- `docs/operations/erp-database-query-design.md`

Core tools:

- `erp_connection_profile`
- `erp_schema_map`
- `erp_run_read_query`
- `erp_inventory_position`
- `erp_order_risk`

This should be hosted as its own Railway service and connected to LibreChat through a `streamable-http` MCP server after `TENEXITY_ERP_MCP_URL` and `TENEXITY_ERP_MCP_API_KEY` exist.

## Deployment Pattern

Use `streamable-http` MCP servers for anything production-facing. LibreChat's docs describe Streamable HTTP as the better fit for scalable multi-user deployments compared with long-running SSE or local stdio processes.

Source: https://www.librechat.ai/docs/features/mcp

## Proposed Rollout

1. Add `OPENROUTER_KEY` to Doppler and Railway, then redeploy LibreChat.
2. Confirm OpenRouter model modes appear and run a prompt through `OpenRouter Auto`.
3. Add a Google Drive MCP server for source documents and artifact storage.
4. Add a chart MCP server for dashboard/report visualizations.
5. Deploy `tenexity-erp-query` against a read-only ERP reporting replica.
6. Build `tenexity-artifact-export-mcp` as a small Railway service for PPTX/DOCX/XLSX/PDF export.
7. Lock down demo registration and move toward a custom domain.
