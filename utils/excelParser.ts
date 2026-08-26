import * as XLSX from 'xlsx'
import type { ParsedJob } from '../types/index'
import { parseShowMastersRows, type RawRow } from './csvParser'

const REQUIRED_HEADERS = [
  'DATA',
  'Job Number',
  'Date',
  'Start Time',
  'End Time',
  'Call Type',
  'Position Title',
  'Position Quantity per Title',
]

function cellText(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

function hasValues(row: unknown[]): boolean {
  return row.some(value => cellText(value) !== '')
}

function workbookReadError(error: unknown): Error {
  const message = error instanceof Error ? error.message : 'Unknown workbook error.'

  if (/password|encrypt|protect/i.test(message)) {
    return new Error(
      'Password-protected Excel files are not supported. Export an unprotected .xlsx copy and try again.',
    )
  }

  return new Error(`Could not read the Excel workbook. ${message}`)
}

export function parseExcelContent(content: ArrayBuffer): ParsedJob[] {
  let workbook: XLSX.WorkBook

  try {
    workbook = XLSX.read(content, {
      type: 'array',
      cellFormula: true,
      cellText: true,
    })
  } catch (error) {
    throw workbookReadError(error)
  }

  const worksheetEntry = workbook.SheetNames
    .map(name => {
      const worksheet = workbook.Sheets[name]
      if (!worksheet) return { name, rows: [] as unknown[][] }

      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        blankrows: false,
        defval: '',
        raw: false,
      })

      return { name, rows }
    })
    .find(({ rows }) => rows.some(hasValues))

  if (!worksheetEntry) {
    throw new Error('The Excel workbook does not contain a non-empty worksheet.')
  }

  const [headerRow, ...dataRows] = worksheetEntry.rows
  if (!headerRow) {
    throw new Error(`Worksheet "${worksheetEntry.name}" does not contain a header row.`)
  }

  const headers = headerRow.map(cellText)
  const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header))

  if (missingHeaders.length > 0) {
    throw new Error(
      `Worksheet "${worksheetEntry.name}" is not a ShowMasters SimpleData worksheet. ` +
      `Missing required column${missingHeaders.length === 1 ? '' : 's'}: ${missingHeaders.join(', ')}.`,
    )
  }

  const rows: RawRow[] = dataRows
    .filter(hasValues)
    .map(row => Object.fromEntries(headers.map((header, index) => [header, cellText(row[index])])))

  return parseShowMastersRows(rows, `Excel worksheet "${worksheetEntry.name}"`)
}
