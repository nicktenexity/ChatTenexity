import fs from 'node:fs/promises';
import crypto from 'node:crypto';

export async function audit(config, event) {
  if (!config.auditLogPath) {
    return;
  }

  const record = {
    ts: new Date().toISOString(),
    id: crypto.randomUUID(),
    profile: config.name,
    dialect: config.dialect,
    ...event,
  };

  await fs.appendFile(config.auditLogPath, `${JSON.stringify(record)}\n`, 'utf8');
}
