import { useSettingsStore } from '@store/settingsStore'
import ThemeToggle from '@components/settings/ThemeToggle'
import { useAuthStore } from '@store/authStore'

const SettingsPage = () => {
  const { user } = useAuthStore()
  const {
    fontSize,
    codeEditorTheme,
    autoSave,
    notifications,
    soundEffects,
    compactMode,
    setFontSize,
    setCodeEditorTheme,
    setAutoSave,
    setNotifications,
    setSoundEffects,
    setCompactMode,
    resetToDefaults,
  } = useSettingsStore()

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      resetToDefaults()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Customize your TechFolks experience and preferences.
        </p>
      </div>

      <div className="space-y-8">
        {/* Appearance Section */}
        <div className="bg-card text-card-foreground rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <span className="mr-2">🎨</span>
            Appearance
          </h2>
          
          <div className="space-y-6">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Theme</h3>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred color theme
                </p>
              </div>
              <ThemeToggle />
            </div>

            {/* Font Size */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Font Size</h3>
                <p className="text-sm text-muted-foreground">
                  Adjust text size throughout the application
                </p>
              </div>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as any)}
                className="input w-32"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            {/* Compact Mode */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Compact Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Reduce padding and spacing for more content density
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={compactMode}
                  onChange={(e) => setCompactMode(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  compactMode ? 'bg-primary' : 'bg-muted'
                }`}>
                  <div className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    compactMode ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Code Editor Section */}
        <div className="bg-card text-card-foreground rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <span className="mr-2">⌨️</span>
            Code Editor
          </h2>
          
          <div className="space-y-6">
            {/* Editor Theme */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Editor Theme</h3>
                <p className="text-sm text-muted-foreground">
                  Choose the code editor appearance
                </p>
              </div>
              <select
                value={codeEditorTheme}
                onChange={(e) => setCodeEditorTheme(e.target.value as any)}
                className="input w-40"
              >
                <option value="vs-light">VS Light</option>
                <option value="vs-dark">VS Dark</option>
                <option value="github-light">GitHub Light</option>
                <option value="github-dark">GitHub Dark</option>
              </select>
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Auto Save</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically save your code while typing
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSave ? 'bg-primary' : 'bg-muted'
                }`}>
                  <div className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    autoSave ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-card text-card-foreground rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <span className="mr-2">🔔</span>
            Notifications
          </h2>
          
          <div className="space-y-6">
            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Browser Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for contests, submissions, and updates
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications ? 'bg-primary' : 'bg-muted'
                }`}>
                  <div className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    notifications ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>
            </div>

            {/* Sound Effects */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-foreground">Sound Effects</h3>
                <p className="text-sm text-muted-foreground">
                  Play sounds for successful submissions and achievements
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEffects}
                  onChange={(e) => setSoundEffects(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  soundEffects ? 'bg-primary' : 'bg-muted'
                }`}>
                  <div className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    soundEffects ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Account Section */}
        {user && (
          <div className="bg-card text-card-foreground rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <span className="mr-2">👤</span>
              Account
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Username
                  </label>
                  <div className="input bg-muted text-muted-foreground cursor-not-allowed">
                    {user.username}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Email
                  </label>
                  <div className="input bg-muted text-muted-foreground cursor-not-allowed">
                    {user.email}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Rating
                  </label>
                  <div className="input bg-muted text-muted-foreground cursor-not-allowed">
                    {user.rating || 1200}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Role
                  </label>
                  <div className="input bg-muted text-muted-foreground cursor-not-allowed">
                    {user.role}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Section */}
        <div className="bg-card text-card-foreground rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            <span className="mr-2">🔄</span>
            Reset Settings
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-foreground">Reset to Defaults</h3>
              <p className="text-sm text-muted-foreground">
                Restore all settings to their default values
              </p>
            </div>
            <button
              onClick={handleReset}
              className="btn btn-outline text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground px-4 py-2"
            >
              Reset Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage