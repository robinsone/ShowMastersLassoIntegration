<script setup lang="ts">
import type { ParsedJob, ParsedCall } from '../types/index'

// Keys must match actual CSV column headers exactly
const SHOW_FIELDS: Array<{ key: string; label: string; required?: boolean }> = [
  { key: 'Job Number', label: 'Job Number', required: true },
  { key: 'Job Name', label: 'Job Name', required: true },
  { key: 'Orderer Name', label: 'Client Company', required: true },
  { key: 'Orderer Email', label: 'Client Email' },
  { key: 'Orderer Office Phone', label: 'Client Phone' },
  { key: 'Venue', label: 'Venue Name', required: true },
  { key: 'Venue Street Address', label: 'Venue Address' },
  { key: 'Venue City', label: 'City' },
  { key: 'Venue State', label: 'State' },
  { key: 'Venue Zip Code', label: 'Zip' },
  { key: 'Room', label: 'Room' },
  { key: "Job's Market", label: 'Market', required: true },
  { key: 'Job Confirmation Status', label: 'Status', required: true },
  { key: 'SMPL Salesperson Name', label: 'SMPL Salesperson' },
  { key: 'SMPL General Manager Name', label: 'SMPL GM' },
]

const { jobs, validationErrors, startImport, goBack } = useImport()

const activeJobIdx = ref(0)
const activeJob = computed(() => jobs.value[activeJobIdx.value])

const errorsForJob = (idx: number) =>
  validationErrors.value.filter(e => e.jobIndex === idx)

const hasErrors = computed(() => validationErrors.value.length > 0)

function jobLabel(job: ParsedJob, i: number) {
  return job.show['Job Number'] ? `#${job.show['Job Number']}` : `Job ${i + 1}`
}
function jobSubLabel(job: ParsedJob) {
  return job.show['Venue'] || job.show['Job Name'] || ''
}

function addPosition(call: ParsedCall) {
  call.positions.push({ title: '', label: '', quantity: 1, startTime: call.startTime, endTime: call.endTime })
}
function removePosition(call: ParsedCall, posIdx: number) {
  call.positions.splice(posIdx, 1)
}
function addCall(job: ParsedJob) {
  job.calls.push({ date: '', startTime: '', endTime: '', callType: '', positions: [{ title: '', quantity: 1, startTime: '', endTime: '' }] })
}
function removeCall(job: ParsedJob, callIdx: number) {
  job.calls.splice(callIdx, 1)
}

function callBorderClass(type: string): string {
  const t = type.toUpperCase()
  if (t.includes('LOAD IN')) return 'border-l-4 border-primary'
  if (t.includes('LOAD OUT')) return 'border-l-4 border-warning'
  if (t.includes('SHOW')) return 'border-l-4 border-success'
  return 'border-l-4 border-default'
}
</script>

