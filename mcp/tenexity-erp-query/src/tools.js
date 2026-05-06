import { z } from 'zod';
import { audit } from './audit.js';
import { runReadQuery, describeSchema } from './db.js';
import { maskedProfile } from './config.js';
import { parseTableMap, buildInventorySql, buildOrderRiskSql } from './tableMap.js';

const text = (payload) => ({
  content: [
    {
      type: 'text',
      text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
    },
  ],
});

export function registerErpTools(server, config) {
  server.tool('erp_connection_profile', {}, async () =>
    text({
      profile: maskedProfile(config),
      guardrails: [
        'Read-only SELECT/WITH/EXPLAIN SQL only.',
        'No comments, multi-statement SQL, DDL, DML, stored procedures, shell/file access, or privilege changes.',
        'Every query is wrapped with a server-side row limit.',
        'Columns matching configured PII patterns are redacted before returning to the model.',
        'Use ERP_TABLE_MAP_JSON for stable manufacturing and distribution domain queries.',
      ],
      configuredDomains: Object.keys(parseTableMap(config.tableMapJson)),
    }),
  );

  server.tool(
    'erp_schema_map',
    {
      schema: z.string().optional().describe('Database schema to inspect, e.g. public or dbo.'),
      tablePattern: z
        .string()
        .optional()
        .describe('Optional SQL LIKE pattern such as item% or %order%.'),
      limit: z.number().int().positive().optional(),
    },
    async (input) => {
      await audit(config, { tool: 'erp_schema_map', input });
      return text(await describeSchema(config, input));
    },
  );

  server.tool(
    'erp_run_read_query',
    {
      sql: z
        .string()
        .describe('Read-only SELECT/WITH/EXPLAIN SQL. It will be validated and wrapped with a row limit.'),
      params: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
      limit: z.number().int().positive().optional(),
      businessQuestion: z
        .string()
        .optional()
        .describe('Plain-English business question this SQL is meant to answer.'),
    },
    async ({ businessQuestion, ...query }) => {
      await audit(config, { tool: 'erp_run_read_query', businessQuestion, sql: query.sql });
      return text(await runReadQuery(config, query));
    },
  );

  server.tool(
    'erp_inventory_position',
    {
      sku: z.string().optional().describe('Optional SKU/item code filter.'),
      location: z.string().optional().describe('Optional warehouse/location filter.'),
      limit: z.number().int().positive().optional(),
    },
    async (input) => {
      const tableMap = parseTableMap(config.tableMapJson);
      const sql = buildInventorySql({ tableMap, dialect: config.dialect, ...input });
      await audit(config, { tool: 'erp_inventory_position', input, sql });
      return text(await runReadQuery(config, { sql, limit: input.limit }));
    },
  );

  server.tool(
    'erp_order_risk',
    {
      customer: z.string().optional().describe('Optional exact customer filter.'),
      daysLate: z.number().int().nonnegative().optional().describe('Only include orders at least this many days late.'),
      limit: z.number().int().positive().optional(),
    },
    async (input) => {
      const tableMap = parseTableMap(config.tableMapJson);
      const sql = buildOrderRiskSql({ tableMap, dialect: config.dialect, ...input });
      await audit(config, { tool: 'erp_order_risk', input, sql });
      return text(await runReadQuery(config, { sql, limit: input.limit }));
    },
  );
}
