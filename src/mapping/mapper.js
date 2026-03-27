'use strict';

const { to24Hour, toISODate, splitName } = require('./timeUtils');
const config = require('../config');

// ─── Client ───────────────────────────────────────────────────────────────────

function buildClientPayload(show) {
  return {
    name: show['Orderer Name'],
  };
}

function buildClientContactPayload(show, clientId) {
  const { first_name, last_name } = splitName(show['Orderer Name']);
  return {
    client: clientId,
    first_name: first_name || null,
    last_name: last_name || null,
    email: show['Orderer Email'] || null,
    phone: show['Orderer Office Phone'] || null,
    mobile: show['Orderer Mobile Number'] || null,
  };
}

// ─── Venue ────────────────────────────────────────────────────────────────────

function buildVenuePayload(show, airportCode, marketId) {
  return {
    name: show['Venue'],
    street1: show['Venue Street Address'] || null,
    locality: show['Venue City'] || null,
    region: show['Venue State'] || null,
    postal_code: show['Venue Zip Code'] || null,
    airport: airportCode,
    ...(marketId != null ? { market: marketId } : {}),
  };
}

// ─── Event ────────────────────────────────────────────────────────────────────

function buildEventPayload(show, { clientId, venueId, statusId, airportCode, marketId }, calls) {
  const isoDates = calls.map(c => toISODate(c.date)).sort();
  return {
    name: String(show['Job Number']),
    external_code: String(show['Job Number']),
    division: config.divisionId,
    client: clientId,
    venue: venueId,
    account_event_status: statusId,
    nearest_airport: airportCode,
    date_begin: isoDates[0],
    date_end: isoDates[isoDates.length - 1],
  };
}

/**
 * Returns an array of event note payloads derived from the show-level CSV fields.
 * Only includes notes where the body is non-empty.
 */
function buildEventNotePayloads(show, eventId) {
  const notes = [];

  const add = (subject, body) => {
    if (body && body.trim()) {
      notes.push({ event: eventId, subject, body: body.trim() });
    }
  };

  add('Notes for Booking Staff', show['Notes for Booking Staff']);
  add('Notes For Crew', show['Notes For Crew']);
  add('Onsite Payment Details', show['Onsite Payment Details']);

  const logistics = [
    show['Meeting Place for Crew'] ? `Meeting Place: ${show['Meeting Place for Crew']}` : null,
    show['Dress Code'] ? `Dress Code: ${show['Dress Code']}` : null,
  ].filter(Boolean).join('\n');
  add('Logistics', logistics);

  const onsiteLines = [
    show['Onsite Contact Name'] ? `Name: ${show['Onsite Contact Name']}` : null,
    show['Onsite Contact Mobile Number'] ? `Mobile: ${show['Onsite Contact Mobile Number']}` : null,
    show['Onsite Contact Order Change Authorization']
      ? `Authorization: ${show['Onsite Contact Order Change Authorization']}` : null,
  ].filter(Boolean).join('\n');
  add('Onsite Contact', onsiteLines);

  return notes;
}

// ─── Event Groups ─────────────────────────────────────────────────────────────

/**
 * Builds an event group payload for one call.
 * Uses a deterministic external_code (date_callType slug) so re-runs can find
 * the right group when the same call type appears on multiple dates.
 */
function buildEventGroupPayload(call, eventId, venueId, room) {
  const isoDate = toISODate(call.date);
  const externalCode = `${isoDate}_${call.callType.replace(/\s+/g, '-').toUpperCase()}`.substring(0, 100);
  return {
    event: eventId,
    name: call.callType,
    venue: venueId,
    room: room || null,
    external_code: externalCode,
  };
}

// ─── Positions ────────────────────────────────────────────────────────────────

function buildPositionPayload(title) {
  const shortName = title.replace(/\s+/g, '-').toUpperCase().substring(0, 20);

  return {
    name: title,
    short_name: shortName,
  };
}

// ─── Event Positions ──────────────────────────────────────────────────────────

function buildEventPositionPayload(call, positionEntry, eventId, groupId, positionId) {
  const isoDate = toISODate(call.date);
  return {
    event: eventId,
    group: groupId,
    position: positionId,
    quantity: positionEntry.quantity,
    rate_setting: config.mapping.rateSettingDefault,
    schedule_begin: isoDate,
    schedule_end: isoDate,
    day_begin: to24Hour(call.startTime),
    day_end: to24Hour(call.endTime),
    external_code: `EP-${eventId}-${groupId}-${positionId}`,
  };
}

// ─── Schedule Entries ─────────────────────────────────────────────────────────

function buildScheduleEntryPayload(call, eventId, eventPositionId) {
  return {
    event: eventId,
    event_position: eventPositionId,
    row: 1,
    date: toISODate(call.date),
    start_time: to24Hour(call.startTime),
    end_time: to24Hour(call.endTime),
    external_code: `SE-${eventPositionId}-${toISODate(call.date)}`,
  };
}

module.exports = {
  buildClientPayload,
  buildClientContactPayload,
  buildVenuePayload,
  buildEventPayload,
  buildEventNotePayloads,
  buildEventGroupPayload,
  buildPositionPayload,
  buildEventPositionPayload,
  buildScheduleEntryPayload,
};
