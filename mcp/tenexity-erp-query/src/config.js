const DEFAULT_PII_PATTERNS = [
  'email',
  'phone',
  'mobile',
  'fax',
  'ssn',
  'sin',
  'tax_id',
  'ein',
  'address',
  'street',
  'zip',
  'postal',
  'contact',
  'card',
  'bank',
  'account_number',
];

const intFromEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export function getConfig() {
  const dialect = (process.env.ERP_DB_DIALECT ?? 'postgres').toLowerCase();
  const maxRows = intFromEnv('ERP_QUERY_MAX_ROWS', 250);
  const defaultRows = Math.min(intFromEnv('ERP_QUERY_DEFAULT_ROWS', 100), maxRows);
  const piiPatterns = (process.env.ERP_PII_PATTERNS ?? DEFAULT_PII_PATTERNS.join(','))
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return {
    name: process.env.ERP_PROFILE_NAME ?? 'Tenexity ERP Database',
    dialect,
    connectionString: process.env.ERP_DATABASE_URL,
    host: process.env.ERP_DB_HOST,
    port: process.env.ERP_DB_PORT,
    database: process.env.ERP_DB_NAME,
    user: process.env.ERP_DB_USER,
    password: process.env.ERP_DB_PASSWORD,
    ssl: process.env.ERP_DB_SSL === 'true',
    maxRows,
    defaultRows,
    piiPatterns,
    allowSchemaIntrospection: process.env.ERP_ALLOW_SCHEMA_INTROSPECTION !== 'false',
    allowedSchemas: (process.env.ERP_ALLOWED_SCHEMAS ?? 'public,dbo')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    tableMapJson: process.env.ERP_TABLE_MAP_JSON ?? '{}',
    auditLogPath: process.env.ERP_QUERY_AUDIT_LOG ?? '',
    portNumber: intFromEnv('PORT', 8787),
    transport: (process.env.MCP_TRANSPORT ?? 'http').toLowerCase(),
    apiKey: process.env.ERP_MCP_API_KEY ?? '',
  };
}

export function maskedProfile(config) {
  return {
    name: config.name,
    dialect: config.dialect,
    host: config.host ?? null,
    port: config.port ?? null,
    database: config.database ?? null,
    hasConnectionString: Boolean(config.connectionString),
    hasPassword: Boolean(config.password),
    ssl: config.ssl,
    maxRows: config.maxRows,
    defaultRows: config.defaultRows,
    allowSchemaIntrospection: config.allowSchemaIntrospection,
    allowedSchemas: config.allowedSchemas,
    piiPatterns: config.piiPatterns,
  };
}
