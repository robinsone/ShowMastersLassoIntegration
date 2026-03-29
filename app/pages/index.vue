<script setup lang="ts">
definePageMeta({ layout: 'default' })
const { step } = useImport()
</script>

<template>
  <div>
    <StepUpload v-if="step === 'upload'" />
    <StepReview v-else-if="step === 'review'" />
    <StepProgress v-else-if="step === 'progress'" />
    <StepComplete v-else-if="step === 'complete'" />
  </div>
</template>
