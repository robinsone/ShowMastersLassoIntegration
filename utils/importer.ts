import { parseMarket } from './timeUtils'
import { mappingConfig } from './mappingConfig'
import {
  buildClientPayload,
  buildClientContactPayload,
  buildVenuePayload,
  buildEventPayload,
  buildEventGroupPayload,
  buildEventPositionPayload,
  buildScheduleEntryPayload,
  type ShowRow,
} from './mapper'
import * as api from './lassoApi'
import type { ParsedCall, ParsedJob } from '../types/index'

export type LogFn = (action: string, entity: string, name: string) => void

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeDiff(desired: Record<string, any>, existing: Record<string, any>): Record<string, any> | null {
  const changes: Record<string, any> = {}
  for (const [key, value] of Object.entries(desired)) {
    const a = value == null ? null : String(value)
    const b = existing[key] == null ? null : String(existing[key])
    if (a !== b) changes[key] = value
  }
  return Object.keys(changes).length > 0 ? changes : null
}

// ─── Airport Resolution ───────────────────────────────────────────────────────

async function resolveAirportCode(marketStr: string, allAirports: any[]): Promise<string> {
  const { city } = parseMarket(marketStr)

  const match = allAirports.find(
    (a: any) => a.city && a.city.toLowerCase() === (city ?? '').toLowerCase()
  )
  if (match) return match.iata_code || match.code || match.name

  const marketKey = marketStr.split(',')[0].trim().toUpperCase()
  const fallback = mappingConfig.marketAirportFallback[marketKey]
  if (fallback) {
    console.warn(`[WARN] Airport not found in Lasso API for "${city}" — using fallback code "${fallback}"`)
    return fallback
  }

  throw new Error(
    `Cannot determine nearest airport for market: "${marketStr}". ` +
    `Update marketAirportFallback in mappingConfig.ts.`
  )
}

// ─── Reference Data Resolution ───────────────────────────────────────────────

export interface ImportLookups {
  accountUserRoles: any[]
  airportCode: string
  marketId: number | null
  statusId: number
}

export async function resolveImportLookups(show: ShowRow, statusId: number): Promise<ImportLookups> {
  const [accountUserRoles, markets, airports] = await Promise.all([
    api.getAccountUserRoles(),
    api.getMarkets(),
    api.getAirports(),
  ])

  const marketStr = show["Job's Market"]
  const { city: marketCity } = parseMarket(marketStr)
  const market = markets.find((m: any) =>
    (m.primary_city && m.primary_city.toLowerCase().includes((marketCity ?? '').toLowerCase())) ||
    (m.name && m.name.toLowerCase().includes((marketCity ?? '').toLowerCase()))
  )
  const marketId: number | null = market ? market.id : null
  if (!marketId) console.warn(`[WARN] Market not found in Lasso for: "${marketStr}"`)

  const airportCode = await resolveAirportCode(marketStr, airports)

  return { accountUserRoles, airportCode, marketId, statusId }
}

// ─── Upsert helpers ───────────────────────────────────────────────────────────

async function upsertClient(show: ShowRow, logFn: LogFn): Promise<number> {
  const payload = buildClientPayload(show)
  const existing = await api.findClientByName(payload.name)

  if (existing) {
    const changes = computeDiff(payload, existing)
    if (changes) {
      await api.updateClient(existing.id, changes)
      logFn('updated', 'Client', payload.name)
    } else {
      logFn('unchanged', 'Client', payload.name)
    }
    return existing.id
  }

  const created = await api.createClient(payload)
  logFn('created', 'Client', payload.name)
  return created.id
}

async function upsertClientContact(show: ShowRow, clientId: number, logFn: LogFn): Promise<number> {
  const payload = buildClientContactPayload(show, clientId)
  const contacts = await api.getClientContacts(clientId)
  const existing = payload.email
    ? contacts.find(
      (c: any) => c.email &&
        c.email.toLowerCase() === payload.email?.toLowerCase()
    )
    : contacts.find(
      (c: any) =>
        (c.first_name ?? '').trim().toLowerCase() === (payload.first_name ?? '').trim().toLowerCase() &&
        (c.last_name ?? '').trim().toLowerCase() === (payload.last_name ?? '').trim().toLowerCase()
    )

  if (existing) {
    const changes = computeDiff(payload, existing)
    if (changes) {
      await api.updateClientContact(existing.id, changes)
      logFn('updated', 'ClientContact', payload.email ?? payload.first_name ?? '')
    } else {
      logFn('unchanged', 'ClientContact', payload.email ?? payload.first_name ?? '')
    }
    return existing.id
  }

  const created = await api.createClientContact(payload)
  logFn('created', 'ClientContact', payload.email ?? payload.first_name ?? '')
  return created.id
}

