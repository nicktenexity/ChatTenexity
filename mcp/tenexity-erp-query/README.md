# Tenexity ERP Query MCP

Read-only MCP server for querying live manufacturing and distribution ERP databases.

## Run Locally

```bash
npm install
ERP_DB_DIALECT=postgres \
ERP_DATABASE_URL=postgres://readonly_user:password@localhost:5432/reporting \
npm start
```

Default HTTP endpoint:

```text
http://localhost:8787/mcp
```

Health:

```bash
curl http://localhost:8787/health
```

For local stdio use:

```bash
MCP_TRANSPORT=stdio npm start
```

## Required Environment

- `ERP_DB_DIALECT`: `postgres`, `mysql`, or `mssql`.
- `ERP_DATABASE_URL` or `ERP_DB_HOST` plus `ERP_DB_NAME`, `ERP_DB_USER`, and `ERP_DB_PASSWORD`.

Recommended:

- `ERP_QUERY_MAX_ROWS=250`
- `ERP_ALLOWED_SCHEMAS=public,dbo`
- `ERP_PROFILE_NAME="Client ERP Reporting Replica"`
- `ERP_TABLE_MAP_JSON='{"inventory":{...},"sales_orders":{...}}'`
- `ERP_MCP_API_KEY=...`

## Tools

- `erp_connection_profile`
- `erp_schema_map`
- `erp_run_read_query`
- `erp_inventory_position`
- `erp_order_risk`

## Production Notes

Use a read-only database user and prefer a reporting replica. This service blocks common write/admin SQL, but database permissions are the real enforcement layer.
