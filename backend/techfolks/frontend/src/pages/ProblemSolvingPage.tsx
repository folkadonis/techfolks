import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { problemsAPI, contestsAPI } from '@services/api'
import toast from 'react-hot-toast'

interface TestCase {
  input: string
  output: string
  explanation?: string
}

interface Submission {
  id: number
  problem_code: string
  language: string
  code: string
  status: 'pending' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compilation_error'
  runtime?: number
  memory?: number
  created_at: string
  test_results?: {
    passed: number
    total: number
    details: {
      test_number: number
      status: string
      runtime: number
      memory: number
      expected?: string
      actual?: string
    }[]
  }
}

const ProblemSolvingPage = () => {
  const { code: problemCode, contestId } = useParams<{ code: string; contestId?: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  
  const [problem, setProblem] = useState<any>(null)
  const [contest, setContest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'statement' | 'submissions' | 'editorial'>('statement')
  
  // Code editor state
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('cpp')
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [fontSize, setFontSize] = useState(14)
  
  // Test cases
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [customInput, setCustomInput] = useState('')
  const [customOutput, setCustomOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Submissions
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  
  // Auto-save
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)

  useEffect(() => {
    if (problemCode) {
      fetchProblemData()
    }
  }, [problemCode, contestId])

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !code.trim()) return
    
    const saveTimer = setTimeout(() => {
      localStorage.setItem(`problem_${problemCode}_code`, code)
      localStorage.setItem(`problem_${problemCode}_lang`, language)
      setLastSaved(new Date())
    }, 2000)
    
    return () => clearTimeout(saveTimer)
  }, [code, language, problemCode, autoSaveEnabled])

  // Load saved code on mount
  useEffect(() => {
    const savedCode = localStorage.getItem(`problem_${problemCode}_code`)
    const savedLang = localStorage.getItem(`problem_${problemCode}_lang`)
    
    if (savedCode) {
      setCode(savedCode)
      if (savedLang) {
        setLanguage(savedLang)
      }
      setLastSaved(new Date())
    }
  }, [problemCode])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to run code
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRunCode()
      }
      // Ctrl/Cmd + S to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSubmit()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [code])

  const fetchProblemData = async () => {
    try {
      setLoading(true)
      
      // Get problem by code (slug)
      const response = await problemsAPI.getById(problemCode!)
      
      if (response.success && response.data) {
        const problemData = response.data
        setProblem({
          id: problemData.id,
          code: problemData.slug,
          title: problemData.title,
          description: problemData.statement,
          input_format: problemData.input_format,
          output_format: problemData.output_format,
          constraints: problemData.constraints,
          difficulty: problemData.difficulty,
          time_limit: problemData.time_limit,
          memory_limit: problemData.memory_limit,
          tags: problemData.tags || []
        })
        
        // Set default code template based on language
        setCode(getDefaultTemplate(language))
        
        // Mock test cases (can be replaced with API data)
        setTestCases([
          {
            input: 'Sample input',
            output: 'Sample output',
            explanation: 'Sample explanation'
          }
        ])
      } else {
        toast.error('Problem not found')
        navigate('/problems')
        return
      }
      
      // Get contest if contestId is provided
      if (contestId) {
        try {
          const contestResponse = await contestsAPI.getById(contestId)
          if (contestResponse.success && contestResponse.data) {
            setContest(contestResponse.data)
          }
        } catch (error) {
          console.error('Error fetching contest:', error)
        }
      }
      
      // Get user submissions for this problem
      try {
        const submissionsResponse = await problemsAPI.getSubmissions(problemCode!)
        if (submissionsResponse.success && submissionsResponse.data) {
          setSubmissions(submissionsResponse.data)
        }
      } catch (error) {
        console.error('Error fetching submissions:', error)
        // Set empty submissions on error
        setSubmissions([])
      }
      
    } catch (error) {
      console.error('Error fetching problem:', error)
      toast.error('Failed to load problem')
      
      // Fallback to mock data
      setProblem({
        id: 1,
        code: problemCode!,
        title: 'Sample Problem',
        description: 'This is a sample problem. The API might not be available.',
        input_format: 'Sample input format',
        output_format: 'Sample output format',
        constraints: 'Sample constraints',
        difficulty: 'easy',
        time_limit: 1000,
        memory_limit: 256,
        tags: ['sample']
      })
      
      setTestCases([
        {
          input: 'Sample input',
          output: 'Sample output',
          explanation: 'Sample explanation'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getDefaultTemplate = (lang: string) => {
    const templates: Record<string, string> = {
      cpp: `#include <iostream>
using namespace std;

int main() {
    // Your code here
    
    return 0;
}`,
      python: `# Your code here
def solve():
    pass

if __name__ == "__main__":
    solve()`,
      java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Your code here
        
        sc.close();
    }
}`,
      javascript: `// Your code here
function solve() {
    
}

solve();`
    }
    
    return templates[lang] || '// Your code here'
  }

  const handleLanguageChange = (newLang: string) => {
    if (code === getDefaultTemplate(language) || code.trim() === '') {
      setCode(getDefaultTemplate(newLang))
    }
    setLanguage(newLang)
  }

  const handleRunCode = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }
    
    setIsRunning(true)
    setCustomOutput('')
    
    try {
      // Simulate code execution
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock output
      if (customInput.includes('5')) {
        setCustomOutput('15')
      } else {
        setCustomOutput('Sample output for your input')
      }
      
      toast.success('Code executed successfully!')
    } catch (error) {
      toast.error('Failed to run code')
      setCustomOutput('Error: Runtime error')
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to submit solutions')
      navigate('/login')
      return
    }
    
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }
    
    if (!problem) {
      toast.error('Problem not loaded')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Submit to API
      const response = await problemsAPI.submit(problemCode!, {
        code: code.trim(),
        language
      })
      
      if (response.success && response.data) {
        const submissionData = response.data
        
        const newSubmission: Submission = {
          id: submissionData.id,
          problem_code: problemCode!,
          language,
          code,
          status: submissionData.verdict || 'pending',
          runtime: submissionData.time_used,
          memory: submissionData.memory_used,
          created_at: submissionData.created_at || new Date().toISOString(),
          test_results: submissionData.test_results
        }
        
        setSubmissions([newSubmission, ...submissions])
        
        if (newSubmission.status === 'accepted') {
          toast.success('Solution accepted! Great job!')
        } else if (newSubmission.status === 'wrong_answer') {
          toast.error('Wrong answer. Try again!')
        } else if (newSubmission.status === 'compilation_error') {
          toast.error('Compilation error. Check your code.')
        } else {
          toast.info('Submission received. Check results in submissions tab.')
        }
        
        setActiveTab('submissions')
      } else {
        toast.error('Failed to submit solution')
      }
    } catch (error) {
      console.error('Submission error:', error)
      toast.error('Failed to submit solution. Please try again.')
      
      // Fallback: create a mock submission for demo purposes
      const mockSubmission: Submission = {
        id: Date.now(),
        problem_code: problemCode!,
        language,
        code,
        status: 'pending',
        runtime: 0,
        memory: 0,
        created_at: new Date().toISOString(),
        test_results: {
          passed: 0,
          total: 0,
          details: []
        }
      }
      
      setSubmissions([mockSubmission, ...submissions])
      toast.info('Submission created (demo mode)')
      setActiveTab('submissions')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      accepted: 'text-green-600 dark:text-green-400',
      wrong_answer: 'text-red-600 dark:text-red-400',
      time_limit: 'text-yellow-600 dark:text-yellow-400',
      runtime_error: 'text-orange-600 dark:text-orange-400',
      compilation_error: 'text-red-600 dark:text-red-400',
      pending: 'text-gray-500 dark:text-gray-400',
      running: 'text-blue-600 dark:text-blue-400'
    }
    return colors[status] || 'text-gray-600 dark:text-gray-400'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      accepted: 'Accepted',
      wrong_answer: 'Wrong Answer',
      time_limit: 'Time Limit Exceeded',
      runtime_error: 'Runtime Error',
      compilation_error: 'Compilation Error',
      pending: 'Pending',
      running: 'Running'
    }
    return texts[status] || status
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading problem...</div>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Problem Not Found</h3>
        <p className="text-gray-500">The problem you're looking for doesn't exist.</p>
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{problem.title}</h1>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>Code: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{problem.code}</code></span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {problem.difficulty}
              </span>
              {contest && (
                <span>Contest: <Link to={`/contests/${contest.id}`} className="text-primary-600 hover:text-primary-700">{contest.title}</Link></span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline px-4 py-2"
          >
            Back
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-200px)]">
        {/* Left Panel - Problem Statement */}
        <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {['statement', 'submissions', 'editorial'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'statement' && (
              <div className="prose dark:prose-invert max-w-none">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Problem Statement</h3>
                  <p className="whitespace-pre-wrap">{problem.description}</p>
                </div>

                {problem.input_format && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Input Format</h3>
                    <p className="whitespace-pre-wrap">{problem.input_format}</p>
                  </div>
                )}

                {problem.output_format && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Output Format</h3>
                    <p className="whitespace-pre-wrap">{problem.output_format}</p>
                  </div>
                )}

                {problem.constraints && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Constraints</h3>
                    <p className="whitespace-pre-wrap">{problem.constraints}</p>
                  </div>
                )}

                {testCases.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Sample Test Cases</h3>
                    <div className="space-y-4">
                      {testCases.map((tc, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                          <div className="mb-2">
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Input</div>
                            <pre className="bg-white dark:bg-gray-800 p-2 rounded text-sm">{tc.input}</pre>
                          </div>
                          <div className="mb-2">
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Output</div>
                            <pre className="bg-white dark:bg-gray-800 p-2 rounded text-sm">{tc.output}</pre>
                          </div>
                          {tc.explanation && (
                            <div>
                              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Explanation</div>
                              <p className="text-sm">{tc.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'submissions' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Your Submissions</h3>
                {submissions.length === 0 ? (
                  <p className="text-gray-500">No submissions yet</p>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((submission) => (
                      <div key={submission.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className={`font-medium ${getStatusColor(submission.status)}`}>
                                {getStatusText(submission.status)}
                              </span>
                              <span className="text-sm text-gray-500">{submission.language}</span>
                            </div>
                            {submission.runtime && (
                              <div className="text-sm text-gray-500 mt-1">
                                Runtime: {submission.runtime}ms | Memory: {submission.memory}KB
                              </div>
                            )}
                            {submission.test_results && (
                              <div className="mt-2">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  Tests passed: {submission.test_results.passed}/{submission.test_results.total}
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      submission.test_results.passed === submission.test_results.total 
                                        ? 'bg-green-500' 
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${(submission.test_results.passed / submission.test_results.total) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <div className="text-sm text-gray-500">
                              {new Date(submission.created_at).toLocaleString()}
                            </div>
                            <button
                              onClick={() => setSelectedSubmission(submission)}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'editorial' && (
              <div className="prose dark:prose-invert max-w-none">
                <h3 className="text-lg font-semibold mb-4">Editorial</h3>
                <p className="text-gray-500">Editorial will be available after the contest ends.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-1/2 flex flex-col">
          {/* Editor Header */}
          <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="input-sm"
                >
                  <option value="cpp">C++</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript</option>
                </select>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    title="Toggle theme"
                  >
                    {theme === 'light' ? '🌙' : '☀️'}
                  </button>
                  
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="input-sm"
                    title="Font size"
                  >
                    <option value="12">12px</option>
                    <option value="14">14px</option>
                    <option value="16">16px</option>
                    <option value="18">18px</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {lastSaved && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <span>✓</span>
                    <span>Auto-saved {new Date(lastSaved).toLocaleTimeString()}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRunCode}
                    disabled={isRunning}
                    className="btn btn-outline px-3 py-1 text-sm"
                    title="Ctrl/Cmd + Enter"
                  >
                    {isRunning ? 'Running...' : 'Run Code'}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="btn btn-primary px-3 py-1 text-sm"
                    title="Ctrl/Cmd + S"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 flex flex-col">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`flex-1 p-4 font-mono resize-none focus:outline-none ${
                theme === 'dark' 
                  ? 'bg-gray-900 text-gray-100' 
                  : 'bg-white text-gray-900'
              }`}
              style={{ fontSize: `${fontSize}px` }}
              placeholder="Write your code here..."
              spellCheck={false}
            />
          </div>

          {/* Test Run Section */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Test Run</h4>
                <button
                  onClick={() => setCustomInput('')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Input</label>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="input w-full h-24 font-mono text-sm resize-none"
                    placeholder="Enter custom input..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Output</label>
                  <textarea
                    value={customOutput}
                    readOnly
                    className="input w-full h-24 font-mono text-sm resize-none bg-gray-50 dark:bg-gray-900"
                    placeholder="Output will appear here..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Details Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">Submission Details</h3>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Submission Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className={`font-medium ${getStatusColor(selectedSubmission.status)}`}>
                    {getStatusText(selectedSubmission.status)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Language</div>
                  <div className="font-medium">{selectedSubmission.language}</div>
                </div>
                {selectedSubmission.runtime && (
                  <div>
                    <div className="text-sm text-gray-500">Runtime</div>
                    <div className="font-medium">{selectedSubmission.runtime}ms</div>
                  </div>
                )}
                {selectedSubmission.memory && (
                  <div>
                    <div className="text-sm text-gray-500">Memory</div>
                    <div className="font-medium">{selectedSubmission.memory}KB</div>
                  </div>
                )}
              </div>

              {/* Test Results */}
              {selectedSubmission.test_results && (
                <div>
                  <h4 className="font-medium mb-2">Test Results</h4>
                  <div className="space-y-2">
                    {selectedSubmission.test_results.details.map((test) => (
                      <div key={test.test_number} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              test.status === 'passed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {test.status === 'passed' ? '✓' : '✗'}
                            </span>
                            <span className="font-medium">Test #{test.test_number}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{test.runtime}ms</span>
                            <span>{test.memory}KB</span>
                          </div>
                        </div>
                        {test.status === 'failed' && test.expected && test.actual && (
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Expected</div>
                              <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1">{test.expected}</pre>
                            </div>
                            <div>
                              <div className="text-gray-500">Actual</div>
                              <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1">{test.actual}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted Code */}
              <div>
                <h4 className="font-medium mb-2">Submitted Code</h4>
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-x-auto text-sm">
                  <code>{selectedSubmission.code}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProblemSolvingPage