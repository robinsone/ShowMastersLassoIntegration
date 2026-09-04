import { setLassoConfig } from '../utils/lassoApi'

const STORAGE_KEY = 'lasso_config'

export interface LassoSettings {
  apiKey: string
  baseUrl: string
  divisionId: string
}

export function getDivisionIdError(value: string): string | null {
  const divisionId = value.trim()
  if (!divisionId || /^[1-9]\d*$/.test(divisionId)) return null
  return 'Division ID must be a positive whole number, or leave it blank.'
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
    !getDivisionIdError(settings.value.divisionId)
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
        divisionId: getDivisionId(),
      })
    }
  }

  function getDivisionId(): number | null {
    const divisionId = settings.value.divisionId.trim()
    const error = getDivisionIdError(divisionId)
    if (error) throw new Error(error)
    return divisionId ? Number(divisionId) : null
  }

  // Apply on first load
  if (import.meta.client) {
    applyConfig()
  }

  return { settings, isConfigured, save, getDivisionId }
}
