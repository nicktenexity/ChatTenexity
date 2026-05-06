import { clampLimit, limitedSql, redactRows } from './guardrails.js';

export async function runReadQuery(config, { sql, params = [], limit }) {
  const rowLimit = clampLimit(limit, config);
  const query = limitedSql(sql, config.dialect, rowLimit);
  const rows = await execute(config, query, params);

  return {
    dialect: config.dialect,
    rowLimit,
    rowCount: rows.length,
    columns: rows[0] ? Object.keys(rows[0]) : [],
    rows: redactRows(rows, config.piiPatterns),
  };
}

export async function describeSchema(config, { schema, tablePattern, limit = 200 }) {
  if (!config.allowSchemaIntrospection) {
    throw new Error('Schema introspection is disabled for this ERP MCP server.');
  }

  const targetSchema = schema || config.allowedSchemas[0];
  if (!config.allowedSchemas.includes(targetSchema)) {
    throw new Error(`Schema "${targetSchema}" is not in ERP_ALLOWED_SCHEMAS.`);
  }

  const params = config.dialect === 'postgres' ? [targetSchema] : [targetSchema];
  let sql;

  if (config.dialect === 'mssql') {
    sql = `
      SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name, COLUMN_NAME AS column_name, DATA_TYPE AS data_type
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ${mssqlLiteral(targetSchema)}
      ${tablePattern ? `AND TABLE_NAME LIKE ${mssqlLiteral(tablePattern)}` : ''}
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `;
    return runReadQuery(config, { sql, params: [], limit });
  }

  sql = `
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = ${config.dialect === 'mysql' ? '?' : '$1'}
    ${tablePattern ? `AND table_name LIKE ${config.dialect === 'mysql' ? '?' : '$2'}` : ''}
    ORDER BY table_schema, table_name, ordinal_position
  `;

  return runReadQuery(config, {
    sql,
    params: tablePattern ? [...params, tablePattern] : params,
    limit,
  });
}

async function execute(config, sql, params) {
  if (!config.connectionString && !config.host) {
    throw new Error('ERP database connection is not configured. Set ERP_DATABASE_URL or ERP_DB_HOST credentials.');
  }

  if (config.dialect === 'postgres') {
    const { Client } = await import('pg');
    const client = new Client(
      config.connectionString
        ? { connectionString: config.connectionString, ssl: config.ssl ? { rejectUnauthorized: false } : undefined }
        : {
            host: config.host,
            port: config.port ? Number(config.port) : undefined,
            database: config.database,
            user: config.user,
            password: config.password,
            ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
          },
    );
    await client.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      await client.end();
    }
  }

  if (config.dialect === 'mysql') {
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection(
      config.connectionString || {
        host: config.host,
        port: config.port ? Number(config.port) : undefined,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl ? {} : undefined,
      },
    );
    try {
      const [rows] = await connection.execute(sql, params);
      return rows;
    } finally {
      await connection.end();
    }
  }

  if (config.dialect === 'mssql') {
    const mssql = await import('mssql');
    const pool = await mssql.connect(
      config.connectionString || {
        server: config.host,
        port: config.port ? Number(config.port) : undefined,
        database: config.database,
        user: config.user,
        password: config.password,
        options: {
          encrypt: config.ssl,
          trustServerCertificate: !config.ssl,
        },
      },
    );
    try {
      const request = pool.request();
      params.forEach((value, index) => request.input(`p${index}`, value));
      const result = await request.query(sql);
      return result.recordset;
    } finally {
      await pool.close();
    }
  }

  throw new Error(`Unsupported ERP_DB_DIALECT: ${config.dialect}`);
}

function mssqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
