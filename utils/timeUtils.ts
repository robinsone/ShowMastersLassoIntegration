/**
 * Converts a 12-hour time string (e.g. "8:00 a.m.", "5:00 p.m.") to
 * 24-hour "HH:MM:SS" format required by the Lasso API.
 */
export function to24Hour(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null

  const clean = timeStr.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '')

  if (/^\d{2}:\d{2}$/.test(clean)) return clean + ':00'
  if (/^\d{2}:\d{2}:\d{2}$/.test(clean)) return clean

  const match = clean.match(/^(\d{1,2}):(\d{2})(am|pm)$/)
  if (!match) {
    throw new Error(`Cannot parse time string: "${timeStr}". Expected format like "8:00 a.m." or "17:00".`)
  }

  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const meridiem = match[3]

  if (meridiem === 'am') {
    if (hours === 12) hours = 0
  } else {
    if (hours !== 12) hours += 12
  }

  return `${String(hours).padStart(2, '0')}:${minutes}:00`
}

/**
 * Converts a date string in M/D/YYYY format to ISO "YYYY-MM-DD" format.
 * Passes through strings already in ISO format.
 */
export function toISODate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null

  const trimmed = dateStr.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) {
    throw new Error(`Cannot parse date string: "${dateStr}". Expected format like "3/20/2026".`)
  }

  const month = String(parseInt(match[1], 10)).padStart(2, '0')
  const day = String(parseInt(match[2], 10)).padStart(2, '0')
  return `${match[3]}-${month}-${day}`
}

/**
 * Splits a full name into first_name and last_name.
 */
export function splitName(fullName: string | null | undefined): { first_name: string | null; last_name: string | null } {
  if (!fullName?.trim()) return { first_name: null, last_name: null }

  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { first_name: parts[0], last_name: null }

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  }
}

/**
 * Parses a market string like "DALLAS/FT-WORTH, TEXAS" into city and state.
 */
export function parseMarket(marketStr: string | null | undefined): { city: string | null; state: string | null; raw: string | null } {
  if (!marketStr) return { city: null, state: null, raw: null }

  const [cityPart, statePart] = marketStr.split(',').map((s: string) => s.trim())
  const primaryCity = cityPart.split('/')[0].trim()

  const toTitleCase = (s: string) =>
    s.toLowerCase()
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
      .replace(/\bFt\b/g, 'Fort')

  return {
    city: toTitleCase(primaryCity),
    state: statePart ? toTitleCase(statePart) : null,
    raw: marketStr,
  }
}
