import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { problemsAPI } from '@services/api'
import { useAuthStore } from '@store/authStore'
import toast from 'react-hot-toast'

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
  sample_input: string
  sample_output: string
  explanation: string
  tags: string
}

const EditProblemPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
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
    sample_input: '',
    sample_output: '',
    explanation: '',
    tags: ''
  })

  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (id) {
      fetchProblem()
    }
  }, [id])

  const fetchProblem = async () => {
    try {
      setFetchLoading(true)
      const response = await problemsAPI.getById(id!)
      const problem = response.data
      
      setFormData({
        title: problem.title || '',
        statement: problem.statement || '',
        input_format: problem.input_format || '',
        output_format: problem.output_format || '',
        constraints: problem.constraints || '',
        difficulty: problem.difficulty || 'easy',
        time_limit: problem.time_limit || 1000,
        memory_limit: problem.memory_limit || 256,
        is_public: problem.is_public ?? true,
        sample_input: problem.sample_input || '',
        sample_output: problem.sample_output || '',
        explanation: problem.explanation || '',
        tags: problem.tags || ''
      })
    } catch (error: any) {
      console.error('Error fetching problem:', error)
      toast.error('Failed to load problem')
      navigate('/problems')
    } finally {
      setFetchLoading(false)
    }
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
      await problemsAPI.update(id!, formData)
      toast.success('Problem updated successfully!')
      navigate(`/problems/${id}`)
    } catch (error: any) {
      console.error('Error updating problem:', error)
      toast.error(error.response?.data?.message || 'Failed to update problem')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this problem? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await problemsAPI.delete(id!)
      toast.success('Problem deleted successfully!')
      navigate('/problems')
    } catch (error: any) {
      console.error('Error deleting problem:', error)
      toast.error(error.response?.data?.message || 'Failed to delete problem')
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
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h3>
        <p className="text-gray-500">Only administrators can edit problems.</p>
      </div>
    )
  }

  if (fetchLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading problem...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Problem</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Modify the competitive programming problem details.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => handleInputChange('is_public', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="is_public" className="text-sm">
                Make this problem public
              </label>
            </div>
          </div>
        </div>

        {/* Problem Statement */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
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
                <p className="text-red-500 text-sm mt-1">{errors.statement}</p>
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
                <p className="text-red-500 text-sm mt-1">{errors.constraints}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sample Input/Output */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sample Test Case</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Sample Input
              </label>
              <textarea
                value={formData.sample_input}
                onChange={(e) => handleInputChange('sample_input', e.target.value)}
                className="input w-full h-24 resize-none font-mono"
                placeholder="3&#10;1 2 3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Sample Output
              </label>
              <textarea
                value={formData.sample_output}
                onChange={(e) => handleInputChange('sample_output', e.target.value)}
                className="input w-full h-24 resize-none font-mono"
                placeholder="6"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Explanation
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => handleInputChange('explanation', e.target.value)}
                className="input w-full h-24 resize-none"
                placeholder="Explain the sample test case..."
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="btn bg-red-600 hover:bg-red-700 text-white px-6 py-2"
          >
            {loading ? 'Deleting...' : 'Delete Problem'}
          </button>
          
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/problems/${id}`)}
              className="btn btn-outline px-6 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-6 py-2"
            >
              {loading ? 'Updating...' : 'Update Problem'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default EditProblemPage