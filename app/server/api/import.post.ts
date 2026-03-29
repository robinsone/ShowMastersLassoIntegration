import { createEventStream, readBody, createError } from 'h3'
import { resolveImportLookups, importShow } from '../utils/lasso'
import type { ParsedJob, LogEntry } from '../../types/index'

export default defineEventHandler(async (event) => {
  // Read body before creating the event stream
  const body = await readBody<{ jobs: ParsedJob[] }>(event)

  if (!body?.jobs?.length) {
    throw createError({ statusCode: 400, message: 'No jobs provided in request body.' })
  }

  const { jobs } = body
  const eventStream = createEventStream(event)

  const push = (entry: LogEntry) =>
    eventStream.push(JSON.stringify(entry))

    // Process jobs in the background while the SSE stream is open
    ; (async () => {
      try {
        for (let i = 0; i < jobs.length; i++) {
          const { show, calls } = jobs[i]

          await push({
            type: 'job_start',
            jobIndex: i,
            jobNumber: show['Job Number'],
            total: jobs.length,
          })

          // Resolve Lasso reference data for this job
          const lookups = await resolveImportLookups(show)

          // Stream every log line from the import back to the client
          const logFn = (action: string, entity: string, name: string) => {
            push({ type: 'log', action, entity, name })
          }

          await importShow(show, calls, lookups, logFn)

          await push({ type: 'job_done', jobIndex: i, jobNumber: show['Job Number'] })
        }

        await push({ type: 'complete' })
      } catch (err: any) {
        await push({ type: 'error', message: err.message ?? 'An unexpected error occurred.' })
      } finally {
        await eventStream.close()
      }
    })()

  return eventStream.send()
})