<template>
  <!-- Full-height split layout: sidebar | main -->
  <div class="flex flex-col flex-1 overflow-hidden">

    <!-- ── Top action bar ────────────────────────────────────────── -->
    <div
      class="shrink-0 border-b border-default px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <h1 class="text-base font-semibold text-highlighted leading-tight">Review &amp; Edit</h1>
        <p class="text-xs text-muted">
          {{ jobs.length }} job{{ jobs.length !== 1 ? 's' : '' }} — verify before importing
        </p>
      </div>
      <!-- Validation summary (compact) -->
      <div v-if="hasErrors" class="flex items-center gap-2 text-xs text-warning">
        <UIcon name="i-lucide-triangle-alert" class="size-3.5 shrink-0" />
        {{ validationErrors.length }} issue{{ validationErrors.length !== 1 ? 's' : '' }} — fix before importing
      </div>
      <div class="flex gap-2 shrink-0">
        <UButton label="Back" icon="i-lucide-arrow-left" color="neutral" variant="ghost" size="sm" @click="goBack" />
        <UButton label="Start Import" icon="i-lucide-play" size="sm" :disabled="hasErrors" @click="startImport" />
      </div>
    </div>

    <!-- ── Body: sidebar + detail ────────────────────────────────── -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Job sidebar — hidden on mobile, shown as horizontal scroll row -->
      <aside v-if="jobs.length > 1"
        class="hidden sm:flex flex-col w-52 shrink-0 border-r border-default overflow-y-auto">
        <div class="px-2 py-2 text-xs font-semibold text-muted uppercase tracking-wider px-3">
          Jobs
        </div>
        <button v-for="(job, i) in jobs" :key="i"
          class="w-full text-left px-3 py-2.5 flex items-start gap-2.5 border-l-2 transition-colors hover:bg-elevated/60"
          :class="activeJobIdx === i
            ? 'border-primary bg-primary/5 text-highlighted'
            : 'border-transparent text-muted'" @click="activeJobIdx = i">
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold leading-tight truncate">{{ jobLabel(job, i) }}</div>
            <div class="text-xs text-muted truncate mt-0.5">{{ jobSubLabel(job) || '—' }}</div>
          </div>
          <!-- Error indicator -->
          <UIcon v-if="errorsForJob(i).length" name="i-lucide-circle-alert"
            class="size-3.5 text-warning shrink-0 mt-0.5" />
        </button>
      </aside>

      <!-- Mobile job picker (horizontal chips) -->
      <div v-if="jobs.length > 1"
        class="sm:hidden shrink-0 flex gap-2 overflow-x-auto px-4 py-2 border-b border-default absolute top-[88px] left-0 right-0 bg-background z-10 scrollbar-none">
        <button v-for="(job, i) in jobs" :key="i"
          class="shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors" :class="activeJobIdx === i
            ? 'bg-primary text-inverted border-primary'
            : 'border-default text-muted hover:border-primary/50'" @click="activeJobIdx = i">
          {{ jobLabel(job, i) }}
          <UIcon v-if="errorsForJob(i).length" name="i-lucide-circle-alert"
            class="size-3 ml-1 text-warning inline-block" />
        </button>
      </div>

      <!-- ── Main content panel ─────────────────────────────────── -->
      <div class="flex-1 overflow-y-auto">
        <template v-if="activeJob">
          <div class="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-5" :class="jobs.length > 1 ? 'sm:pt-5 pt-12' : ''">

            <!-- Per-job errors -->
            <UAlert v-for="err in errorsForJob(activeJobIdx)" :key="err.field" color="error" variant="soft" size="sm"
              :description="`${err.field}: ${err.message}`" />

            <!-- ── Job Details ─────────────────────────────────── -->
            <UCard>
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-briefcase" class="size-4 text-muted" />
                  <span class="text-sm font-semibold">Job Details</span>
                  <UBadge v-if="activeJob.show['Job Confirmation Status']"
                    :label="activeJob.show['Job Confirmation Status']" color="primary" variant="soft" size="xs"
                    class="ml-auto" />
                </div>
              </template>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                <UFormField v-for="f in SHOW_FIELDS" :key="f.key" :label="f.label + (f.required ? ' *' : '')"
                  :name="f.key" class="min-w-0">
                  <UInput v-model="jobs[activeJobIdx].show[f.key]" size="sm" class="w-full" />
                </UFormField>
              </div>
            </UCard>

            <!-- ── Calls ──────────────────────────────────────── -->
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-calendar-days" class="size-4 text-muted" />
                    <span class="text-sm font-semibold">Calls ({{ activeJob.calls.length }})</span>
                  </div>
                  <UButton label="Add Call" icon="i-lucide-plus" color="neutral" variant="ghost" size="xs"
                    @click="addCall(activeJob)" />
                </div>
              </template>

              <div class="space-y-6">
                <div v-for="(call, callIdx) in activeJob.calls" :key="callIdx" class="space-y-2 pl-3 rounded-r-md"
                  :class="callBorderClass(call.callType)">

                  <!-- Call meta row -->
                  <div class="flex items-center gap-2">
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 min-w-0">
                      <UInput v-model="jobs[activeJobIdx].calls[callIdx].callType" placeholder="Call Type" size="sm" />
                      <UInput v-model="jobs[activeJobIdx].calls[callIdx].date" placeholder="Date" size="sm" />
                      <UInput v-model="jobs[activeJobIdx].calls[callIdx].startTime" placeholder="Start" size="sm" />
                      <UInput v-model="jobs[activeJobIdx].calls[callIdx].endTime" placeholder="End" size="sm" />
                    </div>
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" class="shrink-0"
                      @click="removeCall(activeJob, callIdx)" />
                  </div>

                  <!-- Positions table -->
                  <div class="sm:ml-6 rounded-lg border border-default overflow-x-auto">
                    <table class="w-full min-w-[320px] text-sm">
                      <thead>
                        <tr class="border-b border-default bg-elevated">
                          <th class="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                            Position Title
                          </th>
                          <th class="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                            Position Label
                          </th>
                          <th
                            class="text-center px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide w-20">
                            Qty</th>
                          <th
                            class="text-center px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide w-24">
                            Start</th>
                          <th
                            class="text-center px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide w-24">
                            End</th>
                          <th class="w-10" />
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default">
                        <tr v-for="(pos, posIdx) in call.positions" :key="posIdx"
                          class="group hover:bg-elevated/40 transition-colors">
                          <td class="px-2 py-1">
                            <UInput v-model="jobs[activeJobIdx].calls[callIdx].positions[posIdx].title" variant="ghost"
                              size="sm" placeholder="e.g. HAND – LIGHTING" class="w-full" />
                          </td>
                          <td class="px-2 py-1">
                            <UInput v-model="jobs[activeJobIdx].calls[callIdx].positions[posIdx].label" variant="ghost"
                              size="sm" placeholder="e.g. TEST" class="w-full" />
                          </td>
                          <td class="px-2 py-1">
                            <UInput v-model.number="jobs[activeJobIdx].calls[callIdx].positions[posIdx].quantity"
                              type="number" min="1" variant="ghost" size="sm" class="w-full text-center" />
                          </td>
                          <td class="px-2 py-1">
                            <UInput v-model="jobs[activeJobIdx].calls[callIdx].positions[posIdx].startTime"
                              variant="ghost" size="sm" placeholder="Start" class="w-full" />
                          </td>
                          <td class="px-2 py-1">
                            <UInput v-model="jobs[activeJobIdx].calls[callIdx].positions[posIdx].endTime"
                              variant="ghost" size="sm" placeholder="End" class="w-full" />
                          </td>
                          <td class="px-1 py-1 text-center">
                            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs"
                              class="opacity-0 group-hover:opacity-100 transition-opacity"
                              @click="removePosition(call, posIdx)" />
                          </td>
                        </tr>
                        <tr v-if="!call.positions.length">
                          <td colspan="6" class="px-3 py-2 text-sm text-muted text-center italic">No positions</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="border-t border-default">
                          <td colspan="6" class="px-3 py-1.5">
                            <UButton label="Add position" icon="i-lucide-plus" color="neutral" variant="ghost" size="xs"
                              @click="addPosition(call)" />
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <div v-if="!activeJob.calls.length" class="text-center py-8 text-muted text-sm">
                  No call groups — click "Add Call" to start.
                </div>
              </div>
            </UCard>

          </div>
        </template>
      </div>
    </div>
  </div>
</template>
