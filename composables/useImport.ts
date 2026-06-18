import type { ParsedJob, LogEntry } from '../types/index'
import { validateJobs, type ValidationError } from '../utils/validate'
import { parseCSVContent } from '../utils/csvParser'
import { resolveImportLookups, importShow } from '../utils/importer'

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
  const isUploading = useState<boolean>('import_uploading', () => false)
  const uploadError = useState<string | null>('import_upload_error', () => null)

  // Re-validate whenever job data is edited in the review step
  watch(jobs, (updated) => {
    validationErrors.value = validateJobs(updated)
  }, { deep: true })

  const completedJobs = computed(() =>
    logs.value.filter(l => l.type === 'job_done').length
  )

  // ─── Upload & Parse ────────────────────────────────────────────────
  async function uploadAndParse(file: File) {
    isUploading.value = true
    uploadError.value = null

    try {
      const content = await file.text()
      const parsed = parseCSVContent(content)
      jobs.value = parsed
      validationErrors.value = validateJobs(parsed)
      step.value = 'review'
    } catch (err: any) {
      uploadError.value = err.message ?? 'Failed to parse the CSV file.'
    } finally {
      isUploading.value = false
    }
  }

  // ─── Start Import (client-side, direct API calls) ──────────────────
  async function startImport() {
    logs.value = []
    isImporting.value = true
    importError.value = null
    step.value = 'progress'

    const { getDivisionId } = useConfig()
    const divisionId = getDivisionId()
    const noteCache = new Map<string, number>()

    const push = (entry: LogEntry) => { logs.value.push(entry) }

    try {
      for (let i = 0; i < jobs.value.length; i++) {
        const { show, calls } = jobs.value[i]

        push({
          type: 'job_start',
          jobIndex: i,
          jobNumber: show['Job Number'],
          total: jobs.value.length,
        })

        const lookups = await resolveImportLookups(show)

        const logFn = (action: string, entity: string, name: string) => {
          push({ type: 'log', action, entity, name })
        }

        await importShow(show, calls, lookups, divisionId, logFn, noteCache)

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
    completedJobs,
    uploadAndParse,
    startImport,
    reset,
  }
}
