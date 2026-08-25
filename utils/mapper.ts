import { to24Hour, toISODate, splitName } from './timeUtils'
import { mappingConfig } from './mappingConfig'

export interface ShowRow extends Record<string, string> { }

export function replaceManagedNoteLine(
  existingNote: string | null | undefined,
  label: string,
  value: string | null | undefined
): string | null {
  const linePattern = new RegExp(`^\\s*${label}:.*$`, 'i')
  const lines = (existingNote ?? '')
    .split(/\r?\n/)
    .filter(line => !linePattern.test(line))

  const trimmedValue = value?.trim()
  if (trimmedValue) lines.push(`${label}: ${trimmedValue}`)

  const note = lines.join('\n').trim()
  return note || null
}

// ─── Client ───────────────────────────────────────────────────────────────────

export function buildClientPayload(show: ShowRow) {
  return { name: show['Orderer Name'] }
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
  divisionId: number
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
  }
}

export function buildEventNotePayloads(show: ShowRow, eventId: number) {
  const notes: Array<{ event: number; subject: string; body: string }> = []

  const add = (subject: string, body: string | undefined) => {
    if (body?.trim()) {
      notes.push({ event: eventId, subject, body: body.trim() })
    }
  }

  add('Notes for Booking Staff', show['Notes for Booking Staff'])
  add('Notes For Crew', show['Notes For Crew'])
  add('Onsite Payment Details', show['Onsite Payment Details'])

  const onsiteLines = [
    show['Onsite Contact Name'] ? `Name: ${show['Onsite Contact Name']}` : null,
    show['Onsite Contact Mobile Number'] ? `Mobile: ${show['Onsite Contact Mobile Number']}` : null,
    show['Onsite Contact Order Change Authorization']
      ? `Authorization: ${show['Onsite Contact Order Change Authorization']}` : null,
  ].filter(Boolean).join('\n')
  add('Onsite Contact', onsiteLines)

  return notes
}

export function buildLogisticsNoteBody(show: ShowRow, existingBody?: string | null): string | null {
  let body = replaceManagedNoteLine(existingBody, 'Dress Code', null)
  if (show['Meeting Place for Crew']?.trim()) {
    body = replaceManagedNoteLine(body, 'Meeting Place', show['Meeting Place for Crew'])
  }
  return body
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
  call: { date: string },
  positionEntry: { quantity: number; label: string; startTime: string; endTime: string; dressCode: string },
  eventId: number,
  groupId: number,
  positionId: number,
  existingNote?: string | null
) {
  const isoDate = toISODate(call.date)
  return {
    event: eventId,
    group: groupId,
    position: positionId,
    quantity: positionEntry.quantity,
    label: positionEntry.label || null,
    note: replaceManagedNoteLine(existingNote, 'Dress Code', positionEntry.dressCode),
    rate_setting: mappingConfig.rateSettingDefault,
    schedule_begin: isoDate,
    schedule_end: isoDate,
    day_begin: to24Hour(positionEntry.startTime),
    day_end: to24Hour(positionEntry.endTime),
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
