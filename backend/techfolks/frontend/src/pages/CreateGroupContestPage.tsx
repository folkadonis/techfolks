import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useContestsStore } from '@store/contestsStore'
import { useProblemsStore } from '@store/problemsStore'
import { useGroupsStore } from '@store/groupsStore'
import { groupsAPI } from '@services/api'
import toast from 'react-hot-toast'

interface ContestFormData {
  title: string
  description: string
  start_time: string
  end_time: string
  type: 'ACM-ICPC' | 'IOI' | 'AtCoder' | 'Codeforces'
  max_participants: number
  registration_deadline: string
  rules: string
  problem_codes: string[]
}

const CreateGroupContestPage = () => {
  const { id: groupId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addContest } = useContestsStore()
  const { problems: storedProblems } = useProblemsStore()
  const { getGroup } = useGroupsStore()
  
  const group = groupId ? getGroup(parseInt(groupId)) : null
  
  // Mock problems with the stored ones
  const mockProblems = [
    { id: 1, code: 'P-ABC123', title: 'Two Sum', difficulty: 'easy' },
    { id: 2, code: 'P-DEF456', title: 'Longest Substring', difficulty: 'medium' },
    { id: 3, code: 'P-GHI789', title: 'Binary Tree Path', difficulty: 'hard' }
  ]
  const problems = [...mockProblems, ...storedProblems]

  const [formData, setFormData] = useState<ContestFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    type: 'ACM-ICPC',
    max_participants: 100,
    registration_deadline: '',
    rules: '',
    problem_codes: []
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedProblemCode, setSelectedProblemCode] = useState('')

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required'
    }

    if (!formData.end_time) {
      newErrors.end_time = 'End time is required'
    }

    if (formData.start_time && formData.end_time) {
      const startDate = new Date(formData.start_time)
      const endDate = new Date(formData.end_time)
      
      if (startDate >= endDate) {
        newErrors.end_time = 'End time must be after start time'
      }
    }

    if (!formData.registration_deadline) {
      newErrors.registration_deadline = 'Registration deadline is required'
    }

    if (formData.problem_codes.length === 0) {
      newErrors.problems = 'At least one problem is required'
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
      // Calculate duration in minutes
      const startDate = new Date(formData.start_time)
      const endDate = new Date(formData.end_time)
      const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60))
      
      // Create contest data for backend
      const contestData = {
        title: formData.title,
        description: formData.description,
        contest_type: formData.type.replace('-', '_').toUpperCase(), // Convert ACM-ICPC to ACM_ICPC
        start_time: formData.start_time,
        end_time: formData.end_time,
        registration_open: true,
        problem_ids: [] // TODO: Add problem selection
      }
      
      // Call backend API to create contest
      const response = await groupsAPI.createContest(groupId!, contestData)
      
      // Also add to local store for immediate UI update
      const newContest = {
        ...response.data,
        duration,
        status: 'upcoming' as const,
        problems: formData.problem_codes,
        participants: 0,
        group_id: parseInt(groupId!),
        group_name: group?.name
      }
      
      addContest(newContest)
      
      toast.success('Contest created successfully!')
      navigate(`/groups/${groupId}/contests`)
    } catch (error: any) {
      console.error('Error creating contest:', error)
      toast.error('Failed to create contest')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ContestFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatDateTimeLocal = (date: Date) => {
    const offset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - offset * 60000)
    return localDate.toISOString().slice(0, 16)
  }

  const getMinDateTime = () => {
    return formatDateTimeLocal(new Date())
  }

  if (!group || (!group.is_owner && !group.is_manager)) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h3>
        <p className="text-gray-500">Only group owners and managers can create contests.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Group Contest</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new contest for <span className="font-semibold">{group.name}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Contest Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Contest Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`input w-full ${errors.title ? 'border-red-500' : ''}`}
                placeholder="e.g., Weekly Practice Contest #1"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`input w-full h-24 resize-none ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Describe the contest..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Contest Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="input w-full"
                >
                  <option value="ACM-ICPC">ACM-ICPC</option>
                  <option value="IOI">IOI</option>
                  <option value="AtCoder">AtCoder</option>
                  <option value="Codeforces">Codeforces</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Participants *
                </label>
                <input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => handleInputChange('max_participants', parseInt(e.target.value))}
                  className="input w-full"
                  min="1"
                  max="1000"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Schedule</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Registration Deadline *
              </label>
              <input
                type="datetime-local"
                value={formData.registration_deadline}
                onChange={(e) => handleInputChange('registration_deadline', e.target.value)}
                className={`input w-full ${errors.registration_deadline ? 'border-red-500' : ''}`}
                min={getMinDateTime()}
              />
              {errors.registration_deadline && (
                <p className="text-red-500 text-sm mt-1">{errors.registration_deadline}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Start Time *
              </label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => handleInputChange('start_time', e.target.value)}
                className={`input w-full ${errors.start_time ? 'border-red-500' : ''}`}
                min={getMinDateTime()}
              />
              {errors.start_time && (
                <p className="text-red-500 text-sm mt-1">{errors.start_time}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                End Time *
              </label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => handleInputChange('end_time', e.target.value)}
                className={`input w-full ${errors.end_time ? 'border-red-500' : ''}`}
                min={formData.start_time || getMinDateTime()}
              />
              {errors.end_time && (
                <p className="text-red-500 text-sm mt-1">{errors.end_time}</p>
              )}
            </div>
          </div>
        </div>

        {/* Problem Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Contest Problems</h2>
          
          {errors.problems && (
            <p className="text-red-500 text-sm mb-4">{errors.problems}</p>
          )}
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <select
                value={selectedProblemCode}
                onChange={(e) => setSelectedProblemCode(e.target.value)}
                className="input flex-1"
              >
                <option value="">Select a problem to add...</option>
                {problems
                  .filter(p => !formData.problem_codes.includes(p.code))
                  .map((problem) => (
                    <option key={problem.code} value={problem.code}>
                      {problem.code} - {problem.title} ({problem.difficulty})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (selectedProblemCode) {
                    handleInputChange('problem_codes', [...formData.problem_codes, selectedProblemCode])
                    setSelectedProblemCode('')
                  }
                }}
                disabled={!selectedProblemCode}
                className="btn btn-primary px-4 py-2"
              >
                Add Problem
              </button>
            </div>

            {formData.problem_codes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Selected Problems ({formData.problem_codes.length})</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                  {formData.problem_codes.map((code) => {
                    const problem = problems.find(p => p.code === code)
                    return (
                      <div key={code} className="flex items-center justify-between p-3">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {code}
                          </span>
                          <span className="text-sm">
                            {problem?.title || 'Unknown Problem'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange('problem_codes', formData.problem_codes.filter(c => c !== code))
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/groups/${groupId}/contests`)}
            className="btn btn-outline px-6 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary px-6 py-2"
          >
            {loading ? 'Creating...' : 'Create Contest'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateGroupContestPage