<script setup lang="ts">
const colorMode = useColorMode()

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

// PWA install prompt
const { $pwa } = useNuxtApp()
const canInstall = computed(() => $pwa?.showInstallPrompt ?? false)

async function installApp() {
  await $pwa?.install()
}

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
            <UButton
              icon="i-lucide-download"
              color="primary"
              variant="soft"
              size="sm"
              aria-label="Install app"
              @click="installApp"
            />
          </UTooltip>
          <UTooltip text="Lasso credentials">
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

    <!-- Page content fills remaining height -->
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
  </div>
</template>

