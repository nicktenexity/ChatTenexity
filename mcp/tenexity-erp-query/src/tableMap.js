export function parseTableMap(tableMapJson) {
  try {
    const parsed = JSON.parse(tableMapJson || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    throw new Error(`ERP_TABLE_MAP_JSON is invalid JSON: ${error.message}`);
  }
}

export function q(identifier, dialect) {
  const value = String(identifier ?? '');
  if (!/^[A-Za-z_][A-Za-z0-9_.$]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }

  if (value.includes('.')) {
    return value
      .split('.')
      .map((part) => q(part, dialect))
      .join('.');
  }

  return dialect === 'mysql' ? `\`${value}\`` : `"${value}"`;
}

export function requireDomainMap(tableMap, domain, requiredFields) {
  const domainMap = tableMap[domain];
  if (!domainMap || typeof domainMap !== 'object') {
    throw new Error(`ERP table map is missing required domain: ${domain}`);
  }

  for (const field of requiredFields) {
    if (!domainMap[field]) {
      throw new Error(`ERP table map domain "${domain}" is missing field: ${field}`);
    }
  }

  return domainMap;
}

export function buildInventorySql({ tableMap, dialect, sku, location }) {
  const inv = requireDomainMap(tableMap, 'inventory', [
    'table',
    'sku',
    'location',
    'qty_on_hand',
  ]);

  const columns = [
    inv.sku,
    inv.item_description,
    inv.location,
    inv.qty_on_hand,
    inv.qty_available,
    inv.qty_allocated,
    inv.reorder_point,
    inv.updated_at,
  ].filter(Boolean);

  const where = [];
  if (sku) {
    where.push(`${q(inv.sku, dialect)} = ${literal(sku)}`);
  }
  if (location) {
    where.push(`${q(inv.location, dialect)} = ${literal(location)}`);
  }

  return [
    `SELECT ${columns.map((column) => q(column, dialect)).join(', ')}`,
    `FROM ${q(inv.table, dialect)}`,
    where.length ? `WHERE ${where.join(' AND ')}` : '',
    inv.updated_at ? `ORDER BY ${q(inv.updated_at, dialect)} DESC` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildOrderRiskSql({ tableMap, dialect, customer, daysLate }) {
  const orders = requireDomainMap(tableMap, 'sales_orders', [
    'table',
    'order_number',
    'customer',
    'status',
    'promise_date',
  ]);

  const amountColumn = orders.amount ? q(orders.amount, dialect) : 'NULL';
  const where = [`LOWER(${q(orders.status, dialect)}) NOT IN ('closed', 'complete', 'cancelled')`];

  if (customer) {
    where.push(`${q(orders.customer, dialect)} = ${literal(customer)}`);
  }

  if (daysLate != null && Number.isFinite(Number(daysLate))) {
    if (dialect === 'mssql') {
      where.push(`${q(orders.promise_date, dialect)} < DATEADD(day, -${Number(daysLate)}, GETDATE())`);
    } else if (dialect === 'mysql') {
      where.push(`${q(orders.promise_date, dialect)} < CURRENT_DATE - INTERVAL ${Number(daysLate)} DAY`);
    } else {
      where.push(`${q(orders.promise_date, dialect)} < CURRENT_DATE - INTERVAL '${Number(daysLate)} days'`);
    }
  }

  return [
    `SELECT ${q(orders.order_number, dialect)} AS order_number,`,
    `${q(orders.customer, dialect)} AS customer,`,
    `${q(orders.status, dialect)} AS status,`,
    `${q(orders.promise_date, dialect)} AS promise_date,`,
    `${amountColumn} AS amount`,
    `FROM ${q(orders.table, dialect)}`,
    `WHERE ${where.join(' AND ')}`,
    `ORDER BY ${q(orders.promise_date, dialect)} ASC`,
  ].join(' ');
}

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
