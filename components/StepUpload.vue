<script setup lang="ts">
const { isUploading, uploadError, uploadAndParse } = useImport()

const fileRef = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) uploadAndParse(file)
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) uploadAndParse(file)
}
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 p-8">
    <div class="w-full max-w-lg space-y-6">
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold text-highlighted">ShowMasters → Lasso</h1>
        <p class="text-muted">Upload a ShowMasters CSV or Excel file to import jobs into Lasso.</p>
      </div>

      <!-- Drop zone -->
      <div
        class="border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors"
        :class="dragOver ? 'border-primary bg-primary/5' : 'border-default hover:border-primary/60'"
        @click="fileRef?.click()"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <UIcon name="i-lucide-upload-cloud" class="size-12 text-muted" />
        <div class="text-center">
          <p class="font-medium text-highlighted">Drop a CSV or Excel file here, or click to browse</p>
          <p class="text-sm text-muted mt-1">ShowMasters.csv or ShowMasters.xlsx (one or more jobs)</p>
        </div>
        <UButton
          label="Select File"
          icon="i-lucide-file-spreadsheet"
          variant="soft"
          :loading="isUploading"
          @click.stop="fileRef?.click()"
        />
      </div>

      <input
        ref="fileRef"
        type="file"
        accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        class="hidden"
        @change="onFileChange"
      />

      <UAlert
        v-if="uploadError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-x"
        title="Upload failed"
        :description="uploadError"
      />
    </div>
  </div>
</template>