async function upsertVenue(show: ShowRow, airportCode: string | null, marketId: number | null, logFn: LogFn): Promise<number> {
  const payload = buildVenuePayload(show, airportCode, marketId)
  const existing = await api.findVenueByName(payload.name)

  if (existing) {
    const changes = computeDiff(payload, existing)
    if (changes) {
      await api.updateVenue(existing.id, changes)
      logFn('updated', 'Venue', payload.name)
    } else {
      logFn('unchanged', 'Venue', payload.name)
    }
    return existing.id
  }

  const created = await api.createVenue(payload)
  logFn('created', 'Venue', payload.name)
  return created.id
}

function normalizePositionTitle(title: string): string {
  return title.trim().toLowerCase()
}

function positionIssueContext(job: ParsedJob, call: ParsedCall): string {
  return `Job ${job.show['Job Number']} "${job.show['Job Name']}", ${call.callType} on ${call.date}`
}

export function resolvePositionIds(
  jobs: ParsedJob[],
  lassoPositions: Array<{ id: number; name?: string | null }>
): Map<string, number> {
  const idsByTitle = new Map<string, number[]>()

  for (const position of lassoPositions) {
    if (!position.name?.trim()) continue

    const title = normalizePositionTitle(position.name)
    const ids = idsByTitle.get(title) ?? []
    ids.push(position.id)
    idsByTitle.set(title, ids)
  }

  const positionIds = new Map<string, number>()
  const issues: string[] = []

  for (const job of jobs) {
    for (const call of job.calls) {
      for (const positionEntry of call.positions) {
        const title = positionEntry.title.trim()
        const ids = idsByTitle.get(normalizePositionTitle(title))
        const context = positionIssueContext(job, call)

        if (!ids?.length) {
          issues.push(`Position "${title}" was not found in Lasso (${context}). Create it in Lasso, then retry.`)
          continue
        }

        if (ids.length > 1) {
          issues.push(`Position "${title}" is ambiguous in Lasso (${context}). Disambiguate the duplicate Lasso positions, then retry.`)
          continue
        }

        positionIds.set(normalizePositionTitle(title), ids[0])
      }
    }
  }

  if (issues.length) {
    throw new Error(
      `Position preflight failed. Correct the following Lasso positions, then retry:\n\n${issues.map(issue => `- ${issue}`).join('\n')}`
    )
  }

  return positionIds
}

function getPositionId(title: string, positionIds: Map<string, number>): number {
  const positionId = positionIds.get(normalizePositionTitle(title))
  if (positionId === undefined) {
    throw new Error(`Position "${title}" was not resolved during import preflight.`)
  }
  return positionId
}

// ─── Main: Import One Show ────────────────────────────────────────────────────



