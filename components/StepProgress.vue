<script setup lang="ts">
import type { LogEntry } from '../types/index'

const { logs, isImporting, importError, jobs, completedJobs, goBack } = useImport()

const logContainer = ref<HTMLElement | null>(null)

// Auto-scroll log container as new entries arrive
watch(logs, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
}, { deep: true })

const progressPercent = computed(() => {
  const total = jobs.value.length
  if (!total) return 0
  return Math.round((completedJobs.value / total) * 100)
})

// Colour + prefix for each log action
function entryClass(entry: LogEntry): string {
  if (entry.type === 'job_start') return 'text-primary font-semibold'
  if (entry.type === 'job_done') return 'text-success font-semibold'
  if (entry.type === 'error') return 'text-error font-semibold'
  switch (entry.action) {
    case 'created': return 'text-success'
    case 'updated': return 'text-warning'
    case 'unchanged': return 'text-muted'
    case 'warn': return 'text-warning font-semibold'
    case 'info': return 'text-default'
    default: return 'text-default'
  }
}

function formatEntry(entry: LogEntry): string {
  if (entry.type === 'job_start') {
    return `\n▶ Importing Job ${entry.jobNumber} (${(entry.jobIndex ?? 0) + 1}/${entry.total ?? jobs.value.length})`
  }
  if (entry.type === 'job_done') {
    return `✓ Job ${entry.jobNumber} complete`
  }
  if (entry.type === 'error') {
    return `✗ ERROR: ${entry.message}`
  }
  if (entry.action === 'info') {
    return entry.name ?? ''
  }
  const labels: Record<string, string> = {
    created: '  [+]',
    updated: '  [~]',
    unchanged: '  [=]',
    warn: '[WARN]',
    skip: ' [>>]',
  }
  const prefix = labels[entry.action ?? ''] ?? '  [ ]'
  return `${prefix} ${entry.entity}: ${entry.name}`
}
</script>

<template>
  <div class="flex flex-col px-4 sm:px-6 py-6">
    <div class="max-w-3xl mx-auto w-full space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between space-y-1">
        <div>
          <h1 class="text-xl font-bold text-highlighted">Importing…</h1>
          <p class="text-sm text-muted">
            {{ completedJobs }} of {{ jobs.length }} job{{ jobs.length !== 1 ? 's' : '' }} complete
          </p>
        </div>
        <div class="shrink-0">
          <UButton v-if="importError" label="Back" icon="i-lucide-arrow-left" color="neutral" variant="ghost" size="sm"
            :disabled="isImporting" @click="goBack" />
        </div>
      </div>

      <!-- Progress bar -->
      <UProgress :value="progressPercent" :color="importError ? 'error' : 'primary'" class="w-full" />

      <!-- Error banner -->
      <UAlert v-if="importError" color="error" variant="soft" icon="i-lucide-circle-x" title="Import failed"
        :description="importError" />

      <!-- Scrollable log -->
      <div ref="logContainer"
        class="bg-[#0d1117] dark:bg-[#0d1117] rounded-xl border border-default font-mono text-xs leading-5 p-4 h-[60vh] overflow-y-auto">
        <div v-for="(entry, idx) in logs" :key="idx" :class="entryClass(entry)" class="whitespace-pre-wrap break-all">{{
          formatEntry(entry) }}</div>

        <div v-if="isImporting" class="text-muted mt-2 animate-pulse">
          Processing…
        </div>
      </div>
    </div>
  </div>
</template>
