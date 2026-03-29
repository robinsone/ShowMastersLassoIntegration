import type { ParsedJob, LogEntry } from '../types/index'
import { validateJobs, type ValidationError } from '../utils/validate'

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
      const formData = new FormData()
      formData.append('file', file)

      const res = await $fetch<{ jobs: ParsedJob[] }>('/api/parse', {
        method: 'POST',
        body: formData,
      })

      jobs.value = res.jobs
      validationErrors.value = validateJobs(res.jobs)
      step.value = 'review'
    } catch (err: any) {
      uploadError.value = err.data?.message ?? err.message ?? 'Failed to parse the CSV file.'
    } finally {
      isUploading.value = false
    }
  }

  // ─── Start Import (SSE streaming) ──────────────────────────────────
  async function startImport() {
    logs.value = []
    isImporting.value = true
    importError.value = null
    step.value = 'progress'

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: jobs.value }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()! // retain incomplete last line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const entry: LogEntry = JSON.parse(line.slice(6))
              logs.value.push(entry)

              if (entry.type === 'complete') {
                isImporting.value = false
                step.value = 'complete'
              } else if (entry.type === 'error') {
                importError.value = entry.message ?? 'Import failed.'
                isImporting.value = false
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }
      }
    } catch (err: any) {
      importError.value = err.message ?? 'Connection to import server failed.'
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
