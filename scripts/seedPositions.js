'use strict';

/**
 * seedPositions.js
 *
 * One-time seed script that reads data/Positions.csv and creates any
 * positions that don't already exist in the Lasso API.
 *
 * Matching is done by import_name (most specific unique key).
 * Existing records are reported as skipped — no updates are made.
 *
 * Usage:
 *   node scripts/seedPositions.js
 *   node scripts/seedPositions.js --dry-run
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { getAll, lassoClient } = require('../src/api/lassoClient');

const isDryRun = process.argv.includes('--dry-run');
const CSV_PATH = path.join(__dirname, '..', 'data', 'Positions.csv');

// ─── CSV → Position payload ───────────────────────────────────────────────────

function buildPayload(row) {
  const name = row['POSITION NAME'].trim();
  const importName = row['IMPORT NAME'].trim();
  const category = row['CATEGORY'] ? row['CATEGORY'].trim().toLowerCase() : null;
  const rateRaw = row['STANDARD POSITION RATE'] ? row['STANDARD POSITION RATE'].trim() : '';
  const rate1 = rateRaw !== '' ? parseFloat(rateRaw) : null;

  // short_name: strip <SIZE> tags, replace separators, cap at 20 chars
  const shortName = importName
    .replace(/_?<[^>]*>/g, '')
    .replace(/_\/_/g, '-')
    .replace(/[_/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 20) || importName.substring(0, 20);

  const payload = {
    name,
    short_name: shortName,
    import_name: importName,
    ...(category ? { category } : {}),
    ...(rate1 != null && !isNaN(rate1) ? { rate1, rate1_type: 'hourly' } : {}),
  };

  return payload;
}

// ─── Existing position lookup ─────────────────────────────────────────────────

async function loadExistingPositions() {
  console.log('Fetching existing positions from Lasso...');
  const all = await getAll('/positions');
  const byImportName = new Map();
  for (const p of all) {
    if (p.import_name) byImportName.set(p.import_name, p);
  }
  console.log(`  Found ${all.length} existing positions.\n`);
  return byImportName;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.LASSO_API_KEY) {
    console.error('ERROR: LASSO_API_KEY is not set. Copy .env.example to .env.');
    process.exit(1);
  }

  console.log('');
  console.log('Lasso Position Seeder');
  console.log('======================');
  if (isDryRun) console.log('DRY RUN — no changes will be made.\n');

  // Parse CSV
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  const limit = parseInt(process.env.SEED_LIMIT || '0', 10);
  const workingRows = limit > 0 ? rows.slice(0, limit) : rows;
  console.log(`Parsed ${rows.length} positions from ${path.basename(CSV_PATH)}${limit > 0 ? ` (processing first ${workingRows.length})` : ''}\n`);

  const existingByImportName = await loadExistingPositions();

  let created = 0;
  let skipped = 0;
  let errored = 0;

  for (const row of workingRows) {
    const payload = buildPayload(row);

    if (existingByImportName.has(payload.import_name)) {
      console.log(`  [=] SKIP     ${payload.name}`);
      skipped++;
      continue;
    }

    if (isDryRun) {
      console.log(`  [+] WOULD CREATE  ${payload.name}`);
      created++;
      continue;
    }

    try {
      await lassoClient.post('/positions', payload);
      console.log(`  [+] CREATED  ${payload.name}`);
      created++;
    } catch (e) {
      const detail = e.response ? JSON.stringify(e.response.data) : e.message;
      console.error(`  [!] ERROR    ${payload.name} — ${detail}`);
      errored++;
    }
  }

  console.log('');
  console.log('─'.repeat(50));
  console.log(`  Created : ${created}`);
  console.log(`  Skipped : ${skipped} (already exist)`);
  if (errored > 0) console.log(`  Errors  : ${errored}`);
  console.log('');
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  if (err.response) {
    console.error('API status :', err.response.status);
    console.error('API response:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
