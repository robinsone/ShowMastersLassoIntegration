<script setup lang="ts">
const colorMode = useColorMode()
const installPromptDismissed = ref(false)
const INSTALL_PROMPT_DISMISSED_KEY = 'pwa_install_prompt_dismissed'
const isOnline = ref(true)
const isInstalled = ref(false)
const showInstallInstructions = ref(false)

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const { $pwa } = useNuxtApp()
const canInstall = computed(() => $pwa?.showInstallPrompt ?? false)
const shouldShowInstallPrompt = computed(() =>
  canInstall.value && !installPromptDismissed.value && !isInstalled.value,
)

async function installApp() {
  if (!canInstall.value) {
    showInstallInstructions.value = true
    return
  }

  await $pwa?.install()
}

function handleInstallAction() {
  void installApp()
}

function dismissInstallPrompt() {
  installPromptDismissed.value = true
  if (import.meta.client) {
    window.localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, '1')
  }
}

function updateOnlineStatus() {
  isOnline.value = navigator.onLine
}

function updateInstalledStatus() {
  isInstalled.value = window.matchMedia('(display-mode: standalone)').matches
}

function handleAppInstalled() {
  isInstalled.value = true
  dismissInstallPrompt()
}

onMounted(() => {
  installPromptDismissed.value = window.localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === '1'
  updateOnlineStatus()
  updateInstalledStatus()

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  window.addEventListener('appinstalled', handleAppInstalled, { once: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
  window.removeEventListener('appinstalled', handleAppInstalled)
})

const showConfig = useState('show_config', () => false)
const showGuide = ref(false)

function openConnectionSettings() {
  showGuide.value = false
  showConfig.value = true
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-background text-default">
    <template v-if="isOnline">
      <header class="sticky top-0 z-50 shrink-0 h-14 border-b border-default bg-background/90 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
          <div class="flex items-center gap-2 min-w-0">
            <UIcon name="i-lucide-zap" class="size-5 text-primary shrink-0" />
            <span class="font-semibold text-highlighted truncate text-sm sm:text-base">
              ShowMasters <span class="text-muted font-normal">→</span> Lasso
            </span>
          </div>
          <div class="flex items-center gap-1">
            <UTooltip
              v-if="!isInstalled"
              :text="canInstall ? 'Install app' : 'How to install the app'"
            >
              <UButton
                label="Install app"
                icon="i-lucide-download"
                color="primary"
                variant="soft"
                size="sm"
                @click="handleInstallAction"
              />
            </UTooltip>
            <UButton
              label="Help"
              icon="i-lucide-circle-help"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Open help"
              @click="showGuide = true"
            />
            <UTooltip v-if="!showConfig" text="Lasso credentials">
              <UButton
                icon="i-lucide-settings"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Configure credentials"
                @click="showConfig = true"
              />
            </UTooltip>
            <UButton
              :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
              :label="colorMode.value === 'dark' ? 'Light' : 'Dark'"
              color="neutral"
              variant="outline"
              size="sm"
              :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="toggleColorMode"
            />
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
            <UButton label="Install" icon="i-lucide-download" color="primary" size="sm" @click="handleInstallAction" />
            <UButton label="Not now" color="neutral" variant="ghost" size="sm" @click="dismissInstallPrompt" />
          </div>
        </div>
      </div>

      <main class="flex-1 flex flex-col">
        <slot />
      </main>

      <PwaInstallInstructions v-model:open="showInstallInstructions" />
      <UserGuide
        v-model:open="showGuide"
        @open-settings="openConnectionSettings"
      />
    </template>

    <main v-else class="flex flex-1 items-center justify-center p-8">
      <UCard class="w-full max-w-lg">
        <div class="space-y-3 text-center">
          <UIcon name="i-lucide-wifi-off" class="mx-auto size-8 text-primary" />
          <h1 class="text-xl font-semibold text-highlighted">Connection required</h1>
          <p class="text-sm leading-6 text-muted">
            ShowMasters → Lasso requires an internet connection to access Lasso. Reconnect to continue.
          </p>
        </div>
      </UCard>
    </main>
  </div>
</template>
