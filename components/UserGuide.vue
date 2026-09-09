<script setup lang="ts">
defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  openSettings: []
}>()
</script>

<template>
  <USlideover
    :open="open"
    side="right"
    title="User Guide"
    close
    :dismissible="true"
    :overlay="true"
    :ui="{ content: 'w-full max-w-md', body: 'overflow-y-auto' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-7">
        <section class="space-y-3">
        <h3 class="text-base font-semibold text-highlighted">Before you begin</h3>
        <p class="text-sm leading-6 text-muted">
          Ask your supervisor or manager for your Lasso API key, Lasso base URL, and optional Division ID.
          The position names in your CSV or Excel file must already exist in Lasso.
        </p>
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-shield-check"
          title="Your connection details"
          description="They are saved only in this browser."
        />
      </section>

      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-inverted">1</span>
          <h3 class="text-base font-semibold text-highlighted">Connect to Lasso</h3>
        </div>
        <p class="text-sm leading-6 text-muted">
          Enter the connection details you received, then select <strong>Save Credentials</strong>.
          You can update them later with the settings button in the header.
        </p>
        <UButton
          label="Open connection settings"
          icon="i-lucide-settings"
          size="sm"
          @click="emit('openSettings')"
        />
      </section>

      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-inverted">2</span>
          <h3 class="text-base font-semibold text-highlighted">Upload your ShowMasters file</h3>
        </div>
        <p class="text-sm leading-6 text-muted">
          Choose or drop your ShowMasters CSV or .xlsx file. Excel files must use the existing
          SimpleData headers in the first populated row. Each file can contain one or more jobs.
        </p>
      </section>

      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-inverted">3</span>
          <h3 class="text-base font-semibold text-highlighted">Review before importing</h3>
        </div>
        <p class="text-sm leading-6 text-muted">
          Check each job's details, including Job Confirmation Status (read-only and always set to Unconfirmed).
          Also review the Billable Company and client contact, notes, calls, position names, quantities, and times. Fix every warning before selecting
          <strong>Start Import</strong>. You can add or remove calls and positions when needed.
        </p>
      </section>

      <section class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-inverted">4</span>
          <h3 class="text-base font-semibold text-highlighted">Start the import</h3>
        </div>
        <p class="text-sm leading-6 text-muted">
          Select <strong>Start Import</strong> and watch the progress log. It shows which records were created,
          updated, or left unchanged. When it finishes, select <strong>Import Another File</strong> to begin again.
        </p>
      </section>

      <section class="space-y-3 border-t border-default pt-6">
        <h3 class="text-base font-semibold text-highlighted">If something goes wrong</h3>
        <div class="space-y-3 text-sm leading-6 text-muted">
          <p>
            <strong class="text-default">The file will not upload:</strong> Make sure it is a ShowMasters CSV or
            unprotected .xlsx file with SimpleData headers, then try again.
          </p>
          <p>
            <strong class="text-default">A position is missing or duplicated:</strong> Ask your supervisor or
            manager to create or correct the matching Lasso position, then retry the import.
          </p>
          <p>
            <strong class="text-default">Lasso cannot be reached:</strong> Check the connection details. If they
            are correct, ask your supervisor or manager to confirm that the Lasso address is available.
          </p>
          <p>
            <strong class="text-default">An import fails:</strong> Select <strong>Back</strong>, correct the
            information shown in the error, and start the import again.
          </p>
        </div>
        </section>
      </div>
    </template>

  </USlideover>
</template>
