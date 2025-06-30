import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyTheme, getActualTheme, setupSystemThemeListener } from '@utils/theme'

export type Theme = 'light' | 'dark' | 'system'

interface SettingsState {
  theme: Theme
  fontSize: 'small' | 'medium' | 'large'
  codeEditorTheme: 'vs-light' | 'vs-dark' | 'github-light' | 'github-dark'
  autoSave: boolean
  notifications: boolean
  soundEffects: boolean
  compactMode: boolean
  setTheme: (theme: Theme) => void
  setFontSize: (fontSize: 'small' | 'medium' | 'large') => void
  setCodeEditorTheme: (theme: 'vs-light' | 'vs-dark' | 'github-light' | 'github-dark') => void
  setAutoSave: (enabled: boolean) => void
  setNotifications: (enabled: boolean) => void
  setSoundEffects: (enabled: boolean) => void
  setCompactMode: (enabled: boolean) => void
  resetToDefaults: () => void
}

const defaultSettings = {
  theme: 'system' as Theme,
  fontSize: 'medium' as const,
  codeEditorTheme: 'vs-light' as const,
  autoSave: true,
  notifications: true,
  soundEffects: false,
  compactMode: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      
      setTheme: (theme: Theme) => {
        set({ theme })
        applyTheme(theme)
      },
      
      setFontSize: (fontSize) => set({ fontSize }),
      
      setCodeEditorTheme: (codeEditorTheme) => set({ codeEditorTheme }),
      
      setAutoSave: (autoSave) => set({ autoSave }),
      
      setNotifications: (notifications) => set({ notifications }),
      
      setSoundEffects: (soundEffects) => set({ soundEffects }),
      
      setCompactMode: (compactMode) => set({ compactMode }),
      
      resetToDefaults: () => {
        set(defaultSettings)
        applyTheme(defaultSettings.theme)
      },
    }),
    {
      name: 'techfolks-settings',
      onRehydrate: (state) => {
        if (state) {
          applyTheme(state.theme)
        }
      },
    }
  )
)

// Initialize theme on load and listen for system changes
if (typeof window !== 'undefined') {
  // Listen for system theme changes when using system theme
  setupSystemThemeListener(() => {
    const currentTheme = useSettingsStore.getState().theme
    if (currentTheme === 'system') {
      applyTheme('system')
    }
  })
}

// Export a hook to get theme info
export const useTheme = () => {
  const theme = useSettingsStore((state) => state.theme)
  
  const actualTheme = getActualTheme(theme)
  
  return {
    theme,
    actualTheme,
    isDark: actualTheme === 'dark',
    isLight: actualTheme === 'light',
  }
}