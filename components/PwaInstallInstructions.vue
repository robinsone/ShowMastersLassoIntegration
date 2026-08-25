<script setup lang="ts">
defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()
</script>

<template>
  <UModal
    :open="open"
    title="Install ShowMasters → Lasso"
    description="Install the app for faster access and an app-like window."
    :ui="{ content: 'max-w-lg', footer: 'justify-end' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="space-y-5 text-sm leading-6 text-muted">
        <section class="space-y-1">
          <h3 class="font-semibold text-highlighted">Chrome on desktop</h3>
          <p>
            Select the install icon at the right of the address bar. You can also open the three-dot menu,
            then choose <strong class="text-default">Cast, save, and share</strong> and
            <strong class="text-default">Install ShowMasters → Lasso</strong>.
          </p>
        </section>

        <section class="space-y-1">
          <h3 class="font-semibold text-highlighted">Edge on desktop</h3>
          <p>
            Select the app-available icon at the right of the address bar. You can also open the three-dot menu,
            choose <strong class="text-default">Apps</strong>, then
            <strong class="text-default">Install ShowMasters → Lasso</strong>.
          </p>
        </section>

        <section class="space-y-1">
          <h3 class="font-semibold text-highlighted">Chrome on Android</h3>
          <p>
            Open the three-dot menu, then select <strong class="text-default">Install app</strong> or
            <strong class="text-default">Add to Home screen</strong>.
          </p>
        </section>
      </div>
    </template>

    <template #footer>
      <UButton label="Close" color="neutral" variant="outline" @click="emit('update:open', false)" />
    </template>
  </UModal>
</template>