export async function importShow(
  show: ShowRow,
  calls: ParsedCall[],
  lookups: ImportLookups,
  divisionId: number,
  positionIds: Map<string, number>,
  logFn: LogFn,
  noteCache: Map<string, number> = new Map()
): Promise<void> {
  const jobNumber = String(show['Job Number'])

  logFn('info', 'Job', `Processing Job ${jobNumber}: "${show['Job Name']}"`)
  logFn('info', 'Job', '─'.repeat(60))

  const clientId = await upsertClient(show, logFn)
  await upsertClientContact(show, clientId, logFn)

  const clientNoteBody = show['Client Notes']
  if (clientNoteBody?.trim()) {
    const cacheKey = `client_${clientId}`
    const cachedId = noteCache.get(cacheKey)
    if (cachedId !== undefined) {
      logFn('unchanged', 'ClientNote', 'Client Notes (cached)')
    } else {
      const existingClientNotes = await api.getClientNotes(clientId)
      const existingClientNote = existingClientNotes.find((n: any) => n.subject === 'Client Notes')
      if (existingClientNote) {
        noteCache.set(cacheKey, existingClientNote.id)
        if (existingClientNote.body !== clientNoteBody.trim()) {
          await api.updateClientNote(existingClientNote.id, { body: clientNoteBody.trim() })
          logFn('updated', 'ClientNote', 'Client Notes')
        } else {
          logFn('unchanged', 'ClientNote', 'Client Notes')
        }
      } else {
        const created = await api.createClientNote({ client: clientId, subject: 'Client Notes', body: clientNoteBody.trim() })
        noteCache.set(cacheKey, created.id)
        logFn('created', 'ClientNote', 'Client Notes')
      }
    }
  }

  const venueId = await upsertVenue(show, lookups.airportCode, lookups.marketId, logFn)

  if (show['Room']) {
    const roomCacheKey = `room_${venueId}_${show['Room']}`
    if (noteCache.has(roomCacheKey)) {
      logFn('unchanged', 'VenueRoom', show['Room'] + ' (cached)')
    } else {
      const existingRooms = await api.getVenueRooms(venueId)
      const existingRoom = existingRooms.find((r: any) => r.name?.toLowerCase() === show['Room'].toLowerCase())
      if (existingRoom) {
        noteCache.set(roomCacheKey, existingRoom.id)
        logFn('unchanged', 'VenueRoom', show['Room'])
      } else {
        const created = await api.createVenueRoom({ name: show['Room'], venue: venueId })
        noteCache.set(roomCacheKey, created.id)
        logFn('created', 'VenueRoom', show['Room'])
      }
    }
  }

  const venueNoteBody = show['Venue Notes']
  if (venueNoteBody?.trim()) {
    const cacheKey = `venue_${venueId}`
    const cachedId = noteCache.get(cacheKey)
    if (cachedId !== undefined) {
      logFn('unchanged', 'VenueNote', 'Venue Notes (cached)')
    } else {
      const existingVenueNotes = await api.getVenueNotes(venueId)
      const existingVenueNote = existingVenueNotes.find((n: any) => n.subject === 'Venue Notes')
      if (existingVenueNote) {
        noteCache.set(cacheKey, existingVenueNote.id)
        if (existingVenueNote.body !== venueNoteBody.trim()) {
          await api.updateVenueNote(existingVenueNote.id, { body: venueNoteBody.trim() })
          logFn('updated', 'VenueNote', 'Venue Notes')
        } else {
          logFn('unchanged', 'VenueNote', 'Venue Notes')
        }
      } else {
        const created = await api.createVenueNote({ venue: venueId, subject: 'Venue Notes', body: venueNoteBody.trim() })
        noteCache.set(cacheKey, created.id)
        logFn('created', 'VenueNote', 'Venue Notes')
      }
    }
  }

  const existingEvent = await api.findEventByExternalCode(jobNumber)
  let eventId: number
  const isNewEvent = !existingEvent

  // For existing events, fetch the full detail in a single call. The response
  // embeds positions (with schedule_entries) and account_user_role_relationships
  // — eliminating dozens of per-entity lookups
  // that previously took ~40 seconds each.
  let eventDetail: any = null

  if (existingEvent) {
    eventDetail = await api.getEventDetail(existingEvent.id)
  }
  const eventPayload = buildEventPayload(
    show,
    { ...lookups, clientId, venueId },
    calls,
    divisionId,
    eventDetail?.description
  )

  if (existingEvent) {
    const changes = computeDiff(eventPayload, eventDetail)
    if (changes) {
      await api.updateEvent(eventDetail.id, changes)
      logFn('updated', 'Event', show['Job Number'])
    } else {
      logFn('unchanged', 'Event', show['Job Number'])
    }
    eventId = eventDetail.id
  } else {
    const created = await api.createEvent(eventPayload)
    logFn('created', 'Event', show['Job Number'])
    eventId = created.id
  }

  // Pre-seed all event_positions for this event into a Map before the loop.
  // This is done once here and avoids any calls to the /event_positions list
  // endpoint, which has no event= filter and dumps the full table (~40 s) when
  // any filter is unmatched. O(1) lookups in the map replace array.find() calls.
  const eventPositionMap: Map<string, any> = isNewEvent
    ? new Map()
    : await api.buildEventPositionMap(eventId)

  const embeddedRelationships: any[] = eventDetail?.account_user_role_relationships ?? []

  const smplStaff = [
    { name: show['SMPL Salesperson Name'], email: show['SMPL Salesperson Email'] },
    { name: show['SMPL General Manager Name'], email: show['SMPL General Manager Email'] },
    { name: show['SMPL Order Processor Name'], email: show['SMPL Order Processor Email'] },
    { name: show['SMPL Sales-Requested Personnel Coordinator Name'], email: '' },
  ].filter(p => p.name || p.email)

  for (const person of smplStaff) {
    const role = person.email
      ? lookups.accountUserRoles.find((r: any) => r.email && r.email.toLowerCase() === person.email.toLowerCase())
      : lookups.accountUserRoles.find((r: any) => {
        const fullName = `${r.first_name || ''} ${r.last_name || ''}`.trim()
        return fullName.toLowerCase() === (person.name || '').toLowerCase()
      })

    if (!role) {
      logFn('warn', 'EventStaffLink', `Lasso account_user_role not found for: ${person.name} <${person.email || 'no email'}>`)
      continue
    }

    const alreadyLinked = embeddedRelationships.some((rel: any) => rel.account_user_role === role.id)
    if (!alreadyLinked) {
      await api.createEventAccountUserRoleRelationship({ event: eventId, account_user_role: role.id })
      logFn('created', 'EventStaffLink', person.name || person.email || '')
    } else {
      logFn('unchanged', 'EventStaffLink', person.name || person.email || '')
    }
  }

  const existingGroups = await api.getEventGroups(eventId)
  const roomName = show['Room'] || null

  for (const call of calls) {
    const groupPayload = buildEventGroupPayload(call, eventId, venueId, roomName)
    const existingGroup = existingGroups.find(
      (g: any) => g.external_code && g.external_code === groupPayload.external_code
    )
    let groupId: number

    if (existingGroup) {
      const changes = computeDiff(groupPayload, existingGroup)
      if (changes) {
        await api.updateEventGroup(existingGroup.id, changes)
        logFn('updated', 'EventGroup', `${call.callType} (${call.date})`)
      } else {
        logFn('unchanged', 'EventGroup', `${call.callType} (${call.date})`)
      }
      groupId = existingGroup.id
    } else {
      const created = await api.createEventGroup(groupPayload)
      logFn('created', 'EventGroup', `${call.callType} (${call.date})`)
      groupId = created.id
    }

    for (const positionEntry of call.positions) {
      const positionId = getPositionId(positionEntry.title, positionIds)
      let eventPositionId: number
      let epJustCreated = false
      const externalCode = `EP-${eventId}-${groupId}-${positionId}`
      const existingEP = isNewEvent
        ? null
        : eventPositionMap.get(externalCode) ?? null
      const epPayload = buildEventPositionPayload(
        call,
        positionEntry,
        eventId,
        groupId,
        positionId,
        existingEP?.note
      )

      if (isNewEvent) {
        // Event was just created — no event_positions can exist yet, skip the lookup
        const created = await api.createEventPosition(epPayload)
        logFn('created', 'EventPosition', positionEntry.title)
        eventPositionId = created.id
        epJustCreated = true
      } else {
        // Existing event — look up from the pre-seeded map (O(1), no API call).
        if (existingEP) {
          const changes = computeDiff(epPayload, existingEP)
          if (changes) {
            await api.updateEventPosition(existingEP.id, changes)
            logFn('updated', 'EventPosition', positionEntry.title)
          } else {
            logFn('unchanged', 'EventPosition', positionEntry.title)
          }
          eventPositionId = existingEP.id
        } else {
          const created = await api.createEventPosition(epPayload)
          logFn('created', 'EventPosition', positionEntry.title)
          eventPositionId = created.id
          epJustCreated = true
        }
      }

      const sePayload = buildScheduleEntryPayload(call, positionEntry, eventId, eventPositionId)

      if (epJustCreated) {
        // When createEventPosition is called with day_begin/day_end set, the
        // Lasso API automatically creates the schedule entry as a convenience.
        // Sending another POST would produce a 400 "unique set" duplicate error.
        logFn('created', 'ScheduleEntry', `${sePayload.date} ${call.callType} (auto-created with position)`)
      } else {
        // Look up schedule entries from the pre-seeded event position map.
        const matchedEP = eventPositionMap.get(epPayload.external_code as string) ?? null
        const embeddedScheduleEntries: any[] = matchedEP?.schedule_entries ?? []

        const existingEntry = embeddedScheduleEntries.find(
          (se: any) => se.external_code === sePayload.external_code
        ) ?? embeddedScheduleEntries.find(
          (se: any) => se.date === sePayload.date
        ) ?? null

        if (existingEntry) {
          const changes = computeDiff(sePayload, existingEntry)
          if (changes) {
            await api.updateScheduleEntry(existingEntry.id, changes)
            logFn('updated', 'ScheduleEntry', `${sePayload.date} ${call.callType}`)
          } else {
            logFn('unchanged', 'ScheduleEntry', `${sePayload.date} ${call.callType}`)
          }
        } else {
          await api.createScheduleEntry(sePayload)
          logFn('created', 'ScheduleEntry', `${sePayload.date} ${call.callType}`)
        }
      }
    }
  }

  logFn('info', 'Job', `✓ Job ${jobNumber} "${show['Job Name']}" processed successfully.`)
}
