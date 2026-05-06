const PROHIBITED_WORDS = [
  'alter',
  'analyze',
  'attach',
  'begin',
  'call',
  'commit',
  'copy',
  'create',
  'delete',
  'detach',
  'drop',
  'execute',
  'grant',
  'insert',
  'merge',
  'replace',
  'revoke',
  'rollback',
  'truncate',
  'update',
  'vacuum',
];

const PROHIBITED_PHRASES = [
  'into outfile',
  'into dumpfile',
  'load_file',
  'pg_read_file',
  'pg_ls_dir',
  'xp_cmdshell',
  'openrowset',
  'opendatasource',
];

export function normalizeSql(sql) {
  return String(sql ?? '').trim().replace(/;+\s*$/, '');
}

export function assertReadOnlySql(sql) {
  const normalized = normalizeSql(sql);
  const lowered = normalized.toLowerCase();

  if (!normalized) {
    throw new Error('SQL is required.');
  }

  if (!/^(select|with|explain)\b/i.test(normalized)) {
    throw new Error('Only SELECT, WITH, and EXPLAIN read queries are allowed.');
  }

  if (/--|\/\*|\*\//.test(normalized)) {
    throw new Error('SQL comments are not allowed in ERP MCP queries.');
  }

  if (normalized.includes(';')) {
    throw new Error('Multiple SQL statements are not allowed.');
  }

  for (const word of PROHIBITED_WORDS) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(normalized)) {
      throw new Error(`Read-only guardrail rejected prohibited keyword: ${word}`);
    }
  }

  for (const phrase of PROHIBITED_PHRASES) {
    if (lowered.includes(phrase)) {
      throw new Error(`Read-only guardrail rejected prohibited phrase: ${phrase}`);
    }
  }

  return normalized;
}

export function clampLimit(limit, config) {
  const requested = Number.parseInt(limit ?? config.defaultRows, 10);
  if (!Number.isFinite(requested) || requested <= 0) {
    return config.defaultRows;
  }
  return Math.min(requested, config.maxRows);
}

export function limitedSql(sql, dialect, limit) {
  const normalized = assertReadOnlySql(sql);
  const safeLimit = Number.parseInt(limit, 10);

  if (/^explain\b/i.test(normalized)) {
    return normalized;
  }

  if (dialect === 'mssql') {
    if (/^select\s+(?!top\b)/i.test(normalized)) {
      return normalized.replace(/^select\s+/i, `SELECT TOP (${safeLimit}) `);
    }
    return `SELECT TOP (${safeLimit}) * FROM (${normalized}) AS tenexity_limited`;
  }

  return `SELECT * FROM (${normalized}) AS tenexity_limited LIMIT ${safeLimit}`;
}

export function isSensitiveColumn(columnName, piiPatterns) {
  const lowered = String(columnName ?? '').toLowerCase();
  return piiPatterns.some((pattern) => lowered.includes(pattern));
}

export function redactRows(rows, piiPatterns) {
  return rows.map((row) => {
    const next = {};
    for (const [key, value] of Object.entries(row)) {
      next[key] = isSensitiveColumn(key, piiPatterns) ? '[redacted]' : value;
    }
    return next;
  });
}
