import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useProblemsStore } from '@store/problemsStore'
import toast from 'react-hot-toast'

interface TestCase {
  id: string
  input: string
  expected_output: string
  is_sample: boolean
  points: number
}

interface ProblemFormData {
  title: string
  statement: string
  input_format: string
  output_format: string
  constraints: string
  difficulty: 'easy' | 'medium' | 'hard'
  time_limit: number
  memory_limit: number
  is_public: boolean
  tags: string
  test_cases: TestCase[]
}

const CreateProblemPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addProblem, generateUniqueCode } = useProblemsStore()
  const isAdmin = user?.role === 'admin'

  const [formData, setFormData] = useState<ProblemFormData>({
    title: '',
    statement: '',
    input_format: '',
    output_format: '',
    constraints: '',
    difficulty: 'easy',
    time_limit: 1000,
    memory_limit: 256,
    is_public: true,
    tags: '',
    test_cases: [
      {
        id: '1',
        input: '',
        expected_output: '',
        is_sample: true,
        points: 0
      }
    ]
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Test case management functions
  const addTestCase = () => {
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      input: '',
      expected_output: '',
      is_sample: false,
      points: 10
    }
    setFormData(prev => ({
      ...prev,
      test_cases: [...prev.test_cases, newTestCase]
    }))
  }

  const removeTestCase = (id: string) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.filter(tc => tc.id !== id)
    }))
  }

  const updateTestCase = (id: string, field: keyof TestCase, value: any) => {
    setFormData(prev => ({
      ...prev,
      test_cases: prev.test_cases.map(tc => 
        tc.id === id ? { ...tc, [field]: value } : tc
      )
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters'
    }

    if (!formData.statement.trim()) {
      newErrors.statement = 'Problem statement is required'
    } else if (formData.statement.length < 10) {
      newErrors.statement = 'Problem statement must be at least 10 characters'
    }

    if (!formData.constraints.trim()) {
      newErrors.constraints = 'Constraints are required'
    }

    if (formData.time_limit < 100 || formData.time_limit > 10000) {
      newErrors.time_limit = 'Time limit must be between 100ms and 10000ms'
    }

    if (formData.memory_limit < 16 || formData.memory_limit > 1024) {
      newErrors.memory_limit = 'Memory limit must be between 16MB and 1024MB'
    }

    // Validate test cases
    if (formData.test_cases.length === 0) {
      newErrors.test_cases = 'At least one test case is required'
    } else {
      const emptyCases = formData.test_cases.filter(tc => !tc.input.trim() || !tc.expected_output.trim())
      if (emptyCases.length > 0) {
        newErrors.test_cases = 'All test cases must have input and expected output'
      }

      const sampleCases = formData.test_cases.filter(tc => tc.is_sample)
      if (sampleCases.length === 0) {
        newErrors.test_cases = 'At least one sample test case is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors')
      return
    }

    setLoading(true)
    try {
      // Generate unique problem code
      const problemCode = generateUniqueCode()
      
      // Create new problem with author automatically set
      const newProblem = {
        id: Date.now(),
        code: problemCode,
        title: formData.title,
        statement: formData.statement,
        input_format: formData.input_format,
        output_format: formData.output_format,
        constraints: formData.constraints,
        difficulty: formData.difficulty,
        time_limit: formData.time_limit,
        memory_limit: formData.memory_limit,
        is_public: formData.is_public,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        test_cases: formData.test_cases,
        author: {
          id: user?.id || 'unknown',
          username: user?.username || 'Unknown',
          email: user?.email || ''
        },
        created_by: user?.username || 'Unknown',
        created_at: new Date().toISOString(),
        solved_count: 0,
        attempted_count: 0
      }
      
      // Add to store
      addProblem(newProblem)
      
      toast.success(`Problem created successfully! Code: ${problemCode}`)
      navigate(`/problems/${newProblem.id}`)
    } catch (error: any) {
      console.error('Error creating problem:', error)
      toast.error('Failed to create problem')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProblemFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-foreground mb-2">Access Denied</h3>
        <p className="text-muted-foreground">Only administrators can create problems.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Problem</h1>
        <p className="text-muted-foreground mt-2">
          Create a new competitive programming problem for users to solve.
        </p>
        {user && (
          <div className="mt-3 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Author:</strong> {user.username} ({user.email})
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-card text-card-foreground rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Problem Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`input w-full ${errors.title ? 'border-red-500' : ''}`}
                placeholder="e.g., Two Sum"
              />
              {errors.title && (
                <p className="text-destructive text-sm mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Difficulty *
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                className="input w-full"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                className="input w-full"
                placeholder="array, hash-table, math (comma-separated)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Time Limit (ms) *
              </label>
              <input
                type="number"
                value={formData.time_limit}
                onChange={(e) => handleInputChange('time_limit', parseInt(e.target.value))}
                className={`input w-full ${errors.time_limit ? 'border-red-500' : ''}`}
                min="100"
                max="10000"
              />
              {errors.time_limit && (
                <p className="text-red-500 text-sm mt-1">{errors.time_limit}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Memory Limit (MB) *
              </label>
              <input
                type="number"
                value={formData.memory_limit}
                onChange={(e) => handleInputChange('memory_limit', parseInt(e.target.value))}
                className={`input w-full ${errors.memory_limit ? 'border-red-500' : ''}`}
                min="16"
                max="1024"
              />
              {errors.memory_limit && (
                <p className="text-red-500 text-sm mt-1">{errors.memory_limit}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Problem Visibility *
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    checked={formData.is_public}
                    onChange={() => handleInputChange('is_public', true)}
                    className="text-primary-600"
                  />
                  <div>
                    <span className="text-sm font-medium">Public</span>
                    <p className="text-xs text-gray-500">Anyone can view and solve this problem</p>
                  </div>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    checked={!formData.is_public}
                    onChange={() => handleInputChange('is_public', false)}
                    className="text-primary-600"
                  />
                  <div>
                    <span className="text-sm font-medium">Private</span>
                    <p className="text-xs text-gray-500">Only accessible through contests or direct links</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="bg-card text-card-foreground rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Problem Statement</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Problem Description *
              </label>
              <textarea
                value={formData.statement}
                onChange={(e) => handleInputChange('statement', e.target.value)}
                className={`input w-full h-32 resize-none ${errors.statement ? 'border-red-500' : ''}`}
                placeholder="Describe the problem clearly with examples..."
              />
              {errors.statement && (
                <p className="text-destructive text-sm mt-1">{errors.statement}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Input Format
                </label>
                <textarea
                  value={formData.input_format}
                  onChange={(e) => handleInputChange('input_format', e.target.value)}
                  className="input w-full h-24 resize-none"
                  placeholder="Describe the input format..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Output Format
                </label>
                <textarea
                  value={formData.output_format}
                  onChange={(e) => handleInputChange('output_format', e.target.value)}
                  className="input w-full h-24 resize-none"
                  placeholder="Describe the expected output format..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Constraints *
              </label>
              <textarea
                value={formData.constraints}
                onChange={(e) => handleInputChange('constraints', e.target.value)}
                className={`input w-full h-24 resize-none ${errors.constraints ? 'border-red-500' : ''}`}
                placeholder="e.g., 1 ≤ n ≤ 10^5, -10^9 ≤ arr[i] ≤ 10^9"
              />
              {errors.constraints && (
                <p className="text-destructive text-sm mt-1">{errors.constraints}</p>
              )}
            </div>
          </div>
        </div>

        {/* Test Cases */}
        <div className="bg-card text-card-foreground rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Test Cases</h2>
            <button
              type="button"
              onClick={addTestCase}
              className="btn btn-outline px-4 py-2 text-sm"
            >
              + Add Test Case
            </button>
          </div>

          {errors.test_cases && (
            <p className="text-destructive text-sm mb-4">{errors.test_cases}</p>
          )}
          
          <div className="space-y-6">
            {formData.test_cases.map((testCase, index) => (
              <div key={testCase.id} className="border border-border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">
                    Test Case {index + 1}
                    {testCase.is_sample && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded">
                        Sample
                      </span>
                    )}
                  </h3>
                  {formData.test_cases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestCase(testCase.id)}
                      className="text-destructive hover:text-destructive/80 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Input *
                    </label>
                    <textarea
                      value={testCase.input}
                      onChange={(e) => updateTestCase(testCase.id, 'input', e.target.value)}
                      className="input w-full h-32 resize-none font-mono text-sm"
                      placeholder="Enter test input..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Expected Output *
                    </label>
                    <textarea
                      value={testCase.expected_output}
                      onChange={(e) => updateTestCase(testCase.id, 'expected_output', e.target.value)}
                      className="input w-full h-32 resize-none font-mono text-sm"
                      placeholder="Enter expected output..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={testCase.is_sample}
                        onChange={(e) => updateTestCase(testCase.id, 'is_sample', e.target.checked)}
                        className="rounded border-border"
                      />
                      <span className="text-sm">Sample Test Case</span>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sample test cases are visible to users
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Points
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={testCase.points}
                      onChange={(e) => updateTestCase(testCase.id, 'points', parseInt(e.target.value) || 0)}
                      className="input w-full"
                      placeholder="10"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> At least one test case must be marked as "Sample" to be visible to users. 
              Non-sample test cases will be used for final evaluation.
            </p>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/problems')}
            className="btn btn-outline px-6 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary px-6 py-2"
          >
            {loading ? 'Creating...' : 'Create Problem'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateProblemPage