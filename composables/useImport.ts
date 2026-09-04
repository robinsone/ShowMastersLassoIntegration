import type { ParsedJob, LogEntry } from '../types/index'
import { validateJobs, type ValidationError } from '../utils/validate'
import { decodeCSVContent, parseCSVContent } from '../utils/csvParser'
import { parseExcelContent } from '../utils/excelParser'
import { resolveImportLookups, importShow, resolvePositionIds } from '../utils/importer'
import { getAccountEventStatuses, getAllPositions, type AccountEventStatus } from '../utils/lassoApi'

/**
 * Central composable that manages the full import flow state.
 * Uses useState for SSR-safe persistence across components on the same page.
 */
export const useImport = () => {
  const step = useState<'upload' | 'review' | 'progress' | 'complete'>('import_step', () => 'upload')
  const jobs = useState<ParsedJob[]>('import_jobs', () => [])
  const logs = useState<LogEntry[]>('import_logs', () => [])
  const isImporting = useState<boolean>('import_running', () => false)
  const importError = useState<string | null>('import_error', () => null)
  const validationErrors = useState<ValidationError[]>('import_validation_errors', () => [])
  const lassoStatuses = useState<AccountEventStatus[]>('import_lasso_statuses', () => [])
  const isUploading = useState<boolean>('import_uploading', () => false)
  const uploadError = useState<string | null>('import_upload_error', () => null)

  // Re-validate whenever job data is edited in the review step
  watch(jobs, (updated) => {
    validationErrors.value = validateJobs(updated, lassoStatuses.value.length > 0)
  }, { deep: true })

  const completedJobs = computed(() =>
    logs.value.filter(l => l.type === 'job_done').length
  )

  // ─── Upload & Parse ────────────────────────────────────────────────
  async function uploadAndParse(file: File) {
    isUploading.value = true
    uploadError.value = null
    jobs.value = []
    lassoStatuses.value = []
    validationErrors.value = []

    try {
      const filename = file.name.toLowerCase()
      const parsed = filename.endsWith('.xlsx')
        ? parseExcelContent(await file.arrayBuffer())
        : filename.endsWith('.csv')
          ? parseCSVContent(decodeCSVContent(await file.arrayBuffer()))
          : (() => {
              throw new Error('Select a ShowMasters CSV or .xlsx file.')
            })()

      let statuses: AccountEventStatus[]
      try {
        statuses = await getAccountEventStatuses()
      } catch (err: any) {
        uploadError.value = `Unable to fetch Lasso Account Statuses. ${err.message ?? 'Check the connection and try again.'}`
        return
      }

      if (statuses.length === 0) {
        uploadError.value = 'Lasso did not return any Account Status values. Check the connection and try again.'
        return
      }

      for (const job of parsed) {
        const sourceStatus = job.show['Job Confirmation Status']?.trim().toLowerCase()
        const matchedStatus = statuses.find(status => status.name.trim().toLowerCase() === sourceStatus)
        job.lassoStatusId = matchedStatus?.id
      }

      lassoStatuses.value = statuses
      jobs.value = parsed
      validationErrors.value = validateJobs(parsed, true)
      step.value = 'review'
    } catch (err: any) {
      uploadError.value = err.message ?? 'Failed to parse the uploaded file.'
    } finally {
      isUploading.value = false
    }
  }

  // ─── Start Import (client-side, direct API calls) ──────────────────
  async function startImport() {
    const currentValidationErrors = validateJobs(jobs.value, true)
    if (currentValidationErrors.length) {
      validationErrors.value = currentValidationErrors
      return
    }

    logs.value = []
    isImporting.value = true
    importError.value = null
    step.value = 'progress'

    const { getDivisionId } = useConfig()
    const divisionId = getDivisionId()
    const noteCache = new Map<string, number>()

    const push = (entry: LogEntry) => { logs.value.push(entry) }

    try {
      const lassoPositions = await getAllPositions()
      const positionIds = resolvePositionIds(jobs.value, lassoPositions)
      push({
        type: 'log',
        action: 'info',
        entity: 'Position',
        name: `Preflight passed using ${lassoPositions.length} Lasso positions.`,
      })

      for (let i = 0; i < jobs.value.length; i++) {
        const job = jobs.value[i]
        if (!job) {
          throw new Error(`Could not read job ${i + 1} before importing.`)
        }
        const { show, calls, lassoStatusId } = job

        push({
          type: 'job_start',
          jobIndex: i,
          jobNumber: show['Job Number'],
          total: jobs.value.length,
        })

        if (lassoStatusId == null) {
          throw new Error(`Select a Lasso Account Status for job ${show['Job Number']} before importing.`)
        }
        const lookups = await resolveImportLookups(show, lassoStatusId)

        const logFn = (action: string, entity: string, name: string) => {
          push({ type: 'log', action, entity, name })
        }

        await importShow(show, calls, lookups, divisionId, positionIds, logFn, noteCache)

        push({ type: 'job_done', jobIndex: i, jobNumber: show['Job Number'] })
      }

      push({ type: 'complete' })
      isImporting.value = false
      step.value = 'complete'
    } catch (err: any) {
      push({ type: 'error', message: err.message ?? 'An unexpected error occurred.' })
      importError.value = err.message ?? 'Import failed.'
      isImporting.value = false
    }
  }

  // ─── Reset ─────────────────────────────────────────────────────────
  function reset() {
    step.value = 'upload'
    jobs.value = []
    logs.value = []
    isImporting.value = false
    isUploading.value = false
    importError.value = null
    uploadError.value = null
    validationErrors.value = []
    lassoStatuses.value = []
  }

  // Navigate to the previous logical step without clearing job data.
  function goBack() {
    if (step.value === 'progress') {
      step.value = 'review'
      return
    }
    if (step.value === 'review') {
      step.value = 'upload'
      return
    }
    if (step.value === 'complete') {
      step.value = 'review'
      return
    }
    // default: stay or reset to upload
    step.value = 'upload'
  }

  return {
    step,
    jobs,
    logs,
    isImporting,
    isUploading,
    importError,
    uploadError,
    validationErrors,
    lassoStatuses,
    completedJobs,
    uploadAndParse,
    startImport,
    reset,
    goBack,
  }
}
