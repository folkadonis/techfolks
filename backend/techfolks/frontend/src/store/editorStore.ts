import { create } from 'zustand'

interface EditorSettings {
  theme: 'vs-dark' | 'vs-light' | 'hc-black'
  fontSize: number
  tabSize: number
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded'
  minimap: boolean
  autoSave: boolean
  autoSaveDelay: number
}

interface EditorState {
  code: string
  language: string
  settings: EditorSettings
  isExecuting: boolean
  output: string | null
  error: string | null
  setCode: (code: string) => void
  setLanguage: (language: string) => void
  updateSettings: (settings: Partial<EditorSettings>) => void
  setExecuting: (executing: boolean) => void
  setOutput: (output: string | null) => void
  setError: (error: string | null) => void
  resetEditor: () => void
}

const defaultSettings: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  tabSize: 4,
  wordWrap: 'on',
  minimap: true,
  autoSave: true,
  autoSaveDelay: 2000,
}

export const useEditorStore = create<EditorState>((set) => ({
  code: '',
  language: 'cpp',
  settings: defaultSettings,
  isExecuting: false,
  output: null,
  error: null,
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
  setExecuting: (executing) => set({ isExecuting: executing }),
  setOutput: (output) => set({ output, error: null }),
  setError: (error) => set({ error, output: null }),
  resetEditor: () =>
    set({
      code: '',
      language: 'cpp',
      output: null,
      error: null,
      isExecuting: false,
    }),
}))