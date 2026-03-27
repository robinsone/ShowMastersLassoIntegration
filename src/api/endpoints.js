'use strict';

const { lassoClient, getAll } = require('./lassoClient');

// ─── Reference / Lookup Data ──────────────────────────────────────────────────

async function getAccountUserRoles() {
  return getAll('/account_user_role');
}

async function getMarkets() {
  return getAll('/markets');
}

async function getAccountEventStatuses() {
  return getAll('/account_event_statuses');
}

async function getAirports(params = {}) {
  return getAll('/airports', params);
}

// ─── Clients ──────────────────────────────────────────────────────────────────

async function findClientByName(name) {
  const results = await getAll('/clients', { name });
  return results.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
}

async function createClient(data) {
  const res = await lassoClient.post('/clients', data);
  return res.data;
}

async function updateClient(id, data) {
  const res = await lassoClient.patch(`/clients/${id}`, data);
  return res.data;
}

async function getClientContacts(clientId) {
  return getAll('/client_contacts', { client: clientId });
}

async function createClientContact(data) {
  const res = await lassoClient.post('/client_contacts', data);
  return res.data;
}

async function updateClientContact(id, data) {
  const res = await lassoClient.patch(`/client_contacts/${id}`, data);
  return res.data;
}

async function createClientNote(data) {
  const res = await lassoClient.post('/client_notes', data);
  return res.data;
}

async function updateClientNote(id, data) {
  const res = await lassoClient.patch(`/client_notes/${id}`, data);
  return res.data;
}

// ─── Venues ───────────────────────────────────────────────────────────────────

async function findVenueByName(name) {
  const results = await getAll('/venues', { name });
  return results.find(v => v.name.toLowerCase() === name.toLowerCase()) || null;
}

async function createVenue(data) {
  const res = await lassoClient.post('/venues', data);
  return res.data;
}

async function updateVenue(id, data) {
  const res = await lassoClient.patch(`/venues/${id}`, data);
  return res.data;
}

async function createVenueRoom(data) {
  const res = await lassoClient.post('/venue_rooms', data);
  return res.data;
}

async function updateVenueRoom(id, data) {
  const res = await lassoClient.patch(`/venue_rooms/${id}`, data);
  return res.data;
}

async function createVenueNote(data) {
  const res = await lassoClient.post('/venue_notes', data);
  return res.data;
}

async function updateVenueNote(id, data) {
  const res = await lassoClient.patch(`/venue_notes/${id}`, data);
  return res.data;
}

// ─── Events ───────────────────────────────────────────────────────────────────

async function findEventByExternalCode(externalCode) {
  const results = await getAll('/events', { external_code: externalCode });
  return results.find(e => e.external_code === String(externalCode)) || null;
}

async function createEvent(data) {
  const form = new URLSearchParams(Object.entries(data).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
  const res = await lassoClient.post('/events', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  return res.data;
}

async function updateEvent(id, data) {
  const form = new URLSearchParams(Object.entries(data).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));
  const res = await lassoClient.patch(`/events/${id}`, form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  return res.data;
}

async function createEventNote(data) {
  const res = await lassoClient.post('/event_notes', data);
  return res.data;
}

async function updateEventNote(id, data) {
  const res = await lassoClient.patch(`/event_notes/${id}`, data);
  return res.data;
}

// ─── Event Account User Role Relationships ────────────────────────────────────

async function getEventAccountUserRoleRelationships(eventId) {
  return getAll('/event_account_user_role_relationships', { event: eventId });
}

async function createEventAccountUserRoleRelationship(data) {
  const res = await lassoClient.post('/event_account_user_role_relationships', data);
  return res.data;
}

// ─── Event Groups ─────────────────────────────────────────────────────────────

async function getEventGroups(eventId) {
  return getAll('/event_groups', { event: eventId });
}

async function createEventGroup(data) {
  const res = await lassoClient.post('/event_groups', data);
  return res.data;
}

async function updateEventGroup(id, data) {
  const res = await lassoClient.patch(`/event_groups/${id}`, data);
  return res.data;
}

// ─── Positions ────────────────────────────────────────────────────────────────

async function findPositionByName(name) {
  const results = await getAll('/positions', { name });
  return results.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
}

async function createPosition(data) {
  const res = await lassoClient.post('/positions', data);
  return res.data;
}

async function updatePosition(id, data) {
  const res = await lassoClient.patch(`/positions/${id}`, data);
  return res.data;
}

// ─── Event Positions ──────────────────────────────────────────────────────────

async function getEventPositionByExternalCode(externalCode) {
  const results = await getAll('/event_positions', { external_code: externalCode });
  return results[0] || null;
}

async function createEventPosition(data) {
  const res = await lassoClient.post('/event_positions', data);
  return res.data;
}

async function updateEventPosition(id, data) {
  const res = await lassoClient.patch(`/event_positions/${id}`, data);
  return res.data;
}

// ─── Schedule Entries ─────────────────────────────────────────────────────────

async function getScheduleEntries(eventPositionId) {
  return getAll('/schedule_entries', { event_position: eventPositionId });
}

async function getScheduleEntryByExternalCode(externalCode) {
  const results = await getAll('/schedule_entries', { external_code: externalCode });
  return results[0] || null;
}

async function createScheduleEntry(data) {
  const res = await lassoClient.post('/schedule_entries', data);
  return res.data;
}

async function updateScheduleEntry(id, data) {
  const res = await lassoClient.patch(`/schedule_entries/${id}`, data);
  return res.data;
}

module.exports = {
  getAccountUserRoles,
  getMarkets,
  getAccountEventStatuses,
  getAirports,
  findClientByName,
  createClient,
  updateClient,
  getClientContacts,
  createClientContact,
  updateClientContact,
  createClientNote,
  updateClientNote,
  findVenueByName,
  createVenue,
  updateVenue,
  createVenueRoom,
  updateVenueRoom,
  createVenueNote,
  updateVenueNote,
  findEventByExternalCode,
  createEvent,
  updateEvent,
  createEventNote,
  updateEventNote,
  getEventAccountUserRoleRelationships,
  createEventAccountUserRoleRelationship,
  getEventGroups,
  createEventGroup,
  updateEventGroup,
  findPositionByName,
  createPosition,
  updatePosition,
  getEventPositionByExternalCode,
  createEventPosition,
  updateEventPosition,
  getScheduleEntries,
  getScheduleEntryByExternalCode,
  createScheduleEntry,
  updateScheduleEntry,
};
