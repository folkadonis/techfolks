import { useSettingsStore, type Theme } from '@store/settingsStore'

const ThemeToggle = () => {
  const { theme, setTheme } = useSettingsStore()

  const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ]

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-foreground">Theme:</span>
      <div className="flex bg-muted rounded-lg p-1">
        {themes.map((themeOption) => (
          <button
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
              theme === themeOption.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={`Switch to ${themeOption.label} theme`}
          >
            <span>{themeOption.icon}</span>
            <span className="hidden sm:inline">{themeOption.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ThemeToggle