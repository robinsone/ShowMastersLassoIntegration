export interface ParsedPosition {
  title: string
  label: string
  quantity: number
  startTime: string
  endTime: string
  dressCode: string
}

export interface ParsedCall {
  date: string
  startTime: string
  endTime: string
  callType: string
  positions: ParsedPosition[]
}

export interface ParsedJob {
  show: Record<string, string>
  calls: ParsedCall[]
}

export interface LogEntry {
  type: 'log' | 'job_start' | 'job_done' | 'complete' | 'error' | 'info'
  action?: string
  entity?: string
  name?: string
  message?: string
  jobIndex?: number
  jobNumber?: string
  total?: number
}
