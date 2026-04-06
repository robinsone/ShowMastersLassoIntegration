import { setLassoConfig } from '../utils/lassoApi'

const STORAGE_KEY = 'lasso_config'

export interface LassoSettings {
  apiKey: string
  baseUrl: string
  divisionId: string
}

const defaultSettings: LassoSettings = {
  apiKey: '',
  baseUrl: 'https://test1.lasso.io/api/v1',
  divisionId: '',
}

export const useConfig = () => {
  const settings = useState<LassoSettings>('lasso_settings', () => {
    if (import.meta.client) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) return JSON.parse(stored) as LassoSettings
      } catch { }
    }
    return { ...defaultSettings }
  })

  const isConfigured = computed(() =>
    !!settings.value.apiKey.trim() &&
    !!settings.value.baseUrl.trim() &&
    !!settings.value.divisionId.trim()
  )

  function save(newSettings: LassoSettings) {
    settings.value = { ...newSettings }
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
    }
    applyConfig()
  }

  function applyConfig() {
    if (isConfigured.value) {
      setLassoConfig({
        apiKey: settings.value.apiKey.trim(),
        baseUrl: settings.value.baseUrl.trim(),
        divisionId: parseInt(settings.value.divisionId.trim(), 10),
      })
    }
  }

  function getDivisionId(): number {
    return parseInt(settings.value.divisionId.trim(), 10)
  }

  // Apply on first load
  if (import.meta.client) {
    applyConfig()
  }

  return { settings, isConfigured, save, getDivisionId }
}
