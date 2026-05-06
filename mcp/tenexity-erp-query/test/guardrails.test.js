import test from 'node:test';
import assert from 'node:assert/strict';
import { assertReadOnlySql, limitedSql, redactRows } from '../src/guardrails.js';
import { buildInventorySql } from '../src/tableMap.js';

test('accepts a read-only select', () => {
  assert.equal(assertReadOnlySql('select item, qty from inventory'), 'select item, qty from inventory');
});

test('rejects write SQL', () => {
  assert.throws(() => assertReadOnlySql('update item set qty = 0'), /Only SELECT/);
  assert.throws(() => assertReadOnlySql('select * from item; drop table item'), /Multiple SQL/);
  assert.throws(() => assertReadOnlySql('with x as (delete from item returning *) select * from x'), /delete/);
});

test('wraps SQL with dialect-specific row limit', () => {
  assert.equal(
    limitedSql('select * from inventory', 'postgres', 25),
    'SELECT * FROM (select * from inventory) AS tenexity_limited LIMIT 25',
  );
  assert.equal(
    limitedSql('select * from inventory', 'mssql', 25),
    'SELECT TOP (25) * from inventory',
  );
});

test('redacts PII-looking columns', () => {
  assert.deepEqual(redactRows([{ customer_email: 'a@example.com', qty: 4 }], ['email']), [
    { customer_email: '[redacted]', qty: 4 },
  ]);
});

test('builds mapped inventory SQL', () => {
  const sql = buildInventorySql({
    dialect: 'postgres',
    sku: 'ABC-123',
    tableMap: {
      inventory: {
        table: 'public.inventory',
        sku: 'sku',
        location: 'warehouse',
        qty_on_hand: 'qty_on_hand',
        qty_available: 'qty_available',
        updated_at: 'updated_at',
      },
    },
  });

  assert.match(sql, /FROM "public"."inventory"/);
  assert.match(sql, /"sku" = 'ABC-123'/);
  assert.match(sql, /ORDER BY "updated_at" DESC/);
});
