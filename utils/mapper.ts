import { to24Hour, toISODate, splitName } from './timeUtils'
import { mappingConfig } from './mappingConfig'

export interface ShowRow extends Record<string, string> { }

export function replaceManagedLine(
  existingText: string | null | undefined,
  label: string,
  value: string | null | undefined
): string | null {
  const linePattern = new RegExp(`^\\s*${label}:.*$`, 'i')
  const lines = (existingText ?? '')
    .split(/\r?\n/)
    .filter(line => !linePattern.test(line))

  const trimmedValue = value?.trim()
  if (trimmedValue) lines.push(`${label}: ${trimmedValue.replace(/\s*\r?\n\s*/g, ' ')}`)

  const description = lines.join('\n').trim()
  return description || null
}

// ─── Client ───────────────────────────────────────────────────────────────────

export function buildClientPayload(show: ShowRow) {
  return { name: show['Billable Company'] }
}

export function buildClientContactPayload(show: ShowRow, clientId: number) {
  const { first_name, last_name } = splitName(show['Orderer Name'])
  return {
    client: clientId,
    first_name: first_name ?? null,
    last_name: last_name ?? null,
    email: show['Orderer Email'] || null,
    phone: show['Orderer Office Phone'] || null,
    mobile: show['Orderer Mobile Number'] || null,
  }
}

// ─── Venue ────────────────────────────────────────────────────────────────────

export function buildVenuePayload(show: ShowRow, airportCode: string | null, marketId: number | null) {
  return {
    name: show['Venue'],
    street1: show['Venue Street Address'] || null,
    locality: show['Venue City'] || null,
    region: show['Venue State'] || null,
    postal_code: show['Venue Zip Code'] || null,
    airport: airportCode,
    ...(marketId != null ? { market: marketId } : {}),
  }
}

// ─── Event ────────────────────────────────────────────────────────────────────

export function buildEventPayload(
  show: ShowRow,
  refs: { clientId: number; venueId: number; statusId: number; airportCode: string | null; marketId: number | null },
  calls: Array<{ date: string }>,
  divisionId: number | null,
  existingDescription?: string | null
) {
  const isoDates = calls.map(c => toISODate(c.date)).filter(Boolean).sort() as string[]
  return {
    name: String(show['Job Name']),
    external_code: String(show['Job Number']),
    division: divisionId,
    client: refs.clientId,
    venue: refs.venueId,
    account_event_status: refs.statusId,
    nearest_airport: refs.airportCode,
    date_begin: isoDates[0] ?? null,
    date_end: isoDates[isoDates.length - 1] ?? null,
    description: buildEventDescription(show, existingDescription),
  }
}

export function buildEventDescription(show: ShowRow, existingDescription?: string | null): string | null {
  const fields = [
    ['Notes for Booking Staff', show['Notes for Booking Staff']],
    ['Notes For Crew', show['Notes For Crew']],
    ['Onsite Payment Details', show['Onsite Payment Details']],
    ['Meeting Place for Crew', show['Meeting Place for Crew']],
    ['Onsite Contact Name', show['Onsite Contact Name']],
    ['Onsite Contact Mobile Number', show['Onsite Contact Mobile Number']],
    ['Onsite Contact Order Change Authorization', show['Onsite Contact Order Change Authorization']],
  ] as const

  let description = replaceManagedLine(existingDescription, 'Job Confirmation Status', null)
  for (const [label, value] of fields) {
    if (value?.trim()) {
      description = replaceManagedLine(description, label, value)
    }
  }
  return description
}

// ─── Event Groups ─────────────────────────────────────────────────────────────

export function buildEventGroupPayload(call: { date: string; callType: string }, eventId: number, venueId: number, room: string | null) {
  const isoDate = toISODate(call.date)
  const externalCode = `${isoDate}_${call.callType.replace(/\s+/g, '-').toUpperCase()}`.substring(0, 100)
  return {
    event: eventId,
    name: call.callType,
    venue: venueId,
    room: room || null,
    external_code: externalCode,
  }
}

// ─── Event Positions ──────────────────────────────────────────────────────────

export function buildEventPositionPayload(
  positionEntry: { quantity: number; label: string; dressCode: string },
  eventId: number,
  groupId: number,
  positionId: number,
  existingNote?: string | null
) {
  return {
    event: eventId,
    group: groupId,
    position: positionId,
    quantity: positionEntry.quantity,
    label: positionEntry.label || null,
    note: replaceManagedLine(existingNote, 'Dress Code', positionEntry.dressCode),
    rate_setting: mappingConfig.rateSettingDefault,
    // These helpers create a shift for every day in the position's schedule.
    // Shifts are instead created individually from their source call dates.
    day_begin: null,
    day_end: null,
    external_code: `EP-${eventId}-${groupId}-${positionId}`,
  }
}

// ─── Schedule Entries ─────────────────────────────────────────────────────────

export function buildScheduleEntryPayload(
  call: { date: string },
  positionEntry: { startTime: string; endTime: string },
  eventId: number,
  eventPositionId: number
) {
  return {
    event: eventId,
    event_position: eventPositionId,
    row: 1,
    date: toISODate(call.date),
    start_time: to24Hour(positionEntry.startTime),
    end_time: to24Hour(positionEntry.endTime),
    external_code: `SE-${eventPositionId}-${toISODate(call.date)}`,
  }
}
