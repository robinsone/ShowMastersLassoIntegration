import type { ParsedJob } from '../types/index'

export interface ValidationError {
  jobIndex: number
  field: string
  message: string
}

const REQUIRED_SHOW_FIELDS: string[] = [
  'Job Number',
  'Job Name',
  'Orderer Name',
  "Job's Market",
  'Venue',
  'Job Confirmation Status',
]

/**
 * Validates all parsed jobs and returns an array of validation errors.
 * Returns an empty array if all jobs are valid.
 */
export function validateJobs(jobs: ParsedJob[]): ValidationError[] {
  const errors: ValidationError[] = []

  for (let i = 0; i < jobs.length; i++) {
    const { show, calls } = jobs[i]

    for (const field of REQUIRED_SHOW_FIELDS) {
      if (!show[field]?.trim()) {
        errors.push({ jobIndex: i, field, message: `"${field}" is required.` })
      }
    }

    if (!calls.length) {
      errors.push({ jobIndex: i, field: 'calls', message: 'Job has no call groups.' })
    }

    for (const call of calls) {
      if (!call.date) {
        errors.push({ jobIndex: i, field: 'call.date', message: `Missing date on one or more call groups.` })
      }
      for (const pos of call.positions) {
        if (!pos.title?.trim()) {
          errors.push({ jobIndex: i, field: 'position.title', message: `A position is missing a title on ${call.date}.` })
        }
        if (pos.quantity < 1) {
          errors.push({ jobIndex: i, field: 'position.quantity', message: `Position quantity must be ≥ 1 on ${call.date}.` })
        }
      }
    }
  }

  return errors
}
