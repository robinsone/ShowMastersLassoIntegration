<script setup lang="ts">
const { jobs, logs, reset } = useImport()

const createdCount = computed(() => logs.value.filter(l => l.action === 'created').length)
const updatedCount = computed(() => logs.value.filter(l => l.action === 'updated').length)
const unchangedCount = computed(() => logs.value.filter(l => l.action === 'unchanged').length)
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 p-8">
    <div class="w-full max-w-md space-y-8 text-center">
      <div class="space-y-3">
        <div class="flex justify-center">
          <UIcon name="i-lucide-circle-check-big" class="size-16 text-success" />
        </div>
        <h1 class="text-3xl font-bold text-highlighted">Import Complete</h1>
        <p class="text-muted">
          {{ jobs.length }} job{{ jobs.length !== 1 ? 's' : '' }} imported successfully.
        </p>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4">
        <UCard class="text-center">
          <p class="text-2xl font-bold text-success">{{ createdCount }}</p>
          <p class="text-xs text-muted mt-1">Created</p>
        </UCard>
        <UCard class="text-center">
          <p class="text-2xl font-bold text-warning">{{ updatedCount }}</p>
          <p class="text-xs text-muted mt-1">Updated</p>
        </UCard>
        <UCard class="text-center">
          <p class="text-2xl font-bold text-muted">{{ unchangedCount }}</p>
          <p class="text-xs text-muted mt-1">Unchanged</p>
        </UCard>
      </div>

      <UButton
        size="lg"
        label="Import Another File"
        icon="i-lucide-upload-cloud"
        variant="soft"
        class="w-full"
        @click="reset"
      />
    </div>
  </div>
</template>
