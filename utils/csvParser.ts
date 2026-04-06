import { parse } from 'csv-parse/browser/esm/sync'
import type { ParsedJob, ParsedCall } from '../types/index'

interface RawRow extends Record<string, string> { }

function groupIntoCalls(rows: RawRow[]): ParsedCall[] {
  const groups = new Map<string, ParsedCall>()

  for (const row of rows) {
    // Key on Date + CallType only. Positions within the same call may have
    // different start/end times (e.g. supervisor arrives 30 min before crew),
    // so times are stored per-position rather than splitting into extra calls.
    const key = [row['Date'], row['Call Type']].join('||')

    if (!groups.has(key)) {
      groups.set(key, {
        date: row['Date'],
        // Representative times for the call (used in review UI / new-position defaults).
        // Individual positions carry their own precise times.
        startTime: row['Start Time'],
        endTime: row['End Time'],
        callType: row['Call Type'],
        positions: [],
      })
    }

    const qty = parseInt(row['Position Quantity per Title'], 10)
    groups.get(key)!.positions.push({
      title: row['Position Title'],
      quantity: isNaN(qty) ? 1 : qty,
      startTime: row['Start Time'],
      endTime: row['End Time'],
    })
  }

  return Array.from(groups.values())
}

/**
 * Parses a CSV string and returns an array of job objects.
 * Supports multiple jobs in a single file (multiple VALUE rows).
 */
export function parseCSVContent(content: string): ParsedJob[] {
  const rows: RawRow[] = parse(content, {
    columns: true,
    skip_empty_lines: false,
    trim: true,
    relax_column_count: true,
  })

  const valueIndices = rows.reduce<number[]>((acc, row, i) => {
    if (row['DATA'] === 'VALUE') acc.push(i)
    return acc
  }, [])

  if (valueIndices.length === 0) {
    throw new Error('No VALUE row found in CSV. Expected at least one row starting with "VALUE".')
  }

  return valueIndices.map((valueIdx, jobIdx) => {
    const valueRow = rows[valueIdx]
    const endIdx = valueIndices[jobIdx + 1] ?? rows.length
    const jobRows = rows.slice(valueIdx, endIdx)

    const positionRows = jobRows.filter(r =>
      (r['DATA'] === 'VALUE' || !r['DATA']) &&
      r['Date'] &&
      r['Position Title']
    )

    if (positionRows.length === 0) {
      throw new Error(
        `No position rows found for job "${valueRow['Job Number'] || `#${jobIdx + 1}`}". ` +
        'At minimum one row must have a Date and Position Title.'
      )
    }

    return { show: valueRow, calls: groupIntoCalls(positionRows) }
  })
}
