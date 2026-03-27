'use strict';

/**
 * Converts a 12-hour time string (e.g. "8:00 a.m.", "5:00 p.m.") to
 * 24-hour "HH:MM" format required by the Lasso API.
 *
 * Handles: "8:00 a.m.", "8:00 am", "8:00AM", "17:00" (passthrough)
 */
function to24Hour(timeStr) {
  if (!timeStr) return null;

  // Normalise: collapse spaces, remove dots → "8:00am" / "5:00pm"
  const clean = timeStr.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '');

  // Already 24-hour HH:MM or HH:MM:SS
  if (/^\d{2}:\d{2}$/.test(clean)) return clean + ':00';
  if (/^\d{2}:\d{2}:\d{2}$/.test(clean)) return clean;

  const match = clean.match(/^(\d{1,2}):(\d{2})(am|pm)$/);
  if (!match) {
    throw new Error(`Cannot parse time string: "${timeStr}". Expected format like "8:00 a.m." or "17:00".`);
  }

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3];

  if (meridiem === 'am') {
    if (hours === 12) hours = 0;   // 12:xx am → 00:xx
  } else {
    if (hours !== 12) hours += 12; // 1-11 pm → 13-23
  }

  return `${String(hours).padStart(2, '0')}:${minutes}:00`;
}

/**
 * Converts a date string in M/D/YYYY format (e.g. "3/20/2026") to
 * ISO "YYYY-MM-DD" format required by the Lasso API.
 * Passes through strings already in ISO format.
 */
function toISODate(dateStr) {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed; // already ISO

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`Cannot parse date string: "${dateStr}". Expected format like "3/20/2026".`);
  }

  const month = String(parseInt(match[1], 10)).padStart(2, '0');
  const day = String(parseInt(match[2], 10)).padStart(2, '0');
  return `${match[3]}-${month}-${day}`;
}

/**
 * Splits a full name string into first_name and last_name.
 * "John Smith"   → { first_name: "John", last_name: "Smith" }
 * "Prince"       → { first_name: "Prince", last_name: null }
 * "Mary Jo Ford" → { first_name: "Mary", last_name: "Jo Ford" }
 */
function splitName(fullName) {
  if (!fullName || !fullName.trim()) return { first_name: null, last_name: null };

  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: null };

  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' '),
  };
}

/**
 * Parses a market string like "DALLAS/FT-WORTH, TEXAS" into its city and state components.
 * Returns the primary city (first token before /) title-cased, with "FT" expanded to "Fort".
 */
function parseMarket(marketStr) {
  if (!marketStr) return { city: null, state: null, raw: null };

  const [cityPart, statePart] = marketStr.split(',').map(s => s.trim());
  // Take primary city (before the first /)
  const primaryCity = cityPart.split('/')[0].trim();

  const toTitleCase = s =>
    s
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\bFt\b/g, 'Fort');

  return {
    city: toTitleCase(primaryCity),
    state: statePart ? toTitleCase(statePart) : null,
    raw: marketStr,
  };
}

module.exports = { to24Hour, toISODate, splitName, parseMarket };
