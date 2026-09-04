<script setup lang="ts">
import type { InputHTMLAttributes } from 'vue'
import type { ParsedJob, ParsedCall } from '../types/index'

// Keys must match actual ShowMasters SimpleData column headers exactly.
interface InputField {
  key: string
  label: string
  required?: boolean
  description?: string
  placeholder?: string
  leadingIcon?: string
  type?: InputHTMLAttributes['type']
  autocomplete?: InputHTMLAttributes['autocomplete']
}

const SHOW_FIELDS: InputField[] = [
  { key: 'Billable Company', label: 'Billable Company', required: true, placeholder: 'Client company name', leadingIcon: 'i-lucide-building-2', autocomplete: 'organization' },
  { key: 'Job Number', label: 'Job Number', required: true, placeholder: 'ShowMasters job number', leadingIcon: 'i-lucide-hash', autocomplete: 'off' },
  { key: 'Job Name', label: 'Job Name', required: true, placeholder: 'Event name', leadingIcon: 'i-lucide-briefcase-business', autocomplete: 'off' },
  { key: 'Venue', label: 'Venue Name', required: true, placeholder: 'Venue name', leadingIcon: 'i-lucide-map-pin', autocomplete: 'off' },
  { key: 'Venue Street Address', label: 'Venue Address', placeholder: 'Street address', leadingIcon: 'i-lucide-map' },
  { key: 'Venue City', label: 'City', placeholder: 'City', leadingIcon: 'i-lucide-building' },
  { key: 'Venue State', label: 'State', placeholder: 'State or province', leadingIcon: 'i-lucide-map-pinned' },
  { key: 'Venue Zip Code', label: 'Zip', placeholder: 'Postal code', leadingIcon: 'i-lucide-mailbox' },
  { key: 'Room', label: 'Room', placeholder: 'Room or area', leadingIcon: 'i-lucide-door-open' },
  { key: "Job's Market", label: 'Market', required: true, placeholder: 'City, State', leadingIcon: 'i-lucide-map-pin' },
  { key: 'SMPL Salesperson Name', label: 'SMPL Salesperson', placeholder: 'Salesperson name', leadingIcon: 'i-lucide-user-round' },
  { key: 'SMPL General Manager Name', label: 'SMPL GM', placeholder: 'General manager name', leadingIcon: 'i-lucide-user-round' },
]

const CONTACT_FIELDS: InputField[] = [
  { key: 'Orderer Name', label: 'Client Contact Name', required: true, placeholder: 'First and last name', leadingIcon: 'i-lucide-user-round', autocomplete: 'name' },
  { key: 'Orderer Email', label: 'Client Contact Email', placeholder: 'name@example.com', leadingIcon: 'i-lucide-mail', type: 'email', autocomplete: 'email' },
  { key: 'Orderer Office Phone', label: 'Client Contact Office Phone', placeholder: '(555) 555-5555', leadingIcon: 'i-lucide-phone', type: 'tel', autocomplete: 'tel' },
  { key: 'Orderer Mobile Number', label: 'Client Contact Mobile Number', placeholder: '(555) 555-5555', leadingIcon: 'i-lucide-smartphone', type: 'tel', autocomplete: 'tel' },
]

const { jobs, validationErrors, lassoStatuses, startImport, goBack } = useImport()

const activeJobIdx = ref(0)
const activeJob = computed(() => jobs.value[activeJobIdx.value])
const notesOpen = ref(false)
const statusOptions = computed(() =>
  lassoStatuses.value.map(status => ({ label: status.name, value: status.id }))
)

const errorsForJob = (idx: number) =>
  validationErrors.value.filter(e => e.jobIndex === idx)

const hasErrors = computed(() => validationErrors.value.length > 0)

function jobLabel(job: ParsedJob, i: number) {
  return job.show['Job Number'] ? `#${job.show['Job Number']}` : `Job ${i + 1}`
}
function jobSubLabel(job: ParsedJob) {
  return job.show['Venue'] || job.show['Job Name'] || ''
}
function selectedStatusLabel(job: ParsedJob) {
  return lassoStatuses.value.find(status => status.id === job.lassoStatusId)?.name ?? ''
}
function isMissingRequiredField(
  job: ParsedJob,
  field: { key: string; required?: boolean }
) {
  return field.required === true && !job.show[field.key]?.trim()
}

