<script setup lang="ts">
definePageMeta({ layout: 'default' })
const { step } = useImport()
const { isConfigured } = useConfig()

const showConfig = useState('show_config', () => false)

// If not yet configured, show the config screen first
onMounted(() => {
  if (!isConfigured.value) showConfig.value = true
})
</script>

<template>
  <div>
    <StepConfig v-if="showConfig" @configured="showConfig = false" />
    <template v-else>
      <StepUpload v-if="step === 'upload'" />
      <StepReview v-else-if="step === 'review'" />
      <StepProgress v-else-if="step === 'progress'" />
      <StepComplete v-else-if="step === 'complete'" />
    </template>
  </div>
</template>
