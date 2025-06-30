/**
 * Theme utilities for TechFolks application
 */

export type Theme = 'light' | 'dark' | 'system'

/**
 * Apply theme to document root
 */
export const applyTheme = (theme: Theme) => {
  const root = window.document.documentElement
  
  // Remove existing theme classes
  root.classList.remove('light', 'dark')
  
  if (theme === 'system') {
    // Use system preference
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    root.classList.add(systemTheme)
  } else {
    // Use selected theme
    root.classList.add(theme)
  }
}

/**
 * Get current system theme preference
 */
export const getSystemTheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Get the actual theme being displayed (resolves 'system' to light/dark)
 */
export const getActualTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

/**
 * Initialize theme on app startup
 */
export const initializeTheme = () => {
  // Check if there's a saved theme in localStorage
  const savedTheme = localStorage.getItem('techfolks-settings')
  
  if (savedTheme) {
    try {
      const settings = JSON.parse(savedTheme)
      const theme = settings.state?.theme || 'system'
      applyTheme(theme)
    } catch (error) {
      console.warn('Failed to parse saved theme settings, using system theme')
      applyTheme('system')
    }
  } else {
    // Default to system theme
    applyTheme('system')
  }
}

/**
 * Listen for system theme changes
 */
export const setupSystemThemeListener = (callback: (theme: 'light' | 'dark') => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const handleChange = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light')
  }
  
  mediaQuery.addEventListener('change', handleChange)
  
  // Return cleanup function
  return () => {
    mediaQuery.removeEventListener('change', handleChange)
  }
}