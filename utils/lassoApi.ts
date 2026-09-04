export interface LassoConfig {
  apiKey: string
  baseUrl: string
  divisionId: number | null
}

let _config: LassoConfig | null = null

export function setLassoConfig(config: LassoConfig) {
  _config = config
}

function getConfig(): LassoConfig {
  if (!_config) throw new Error('Lasso API config not set. Please configure credentials first.')
  return _config
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function lassoFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { apiKey, baseUrl } = getConfig()
  // Route through the server-side proxy (/api/lasso/*) so the browser never
  // contacts the Lasso API directly, avoiding CORS restrictions.
  const url = `/api/lasso${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      'LASSO-APIKEY': apiKey,
      'X-Lasso-Base-URL': baseUrl,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Lasso API error ${res.status} on ${path}: ${body}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

interface PagedResponse<T> {
  count?: number
  next?: string | null
  results?: T[]
}

export interface AccountEventStatus {
  id: number
  name: string
  slug?: string | null
}

// Single-page lookup for external_code filters. Using getAll() causes the Lasso
// API to return every record in the database when the code doesn't exist yet
// (the filter is ignored server-side on a no-match), which can take 40+ seconds.
// With limit=1 we get at most 1 record per request; if it matches the requested
// external_code we return it, otherwise we treat it as not found.
async function findOneByExternalCode<T extends Record<string, any>>(
  endpoint: string,
  externalCode: string,
  extraParams: Record<string, string | number> = {}
): Promise<T | null> {
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(extraParams).map(([k, v]) => [k, String(v)])),
    external_code: externalCode,
    limit: '1',
  })
  const data = await lassoFetch<T[] | PagedResponse<T>>(`${endpoint}?${query}`)
  const page = Array.isArray(data) ? data : ((data as PagedResponse<T>).results ?? [])
  const item = page[0] ?? null
  // Guard against the API ignoring the filter and returning an unrelated record
  if (item && String(item.external_code) !== String(externalCode)) return null
  return item
}

async function getAll<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const results: T[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const query = new URLSearchParams({
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      limit: String(limit),
      offset: String(offset),
    })

    const data = await lassoFetch<T[] | PagedResponse<T>>(`${endpoint}?${query}`)
    const page = Array.isArray(data) ? data : ((data as PagedResponse<T>).results ?? [])
    results.push(...page)

    if (!((data as PagedResponse<T>).next) || page.length < limit) break
    offset += limit
  }

  return results
}

// ─── Reference / Lookup Data ──────────────────────────────────────────────────

export const getAccountUserRoles = () => getAll<any>('/account_user_role')
export const getMarkets = () => getAll<any>('/markets')
export const getAccountEventStatuses = () => getAll<AccountEventStatus>('/account_event_statuses')
export const getAirports = (params?: Record<string, string>) => getAll<any>('/airports', params)

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function findClientByName(name: string) {
  const results = await getAll<any>('/clients', { name })
  return results.find((c: any) => c.name.toLowerCase() === name.toLowerCase()) ?? null
}

export async function createClient(data: object) {
  return lassoFetch<any>('/clients', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateClient(id: number, data: object) {
  return lassoFetch<any>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function getClientContacts(clientId: number) {
  return getAll<any>('/client_contacts', { client: clientId })
}

export async function createClientContact(data: object) {
  return lassoFetch<any>('/client_contacts', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateClientContact(id: number, data: object) {
  return lassoFetch<any>(`/client_contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function createClientNote(data: object) {
  return lassoFetch<any>('/client_notes', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateClientNote(id: number, data: object) {
  return lassoFetch<any>(`/client_notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function getClientNotes(clientId: number) {
  const client = await lassoFetch<any>(`/clients/${clientId}`)
  const noteIds: number[] = client.notes ?? []
  return Promise.all(noteIds.map((id: number) => lassoFetch<any>(`/client_notes/${id}`)))
}

// ─── Venues ───────────────────────────────────────────────────────────────────

export async function findVenueByName(name: string) {
  const results = await getAll<any>('/venues', { name })
  return results.find((v: any) => v.name.toLowerCase() === name.toLowerCase()) ?? null
}

export async function createVenue(data: object) {
  return lassoFetch<any>('/venues', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateVenue(id: number, data: object) {
  return lassoFetch<any>(`/venues/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function getVenueRooms(venueId: number) {
  const venue = await lassoFetch<any>(`/venues/${venueId}`)
  const roomIds: number[] = venue.rooms ?? []
  return Promise.all(roomIds.map((id: number) => lassoFetch<any>(`/venue_rooms/${id}`)))
}

export async function createVenueRoom(data: object) {
  return lassoFetch<any>('/venue_rooms', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateVenueRoom(id: number, data: object) {
  return lassoFetch<any>(`/venue_rooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function createVenueNote(data: object) {
  return lassoFetch<any>('/venue_notes', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateVenueNote(id: number, data: object) {
  return lassoFetch<any>(`/venue_notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function getVenueNotes(venueId: number) {
  const venue = await lassoFetch<any>(`/venues/${venueId}`)
  const noteIds: number[] = venue.notes ?? []
  return Promise.all(noteIds.map((id: number) => lassoFetch<any>(`/venue_notes/${id}`)))
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function findEventByExternalCode(externalCode: string) {
  return findOneByExternalCode<any>('/events', externalCode)
}

// Fetch a single event by ID with all embedded children (positions, notes,
// account_user_role_relationships, etc.) in one API call.
export async function getEventDetail(eventId: number): Promise<any> {
  return lassoFetch<any>(`/events/${eventId}`)
}

function serializeEventForm(data: Record<string, any>): string {
  // Production Lasso accepts nullable event fields as empty form values, not JSON nulls.
  return new URLSearchParams(
    Object.entries(data).map(([key, value]) => [key, value == null ? '' : String(value)])
  ).toString()
}

export async function createEvent(data: Record<string, any>) {
  return lassoFetch<any>('/events', {
    method: 'POST',
    body: serializeEventForm(data),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export async function updateEvent(id: number, data: Record<string, any>) {
  return lassoFetch<any>(`/events/${id}`, {
    method: 'PATCH',
    body: serializeEventForm(data),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export async function createEventNote(data: object) {
  return lassoFetch<any>('/event_notes', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateEventNote(id: number, data: object) {
  return lassoFetch<any>(`/event_notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteEventNote(id: number) {
  return lassoFetch<void>(`/event_notes/${id}`, { method: 'DELETE' })
}

export async function getEventNotes(eventId: number) {
  const event = await lassoFetch<any>(`/events/${eventId}`)
  return (event.notes ?? []) as any[]
}

// ─── Event Account User Role Relationships ────────────────────────────────────

export async function getEventAccountUserRoleRelationships(eventId: number) {
  return getAll<any>('/event_account_user_role_relationships', { event: eventId })
}

export async function createEventAccountUserRoleRelationship(data: object) {
  return lassoFetch<any>('/event_account_user_role_relationships', { method: 'POST', body: JSON.stringify(data) })
}

// ─── Event Groups ─────────────────────────────────────────────────────────────

export async function getEventGroups(eventId: number) {
  return getAll<any>('/event_groups', { event: eventId })
}

export async function createEventGroup(data: object) {
  return lassoFetch<any>('/event_groups', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateEventGroup(id: number, data: object) {
  return lassoFetch<any>(`/event_groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

// ─── Positions ────────────────────────────────────────────────────────────────

// Fetch ALL positions in a single paginated sweep for bulk cache pre-loading.
export async function getAllPositions() {
  return getAll<any>('/positions')
}

export async function createPosition(data: object) {
  return lassoFetch<any>('/positions', { method: 'POST', body: JSON.stringify(data) })
}

export async function updatePosition(id: number, data: object) {
  return lassoFetch<any>(`/positions/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

// ─── Event Positions ──────────────────────────────────────────────────────────

/**
 * Pre-seeds all event_positions for a given event into a Map keyed by
 * external_code, so the import loop never calls the list endpoint.
 *
 * The /event_positions list endpoint has no `event=` filter in the Swagger
 * and, when the external_code filter misses, Lasso ignores ALL params (incl.
 * limit) and dumps the full table (~40 s, ~200 KB). So we get positions via
 * the event detail, which embeds them in one fast call. The API may return
 * positions as full objects or as bare integer IDs; both are handled here.
 */
export async function buildEventPositionMap(eventId: number): Promise<Map<string, any>> {
  const event = await lassoFetch<any>(`/events/${eventId}`)
  const raw: any[] = event.positions ?? []

  let positions: any[]
  if (!raw.length) {
    positions = []
  } else if (typeof raw[0] === 'number') {
    // Bare integer IDs — resolve each directly in parallel (fast, O(1) per record)
    positions = await Promise.all(raw.map((id: number) => lassoFetch<any>(`/event_positions/${id}`)))
  } else if (typeof raw[0] === 'object' && raw[0] !== null) {
    // Full EventPosition objects already embedded
    positions = raw
  } else {
    positions = []
  }

  const map = new Map<string, any>()
  for (const ep of positions) {
    if (ep?.external_code) map.set(String(ep.external_code), ep)
  }
  return map
}

export async function createEventPosition(data: object) {
  return lassoFetch<any>('/event_positions', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateEventPosition(id: number, data: object) {
  return lassoFetch<any>(`/event_positions/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

// ─── Schedule Entries ─────────────────────────────────────────────────────────

export async function getScheduleEntries(eventPositionId: number) {
  return getAll<any>('/schedule_entries', { event_position: eventPositionId })
}

export async function getScheduleEntryByExternalCode(externalCode: string) {
  return findOneByExternalCode<any>('/schedule_entries', externalCode)
}

export async function createScheduleEntry(data: object) {
  return lassoFetch<any>('/schedule_entries', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateScheduleEntry(id: number, data: object) {
  return lassoFetch<any>(`/schedule_entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteScheduleEntry(id: number) {
  return lassoFetch<void>(`/schedule_entries/${id}`, { method: 'DELETE' })
}
