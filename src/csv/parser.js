'use strict';

const fs = require('fs');
const { parse } = require('csv-parse/sync');

/**
 * Parses SimpleData.csv and returns structured show + call data.
 *
 * CSV structure:
 *   Row 0 (columns): DATA, Job Number, ..., Date, Start Time, End Time, Call Type, Position Title, Position Quantity per Title
 *   Row 1 (VALUE):   Show-level fields populated + first call group's first position
 *   Row 2+:          Blank in show-level columns; Date/Start/End/CallType/Position populated for more positions
 *   Blank rows:      Visual separators — skipped automatically (no Date + no Position Title)
 *
 * Returns:
 *   { show: Object, calls: Array<{ date, startTime, endTime, callType, positions: [{title, quantity}] }> }
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  const rows = parse(content, {
    columns: true,           // use first row as column headers
    skip_empty_lines: false, // keep blank rows so we can detect separators without failing
    trim: true,
    relax_column_count: true,
  });

  // The VALUE row contains all show-level metadata
  const valueRow = rows.find(r => r['DATA'] === 'VALUE');
  if (!valueRow) {
    throw new Error(`No VALUE row found in ${filePath}. Expected a row starting with "VALUE".`);
  }

  // Collect all rows that carry position data (VALUE row + continuation rows)
  const positionRows = rows.filter(r =>
    (r['DATA'] === 'VALUE' || !r['DATA']) &&
    r['Date'] &&
    r['Position Title']
  );

  if (positionRows.length === 0) {
    throw new Error('No position rows found in CSV. At minimum one row must have a Date and Position Title.');
  }

  const calls = groupIntoCalls(positionRows);

  return { show: valueRow, calls };
}

/**
 * Groups position rows into call objects keyed by (Date, Start Time, End Time, Call Type).
 * Uses those four fields as a composite key so identical call types on different dates
 * produce separate groups.
 */
function groupIntoCalls(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = [row['Date'], row['Start Time'], row['End Time'], row['Call Type']].join('||');

    if (!groups.has(key)) {
      groups.set(key, {
        date: row['Date'],
        startTime: row['Start Time'],
        endTime: row['End Time'],
        callType: row['Call Type'],
        positions: [],
      });
    }

    const qty = parseInt(row['Position Quantity per Title'], 10);
    groups.get(key).positions.push({
      title: row['Position Title'],
      quantity: isNaN(qty) ? 1 : qty,
    });
  }

  return Array.from(groups.values());
}

module.exports = { parseCSV };
