import Editor from '@monaco-editor/react'
import { useEditorStore } from '@store/editorStore'

interface CodeEditorProps {
  height?: string
  defaultValue?: string
  readOnly?: boolean
  onChange?: (value: string | undefined) => void
}

const CodeEditor = ({ 
  height = '500px', 
  defaultValue = '', 
  readOnly = false,
  onChange 
}: CodeEditorProps) => {
  const { code, language, settings, setCode } = useEditorStore()

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
      onChange?.(value)
    }
  }

  const languageMap: Record<string, string> = {
    cpp: 'cpp',
    c: 'c',
    java: 'java',
    python: 'python',
    javascript: 'javascript',
    typescript: 'typescript',
    go: 'go',
    rust: 'rust',
    ruby: 'ruby',
    php: 'php',
    swift: 'swift',
    kotlin: 'kotlin',
    scala: 'scala',
    r: 'r',
    csharp: 'csharp',
  }

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden">
      <Editor
        height={height}
        defaultLanguage={languageMap[language] || 'cpp'}
        language={languageMap[language] || 'cpp'}
        defaultValue={defaultValue}
        value={code}
        theme={settings.theme}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: settings.minimap },
          fontSize: settings.fontSize,
          tabSize: settings.tabSize,
          wordWrap: settings.wordWrap,
          readOnly,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
        }}
      />
    </div>
  )
}

export default CodeEditor