function addPosition(call: ParsedCall) {
  call.positions.push({
    title: '',
    label: '',
    quantity: 1,
    startTime: call.startTime,
    endTime: call.endTime,
    dressCode: '',
  })
}
function removePosition(call: ParsedCall, posIdx: number) {
  call.positions.splice(posIdx, 1)
}
function addCall(job: ParsedJob) {
  job.calls.push({
    date: '',
    startTime: '',
    endTime: '',
    callType: '',
    positions: [{ title: '', label: '', quantity: 1, startTime: '', endTime: '', dressCode: '' }],
  })
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
            <UCard :ui="{ header: 'bg-primary/10' }">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-briefcase" class="size-4 text-muted" />
                  <span class="text-sm font-semibold">Job Details</span>
                  <UBadge v-if="selectedStatusLabel(activeJob)"
                    :label="selectedStatusLabel(activeJob)" color="primary" variant="soft" size="xs"
                    class="ml-auto" />
                </div>
              </template>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                <UFormField label="Account Status *" name="lassoStatusId"
                  description="Matched from Job Confirmation Status in the uploaded file. Select a status if it is blank or has no Lasso match."
                  :class="['min-w-0', { 'rounded-md border border-error bg-error/5 p-2': activeJob.lassoStatusId == null }]">
                  <USelect v-model="activeJob.lassoStatusId" :items="statusOptions"
                    placeholder="Select a Lasso status" size="sm" class="w-full" />
                </UFormField>
                <UFormField v-for="f in SHOW_FIELDS" :key="f.key" :label="f.label + (f.required ? ' *' : '')"
                  :name="f.key" :description="f.description"
                  :class="['min-w-0', { 'rounded-md border border-error bg-error/5 p-2': isMissingRequiredField(activeJob, f) }]">
                  <UInput v-model="activeJob.show[f.key]" :type="f.type" :autocomplete="f.autocomplete"
                    :placeholder="f.placeholder" :leading-icon="f.leadingIcon" size="sm" class="w-full" />
                </UFormField>
              </div>
            </UCard>

            <!-- ── Client Contact ────────────────────────────────── -->
            <UCard :ui="{ header: 'bg-primary/10' }">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-contact" class="size-4 text-muted" />
                  <span class="text-sm font-semibold">Client Contact</span>
                </div>
              </template>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                <UFormField v-for="f in CONTACT_FIELDS" :key="f.key" :label="f.label + (f.required ? ' *' : '')"
                  :name="f.key"
                  :class="['min-w-0', { 'rounded-md border border-error bg-error/5 p-2': isMissingRequiredField(activeJob, f) }]">
                  <UInput v-model="activeJob.show[f.key]" :type="f.type" :autocomplete="f.autocomplete"
                    :placeholder="f.placeholder" :leading-icon="f.leadingIcon" size="sm" class="w-full" />
                </UFormField>
              </div>
            </UCard>

            <!-- ── Notes ──────────────────────────────────────────── -->
            <UCard :ui="{ header: 'bg-primary/10', body: notesOpen ? '' : 'hidden' }">
              <template #header>
                <button type="button" class="flex w-full cursor-pointer items-center gap-2 text-left text-sm font-semibold"
                  :aria-expanded="notesOpen" @click="notesOpen = !notesOpen">
                  <UIcon name="i-lucide-notebook-pen" class="size-4 text-muted" />
                  Notes
                  <span class="ml-auto flex items-center gap-1 text-xs font-medium text-muted">
                    {{ notesOpen ? 'Collapse' : 'Expand' }}
                    <UIcon :name="notesOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-4" />
                  </span>
                </button>
              </template>
              <div v-if="notesOpen" class="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
                <UFormField label="Client Notes" name="Client Notes" description="Saved to the Lasso client record."
                  class="min-w-0">
                  <UTextarea v-model="activeJob.show['Client Notes']" placeholder="Client-specific details"
                    leading-icon="i-lucide-notebook-pen" :rows="3" :maxrows="8" autoresize class="w-full" />
                </UFormField>
                <UFormField label="Venue Notes" name="Venue Notes" description="Saved to the Lasso venue record."
                  class="min-w-0">
                  <UTextarea v-model="activeJob.show['Venue Notes']" placeholder="Venue-specific details"
                    leading-icon="i-lucide-map-pin" :rows="3" :maxrows="8" autoresize class="w-full" />
                </UFormField>
                <UFormField label="Notes for Booking Staff" name="Notes for Booking Staff"
                  description="Added to the Event Description." class="min-w-0">
                  <UTextarea v-model="activeJob.show['Notes for Booking Staff']" placeholder="Booking staff instructions"
                    leading-icon="i-lucide-clipboard-list" :rows="3" :maxrows="8" autoresize class="w-full" />
                </UFormField>
                <UFormField label="Notes For Crew" name="Notes For Crew" description="Added to the Event Description."
                  class="min-w-0">
                  <UTextarea v-model="activeJob.show['Notes For Crew']" placeholder="Crew instructions"
                    leading-icon="i-lucide-users-round" :rows="3" :maxrows="8" autoresize class="w-full" />
                </UFormField>
                <UFormField label="Meeting Place for Crew" name="Meeting Place for Crew"
                  description="Added to the Event Description." class="min-w-0">
                  <UTextarea v-model="activeJob.show['Meeting Place for Crew']" placeholder="Where the crew should meet"
                    leading-icon="i-lucide-map-pinned" :rows="3" :maxrows="8" autoresize class="w-full" />
                </UFormField>
              </div>
            </UCard>

            <!-- ── Onsite Details ─────────────────────────────────── -->
            <UCard :ui="{ header: 'bg-primary/10' }">
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-map-pin" class="size-4 text-muted" />
                  <span class="text-sm font-semibold">Onsite Details</span>
                </div>
              </template>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
                <UFormField label="Onsite Contact Name" name="Onsite Contact Name" class="min-w-0">
                  <UInput v-model="activeJob.show['Onsite Contact Name']" placeholder="Onsite contact name"
                    leading-icon="i-lucide-user-round" autocomplete="name" size="sm" class="w-full" />
                </UFormField>
                <UFormField label="Onsite Contact Mobile Number" name="Onsite Contact Mobile Number" class="min-w-0">
                  <UInput v-model="activeJob.show['Onsite Contact Mobile Number']" type="tel"
                    placeholder="(555) 555-5555" leading-icon="i-lucide-smartphone" autocomplete="tel" size="sm"
                    class="w-full" />
                </UFormField>
                <UFormField label="Order Change Authorization" name="Onsite Contact Order Change Authorization"
                  class="min-w-0">
                  <UInput v-model="activeJob.show['Onsite Contact Order Change Authorization']"
                    placeholder="Authorized contact or instructions" leading-icon="i-lucide-badge-check" size="sm"
                    class="w-full" />
                </UFormField>
                <UFormField label="Onsite Payment Details" name="Onsite Payment Details"
                  description="Added to the Event Description."
                  class="min-w-0 sm:col-span-3">
                  <UTextarea v-model="activeJob.show['Onsite Payment Details']" placeholder="Onsite payment instructions"
                    leading-icon="i-lucide-credit-card" :rows="3" :maxrows="8" autoresize class="w-full" />
                </UFormField>
              </div>
            </UCard>

            <!-- ── Calls ──────────────────────────────────────── -->
            <UCard :ui="{ header: 'bg-primary/10' }">
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
                      <UInput v-model="call.callType" placeholder="Call Type" size="sm" />
                      <UInput v-model="call.date" placeholder="Date" size="sm"
                        :class="{ 'rounded-md ring-1 ring-error': !call.date }" />
                      <UInput v-model="call.startTime" placeholder="Start" size="sm" />
                      <UInput v-model="call.endTime" placeholder="End" size="sm" />
                    </div>
                    <UButton icon="i-lucide-trash-2" color="error" variant="ghost" size="xs" class="shrink-0"
                      @click="removeCall(activeJob, callIdx)" />
                  </div>

                  <!-- Positions table -->
                  <div class="sm:ml-6 rounded-lg border border-default overflow-x-auto">
                    <table class="w-full min-w-[440px] text-sm">
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
                          <th class="text-left px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                            Dress Code
                          </th>
                          <th class="w-10" />
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default">
                        <tr v-for="(pos, posIdx) in call.positions" :key="posIdx"
                          class="group hover:bg-elevated/40 transition-colors">
                          <td class="px-2 py-1">
                            <UInput v-model="pos.title" variant="ghost"
                              :class="{ 'rounded-md ring-1 ring-error': !pos.title?.trim() }"
                              size="sm" placeholder="e.g. HAND – LIGHTING" class="w-full" />
                          </td>
                          <td class="px-2 py-1">
                            <UInput v-model="pos.label" variant="ghost"
                              size="sm" placeholder="e.g. TEST" class="w-full" />
                          </td>
                          <td class="px-2 py-1">
                            <UInput v-model.number="pos.quantity"
                              :class="{ 'rounded-md ring-1 ring-error': pos.quantity < 1 }"
                              type="number" min="1" variant="ghost" size="sm" class="w-full text-center" />
                          </td>
                          <td class="px-2 py-1">
                            <UInput v-model="pos.startTime"
                              variant="ghost" size="sm" placeholder="Start" class="w-full" />
                          </td>
                          <td class="px-2 py-1">
                            <UInput v-model="pos.endTime"
                              variant="ghost" size="sm" placeholder="End" class="w-full" />
                          </td>
                          <td class="px-2 py-1">
                            <UInput v-model="pos.dressCode"
                              variant="ghost" size="sm" placeholder="e.g. Black attire" class="w-full" />
                          </td>
                          <td class="px-1 py-1 text-center">
                            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs"
                              class="opacity-0 group-hover:opacity-100 transition-opacity"
                              @click="removePosition(call, posIdx)" />
                          </td>
                        </tr>
                        <tr v-if="!call.positions.length">
                          <td colspan="7" class="px-3 py-2 text-sm text-muted text-center italic">No positions</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="border-t border-default">
                          <td colspan="7" class="px-3 py-1.5">
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
