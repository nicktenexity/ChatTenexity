# Tenexity ERP Database Query Design

## Goal

Tenexity AI Workspace should be able to ask operational questions against a live manufacturing or distribution ERP database without turning the chat app into an unsafe SQL console.

The pattern is:

1. Connect to a read replica or read-only reporting user.
2. Expose a small MCP service with read-only ERP tools.
3. Give agents business-domain tools first and raw SQL only as a controlled fallback.
4. Return source tables, assumptions, row limits, and data-quality warnings with every answer.
5. Use the result to create reports, dashboards, presentation material, and follow-up investigations.

## Implemented Surface

The first implementation lives at:

- `mcp/tenexity-erp-query`

It provides a standalone MCP server with HTTP and stdio transport modes.

Tools:

- `erp_connection_profile`: shows the configured ERP profile and guardrails without exposing secrets.
- `erp_schema_map`: inspects allowed schemas through `information_schema`.
- `erp_run_read_query`: runs validated read-only SQL with server-side row limits and PII redaction.
- `erp_inventory_position`: uses a configured table map to answer inventory-on-hand and availability questions.
- `erp_order_risk`: uses a configured table map to find open/late sales orders and fulfillment risk.

The LibreChat config also includes an `ERP Database Analyst` model mode that is trained to use these tools and produce dashboard/report-ready outputs.

## Guardrails

The MCP service enforces:

- Only `SELECT`, `WITH`, and `EXPLAIN` statements.
- No SQL comments, multi-statement SQL, DDL, DML, stored procedures, privilege changes, shell/file access, or bulk export phrases.
- Server-side row limits through `ERP_QUERY_MAX_ROWS`.
- PII redaction based on column-name patterns such as email, phone, address, tax ID, bank, and account number.
- Optional JSONL audit logging through `ERP_QUERY_AUDIT_LOG`.
- Schema allow-listing through `ERP_ALLOWED_SCHEMAS`.

This is still not a substitute for database-level controls. Production connections should always use a read-only user pointed at a reporting replica or BI-safe schema.

## Supported Database Shapes

The MCP service supports:

- Postgres
- MySQL / MariaDB
- SQL Server

This covers common ERP/reporting patterns:

- ERPNext/Frappe on MariaDB or Postgres-compatible reporting extracts.
- Microsoft Dynamics / Business Central reporting databases on SQL Server.
- NetSuite, SAP, Oracle, or Epicor exports landed into a warehouse/reporting database.
- Custom distributor databases with inventory, order, purchase, and shipment tables.

## Doppler Variables

Required for a live connection:

```bash
ERP_DB_DIALECT=postgres
ERP_DATABASE_URL=postgres://readonly_user:password@host:5432/reporting
ERP_QUERY_MAX_ROWS=250
ERP_QUERY_DEFAULT_ROWS=100
ERP_ALLOWED_SCHEMAS=public
ERP_PROFILE_NAME="Client ERP Reporting Replica"
```

Use separate fields instead of `ERP_DATABASE_URL` when preferred:

```bash
ERP_DB_HOST=...
ERP_DB_PORT=5432
ERP_DB_NAME=...
ERP_DB_USER=...
ERP_DB_PASSWORD=...
ERP_DB_SSL=true
```

Optional:

```bash
ERP_MCP_API_KEY=...
ERP_QUERY_AUDIT_LOG=/data/erp-query-audit.jsonl
ERP_PII_PATTERNS=email,phone,address,ssn,tax_id,bank,account_number
```

## Table Map

Domain tools need a table map because every ERP names tables differently.

Example:

```json
{
  "inventory": {
    "table": "public.item_location_inventory",
    "sku": "item_code",
    "item_description": "item_description",
    "location": "location_code",
    "qty_on_hand": "qty_on_hand",
    "qty_available": "qty_available",
    "qty_allocated": "qty_allocated",
    "reorder_point": "reorder_point",
    "updated_at": "updated_at"
  },
  "sales_orders": {
    "table": "public.sales_order_header",
    "order_number": "order_number",
    "customer": "customer_name",
    "status": "status",
    "promise_date": "promise_date",
    "amount": "order_total"
  }
}
```

Store it in Doppler as `ERP_TABLE_MAP_JSON`.

## Railway Deployment

Deploy `mcp/tenexity-erp-query` as a separate Railway service.

Start command:

```bash
npm install && npm start
```

Health check:

```bash
curl https://your-erp-mcp.railway.app/health
```

MCP endpoint:

```text
https://your-erp-mcp.railway.app/mcp
```

After it is deployed, add this to `librechat.tenexity.yaml`:

```yaml
mcpServers:
  tenexity-erp:
    type: streamable-http
    url: "${TENEXITY_ERP_MCP_URL}"
    timeout: 120000
    chatMenu: true
    serverInstructions: "Read-only ERP database tools for manufacturing and distribution analysis. Use domain tools before raw SQL."
    apiKey:
      source: admin
      authorization_type: bearer
      key: "${TENEXITY_ERP_MCP_API_KEY}"
```

Then set:

```bash
TENEXITY_ERP_MCP_URL=https://your-erp-mcp.railway.app/mcp
TENEXITY_ERP_MCP_API_KEY=...
```

Do not enable the MCP server in LibreChat until the service URL and API key exist; otherwise config validation can fail.

## Example Questions

Inventory:

- Which SKUs are below reorder point by branch?
- Which locations have inventory but no demand?
- Which items have negative available quantity?
- Which SKUs are stocked in the wrong region relative to open orders?

Sales order risk:

- Which orders are late by promised date?
- Which customers have the highest open-order dollars at risk?
- Which orders are blocked because of stockouts?
- Which lines can ship today if we split partials?

Purchasing:

- Which purchase orders are late against expected receipt date?
- Which vendors are causing the most stockout exposure?
- What should be expedited this week?

Manufacturing:

- Which work orders are behind schedule?
- Which components are constraining production?
- Where are yield or scrap rates outside normal range?

Dashboard output:

- Inventory health by branch.
- Open order aging.
- Fulfillment risk by customer.
- PO expedite queue.
- Work-order constraint board.

## Answer Format

Agents should answer live ERP questions with:

1. Direct answer.
2. Source tables and fields used.
3. Query/filter summary.
4. Data-quality caveats.
5. Operational interpretation.
6. Recommended next action.
7. Dashboard or artifact spec when requested.
