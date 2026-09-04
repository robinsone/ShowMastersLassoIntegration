<script setup lang="ts">
import { getDivisionIdError, type LassoSettings } from '../composables/useConfig'

const emit = defineEmits<{ configured: [] }>()

const { settings, isConfigured, save } = useConfig()

const form = reactive<LassoSettings>({
  apiKey: settings.value.apiKey,
  baseUrl: settings.value.baseUrl,
  divisionId: settings.value.divisionId,
})

const saved = ref(false)
const divisionIdError = computed(() => getDivisionIdError(form.divisionId))

function onSubmit() {
  if (divisionIdError.value) return
  save({ ...form })
  saved.value = true
  setTimeout(() => {
    saved.value = false
    if (isConfigured.value) emit('configured')
  }, 800)
}
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 p-8">
    <div class="w-full max-w-lg space-y-6">
      <div class="space-y-1">
        <h1 class="text-2xl font-bold text-highlighted">Lasso Credentials</h1>
        <p class="text-sm text-muted">
          Your credentials are stored only in your browser's local storage and never sent to any server other than Lasso.
        </p>
      </div>

      <UCard>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <UFormField label="Lasso API Key" name="apiKey" required>
            <UInput
              v-model="form.apiKey"
              type="password"
              placeholder="Your LASSO-APIKEY"
              autocomplete="off"
              class="w-full font-mono"
            />
          </UFormField>

          <UFormField label="Lasso Base URL" name="baseUrl" required>
            <UInput
              v-model="form.baseUrl"
              placeholder="https://test1.lasso.io/api/v1"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Division ID (optional)" name="divisionId" :error="divisionIdError">
            <UInput
              v-model="form.divisionId"
              placeholder="Leave blank when Lasso has no divisions"
              class="w-full"
            />
            <p class="mt-1 text-xs text-muted">
              Enter a positive numeric ID to assign a division. Blank sends no division.
            </p>
          </UFormField>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              type="submit"
              :label="saved ? 'Saved!' : 'Save Credentials'"
              :icon="saved ? 'i-lucide-check' : 'i-lucide-save'"
              :color="saved ? 'success' : 'primary'"
            />
          </div>
        </form>
      </UCard>

      <UAlert
        v-if="!isConfigured"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Valid configuration required"
        :description="divisionIdError ?? 'Fill in your API key and base URL to start importing.'"
      />

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="Connection note"
        description="The app sends Lasso requests through its connection service, so browser CORS settings are not required."
      />
    </div>
  </div>
</template>
