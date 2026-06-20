<script setup lang="ts">
const colorMode = useColorMode()
const installPromptDismissed = ref(false)
const INSTALL_PROMPT_DISMISSED_KEY = 'pwa_install_prompt_dismissed'

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// PWA install prompt
const { $pwa } = useNuxtApp()
const canInstall = computed(() => $pwa?.showInstallPrompt ?? false)
const shouldShowInstallPrompt = computed(() => canInstall.value && !installPromptDismissed.value)

async function installApp() {
  await $pwa?.install()
}

function dismissInstallPrompt() {
  installPromptDismissed.value = true
  if (import.meta.client) {
    window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, '1')
  }
}

onMounted(() => {
  if (!import.meta.client) return

  installPromptDismissed.value = window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === '1'

  window.addEventListener('appinstalled', dismissInstallPrompt, { once: true })
})

const showConfig = useState('show_config', () => false)
</script>

<template>
  <div class="flex flex-col min-h-screen bg-background text-default">
    <!-- Sticky header -->
    <header class="sticky top-0 z-50 shrink-0 h-14 border-b border-default bg-background/90 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        <!-- Logo -->
        <div class="flex items-center gap-2 min-w-0">
          <UIcon name="i-lucide-zap" class="size-5 text-primary shrink-0" />
          <span class="font-semibold text-highlighted truncate text-sm sm:text-base">
            ShowMasters <span class="text-muted font-normal">→</span> Lasso
          </span>
        </div>
        <!-- Actions -->
        <div class="flex items-center gap-1">
          <!-- Install app button — only visible when browser supports PWA install -->
          <UTooltip v-if="canInstall" text="Install app">
            <UButton icon="i-lucide-download" color="primary" variant="soft" size="sm" aria-label="Install app"
              @click="installApp" />
          </UTooltip>
          <UTooltip text="Lasso credentials">
            <UButton icon="i-lucide-settings" color="neutral" variant="ghost" size="sm"
              aria-label="Configure credentials" @click="showConfig = true" />
          </UTooltip>
          <UButton :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
            :label="colorMode.value === 'dark' ? 'Light' : 'Dark'" color="neutral" variant="outline" size="sm"
            :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleColorMode" />
        </div>
      </div>
    </header>

    <div v-if="shouldShowInstallPrompt" class="border-b border-default bg-elevated/70 px-4 sm:px-6 py-3">
      <div class="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <p class="text-sm font-semibold text-highlighted">Install the app</p>
          <p class="text-sm text-muted">
            Add ShowMasters → Lasso to your device for faster access and a more app-like experience.
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UButton label="Install" icon="i-lucide-download" color="primary" size="sm" @click="installApp" />
          <UButton label="Not now" color="neutral" variant="ghost" size="sm" @click="dismissInstallPrompt" />
        </div>
      </div>
    </div>

    <!-- Page content fills remaining height -->
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
  </div>
</template>
