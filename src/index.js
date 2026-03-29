'use strict';

const path = require('path');
const config = require('./config');
const { parseCSV } = require('./csv/parser');
const api = require('./api/endpoints');
const { parseMarket } = require('./mapping/timeUtils');
const {
  buildClientPayload,
  buildClientContactPayload,
  buildVenuePayload,
  buildEventPayload,
  buildEventNotePayloads,
  buildEventGroupPayload,
  buildPositionPayload,
  buildEventPositionPayload,
  buildScheduleEntryPayload,
} = require('./mapping/mapper');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(action, entity, name) {
  const labels = { created: '  [+]', updated: '  [~]', unchanged: '  [=]', warn: '[WARN]', skip: ' [>>]' };
  console.log(`${labels[action] || '  [ ]'} ${entity}: ${name}`);
}

/**
 * Compares a desired payload against an existing API record.
 * Returns an object containing only the fields that have changed, or null if nothing changed.
 * Normalises null/undefined and coerces to string for a reliable comparison.
 */
function computeDiff(desired, existing) {
  const changes = {};
  for (const [key, value] of Object.entries(desired)) {
    const a = value == null ? null : String(value);
    const b = existing[key] == null ? null : String(existing[key]);
    if (a !== b) changes[key] = value;
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

// ─── Airport Resolution ───────────────────────────────────────────────────────

async function resolveAirportCode(marketStr, allAirports) {
  const { city } = parseMarket(marketStr);

  // Try exact city name match against Lasso's airport records
  const match = allAirports.find(
    a => a.city && a.city.toLowerCase() === city.toLowerCase()
  );
  if (match) return match.iata_code || match.code || match.name;

  // Fallback: look up the configured table with the raw market key
  const marketKey = marketStr.split(',')[0].trim().toUpperCase();
  const fallback = config.mapping.marketAirportFallback[marketKey];
  if (fallback) {
    console.warn(`[WARN] Airport not found in Lasso API for "${city}" — using fallback code "${fallback}"`);
    return fallback;
  }

  throw new Error(
    `Cannot determine nearest airport for market: "${marketStr}". ` +
    `Add it to marketAirportFallback in mapping.config.json.`
  );
}

// ─── Upsert: Client ───────────────────────────────────────────────────────────

async function upsertClient(show, logFn) {
  const payload = buildClientPayload(show);
  const existing = await api.findClientByName(payload.name);

  if (existing) {
    const changes = computeDiff(payload, existing);
    if (changes) {
      await api.updateClient(existing.id, changes);
      logFn('updated', 'Client', payload.name);
    } else {
      logFn('unchanged', 'Client', payload.name);
    }
    return existing.id;
  }

  const created = await api.createClient(payload);
  logFn('created', 'Client', payload.name);
  return created.id;
}

// ─── Upsert: Client Contact ───────────────────────────────────────────────────

async function upsertClientContact(show, clientId, logFn) {
  const payload = buildClientContactPayload(show, clientId);
  const contacts = await api.getClientContacts(clientId);

  // Match by email (primary key for contacts in this context)
  const existing = contacts.find(
    c => c.email && payload.email &&
      c.email.toLowerCase() === payload.email.toLowerCase()
  );

  if (existing) {
    const changes = computeDiff(payload, existing);
    if (changes) {
      await api.updateClientContact(existing.id, changes);
      logFn('updated', 'ClientContact', payload.email || payload.first_name);
    } else {
      logFn('unchanged', 'ClientContact', payload.email || payload.first_name);
    }
    return existing.id;
  }

  const created = await api.createClientContact(payload);
  logFn('created', 'ClientContact', payload.email || payload.first_name);
  return created.id;
}

// ─── Upsert: Venue ────────────────────────────────────────────────────────────

async function upsertVenue(show, airportCode, marketId, logFn) {
  const payload = buildVenuePayload(show, airportCode, marketId);
  const existing = await api.findVenueByName(payload.name);

  if (existing) {
    const changes = computeDiff(payload, existing);
    if (changes) {
      await api.updateVenue(existing.id, changes);
      logFn('updated', 'Venue', payload.name);
    } else {
      logFn('unchanged', 'Venue', payload.name);
    }
    return existing.id;
  }

  const created = await api.createVenue(payload);
  logFn('created', 'Venue', payload.name);
  return created.id;
}

// ─── Upsert: Venue Room ───────────────────────────────────────────────────────

async function upsertVenueRoom(roomName, venueId, logFn) {
  if (!roomName) return null;

  const created = await api.createVenueRoom({ name: roomName, venue: venueId });
  logFn('created', 'VenueRoom', roomName);
  return created.id;
}

// ─── Upsert: Position ─────────────────────────────────────────────────────────

async function upsertPosition(title, logFn) {
  const payload = buildPositionPayload(title);
  const existing = await api.findPositionByName(title);

  if (existing) {
    const changes = computeDiff(payload, existing);
    if (changes) {
      await api.updatePosition(existing.id, changes);
      logFn('updated', 'Position', title);
    } else {
      logFn('unchanged', 'Position', title);
    }
    return existing.id;
  }

  const created = await api.createPosition(payload);
  logFn('created', 'Position', title);
  return created.id;
}

// ─── Main: Import One Show ────────────────────────────────────────────────────

async function importShow(show, calls, lookups, logFn = log) {
  const jobNumber = String(show['Job Number']);

  logFn('info', 'Job', `Processing Job ${jobNumber}: "${show['Job Name']}"`);
  logFn('info', 'Job', '─'.repeat(60));

  // Phase B.5 – Client
  const clientId = await upsertClient(show, logFn);

  // Phase B.6 – Client Contact
  await upsertClientContact(show, clientId, logFn);

  // Phase B.7 – Client Note (upsert by subject)
  const clientNoteBody = show['Client Notes'];
  if (clientNoteBody && clientNoteBody.trim()) {
    const existingClientNotes = await api.getClientNotes(clientId);
    const existingClientNote = existingClientNotes.find(n => n.subject === 'Client Notes');
    if (existingClientNote) {
      if (existingClientNote.body !== clientNoteBody.trim()) {
        await api.updateClientNote(existingClientNote.id, { body: clientNoteBody.trim() });
        logFn('updated', 'ClientNote', 'Client Notes');
      } else {
        logFn('unchanged', 'ClientNote', 'Client Notes');
      }
    } else {
      await api.createClientNote({ client: clientId, subject: 'Client Notes', body: clientNoteBody.trim() });
      logFn('created', 'ClientNote', 'Client Notes');
    }
  }

  // Phase B.8 – Venue
  const venueId = await upsertVenue(show, lookups.airportCode, lookups.marketId, logFn);

  // Phase B.9 – Venue Room
  await upsertVenueRoom(show['Room'], venueId, logFn);

  // Phase B.10 – Venue Note (upsert by subject)
  const venueNoteBody = show['Venue Notes'];
  if (venueNoteBody && venueNoteBody.trim()) {
    const existingVenueNotes = await api.getVenueNotes(venueId);
    const existingVenueNote = existingVenueNotes.find(n => n.subject === 'Venue Notes');
    if (existingVenueNote) {
      if (existingVenueNote.body !== venueNoteBody.trim()) {
        await api.updateVenueNote(existingVenueNote.id, { body: venueNoteBody.trim() });
        logFn('updated', 'VenueNote', 'Venue Notes');
      } else {
        logFn('unchanged', 'VenueNote', 'Venue Notes');
      }
    } else {
      await api.createVenueNote({ venue: venueId, subject: 'Venue Notes', body: venueNoteBody.trim() });
      logFn('created', 'VenueNote', 'Venue Notes');
    }
  }

  // Phase B.11 – Event (upsert by external_code / Job Number)
  const eventPayload = buildEventPayload(show, { ...lookups, clientId, venueId }, calls);
  const existingEvent = await api.findEventByExternalCode(jobNumber);
  let eventId;

  if (existingEvent) {
    const changes = computeDiff(eventPayload, existingEvent);
    if (changes) {
      await api.updateEvent(existingEvent.id, changes);
      logFn('updated', 'Event', show['Job Number']);
    } else {
      logFn('unchanged', 'Event', show['Job Number']);
    }
    eventId = existingEvent.id;
  } else {
    const created = await api.createEvent(eventPayload);
    logFn('created', 'Event', show['Job Number']);
    eventId = created.id;
  }

  // Phase B.12 – Event Notes (upsert by subject)
  const eventNotePayloads = buildEventNotePayloads(show, eventId);
  const existingEventNotes = await api.getEventNotes(eventId);
  for (const note of eventNotePayloads) {
    const existing = existingEventNotes.find(n => n.subject === note.subject);
    if (existing) {
      if (existing.body !== note.body) {
        await api.updateEventNote(existing.id, { body: note.body });
        logFn('updated', 'EventNote', note.subject);
      } else {
        logFn('unchanged', 'EventNote', note.subject);
      }
    } else {
      await api.createEventNote(note);
      logFn('created', 'EventNote', note.subject);
    }
  }

  // Phase B.13 – Link SMPL Staff via event_account_user_role_relationships
  const existingRelationships = await api.getEventAccountUserRoleRelationships(eventId);

  const smplStaff = [
    { name: show['SMPL Salesperson Name'], email: show['SMPL Salesperson Email'] },
    { name: show['SMPL General Manager Name'], email: show['SMPL General Manager Email'] },
    { name: show['SMPL Order Processor Name'], email: show['SMPL Order Processor Email'] },
    { name: show['SMPL Sales-Requested Personnel Coordinator Name'], email: null },
  ].filter(p => p.name || p.email);

  for (const person of smplStaff) {
    const role = person.email
      ? lookups.accountUserRoles.find(r => r.email && r.email.toLowerCase() === person.email.toLowerCase())
      : lookups.accountUserRoles.find(r => {
        const fullName = `${r.first_name || ''} ${r.last_name || ''}`.trim();
        return fullName.toLowerCase() === (person.name || '').toLowerCase();
      });

    if (!role) {
      logFn('warn', 'EventStaffLink', `Lasso account_user_role not found for: ${person.name} <${person.email || 'no email'}>`);
      continue;
    }

    const alreadyLinked = existingRelationships.some(rel => rel.account_user_role === role.id);
    if (!alreadyLinked) {
      await api.createEventAccountUserRoleRelationship({ event: eventId, account_user_role: role.id });
      logFn('created', 'EventStaffLink', person.name || person.email);
    } else {
      logFn('unchanged', 'EventStaffLink', person.name || person.email);
    }
  }

  // Phase B.14 – Calls → Event Groups → Positions → Schedule Entries
  const existingGroups = await api.getEventGroups(eventId);
  const roomName = show['Room'];

  for (const call of calls) {
    const groupPayload = buildEventGroupPayload(call, eventId, venueId, roomName);

    // Match existing group by external_code for deterministic idempotency
    const existingGroup = existingGroups.find(
      g => g.external_code && g.external_code === groupPayload.external_code
    );
    let groupId;

    if (existingGroup) {
      const changes = computeDiff(groupPayload, existingGroup);
      if (changes) {
        await api.updateEventGroup(existingGroup.id, changes);
        logFn('updated', 'EventGroup', `${call.callType} (${call.date})`);
      } else {
        logFn('unchanged', 'EventGroup', `${call.callType} (${call.date})`);
      }
      groupId = existingGroup.id;
    } else {
      const created = await api.createEventGroup(groupPayload);
      logFn('created', 'EventGroup', `${call.callType} (${call.date})`);
      groupId = created.id;
    }

    for (const positionEntry of call.positions) {
      const positionId = await upsertPosition(positionEntry.title, logFn);
      const epPayload = buildEventPositionPayload(call, positionEntry, eventId, groupId, positionId);

      // Match existing event_position by composite external_code (stable across runs)
      const existingEP = await api.getEventPositionByExternalCode(epPayload.external_code);
      let eventPositionId;

      if (existingEP) {
        const changes = computeDiff(epPayload, existingEP);
        if (changes) {
          await api.updateEventPosition(existingEP.id, changes);
          logFn('updated', 'EventPosition', positionEntry.title);
        } else {
          logFn('unchanged', 'EventPosition', positionEntry.title);
        }
        eventPositionId = existingEP.id;
      } else {
        const created = await api.createEventPosition(epPayload);
        logFn('created', 'EventPosition', positionEntry.title);
        eventPositionId = created.id;
      }

      // Schedule Entry — matched by external_code; falls back to date match for
      // pre-existing entries that predate this field (stamps external_code on update)
      const sePayload = buildScheduleEntryPayload(call, eventId, eventPositionId);
      let existingEntry = await api.getScheduleEntryByExternalCode(sePayload.external_code);
      if (!existingEntry) {
        const all = await api.getScheduleEntries(eventPositionId);
        existingEntry = all.find(se => se.date === sePayload.date) || null;
      }

      if (existingEntry) {
        const changes = computeDiff(sePayload, existingEntry);
        if (changes) {
          await api.updateScheduleEntry(existingEntry.id, changes);
          logFn('updated', 'ScheduleEntry', `${sePayload.date} ${call.callType}`);
        } else {
          logFn('unchanged', 'ScheduleEntry', `${sePayload.date} ${call.callType}`);
        }
      } else {
        await api.createScheduleEntry(sePayload);
        logFn('created', 'ScheduleEntry', `${sePayload.date} ${call.callType}`);
      }
    }
  }

  logFn('info', 'Job', `✓ Job ${jobNumber} "${show['Job Name']}" processed successfully.`);
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2] || path.join(__dirname, '..', 'data', 'SimpleData.csv');

  console.log('');
  console.log('ShowMasters → Lasso Import Utility');
  console.log('====================================');
  console.log(`CSV file : ${csvPath}`);
  console.log(`Lasso URL: ${config.baseUrl}`);
  console.log('');

  // Parse CSV
  const { show, calls } = parseCSV(csvPath);
  console.log(`Parsed CSV: job "${show['Job Name']}" with ${calls.length} call group(s)\n`);

  // Resolve all lookups via the exported helper
  console.log('Fetching reference data from Lasso...');
  const lookups = await resolveImportLookups(show);
  console.log(`  Airport code resolved: ${lookups.airportCode}`);

  await importShow(show, calls, lookups, log);
}

// ─── Exports (for Nuxt server routes) ───────────────────────────────────────

/**
 * Fetches all Lasso reference data needed by importShow and resolves lookup IDs
 * for the given show row. Call this once per job before calling importShow.
 */
async function resolveImportLookups(show) {
  const [accountUserRoles, markets, accountEventStatuses, airports] = await Promise.all([
    api.getAccountUserRoles(),
    api.getMarkets(),
    api.getAccountEventStatuses(),
    api.getAirports(),
  ]);

  const marketStr = show["Job's Market"];
  const { city: marketCity } = parseMarket(marketStr);
  const market = markets.find(m =>
    (m.primary_city && m.primary_city.toLowerCase().includes(marketCity.toLowerCase())) ||
    (m.name && m.name.toLowerCase().includes(marketCity.toLowerCase()))
  );
  const marketId = market ? market.id : null;
  if (!marketId) console.warn(`[WARN] Market not found in Lasso for: "${marketStr}"`);

  const airportCode = await resolveAirportCode(marketStr, airports);

  const statusLabel = show['Job Confirmation Status'];
  const mappedSlug = config.mapping.eventStatusMapping[statusLabel] || statusLabel.toLowerCase();
  const status = accountEventStatuses.find(
    s => (s.slug || '').toLowerCase() === mappedSlug ||
      (s.name || '').toLowerCase() === statusLabel.toLowerCase()
  );
  if (!status) {
    throw new Error(
      `Cannot find Lasso account_event_status matching "${statusLabel}". ` +
      `Add it to eventStatusMapping in mapping.config.json.`
    );
  }

  return {
    accountUserRoles,
    airportCode,
    marketId,
    statusId: status.id,
  };
}

module.exports = { importShow, resolveImportLookups };

// ─── CLI Entry Point ──────────────────────────────────────────────────────────

if (require.main === module) {
  main().catch(err => {
    console.error('\n[ERROR]', err.message);
    if (err.response) {
      const detail = err.response.data;
      console.error('API status :', err.response.status);
      console.error('API response:', JSON.stringify(detail, null, 2));
    }
    process.exit(1);
  });
}
