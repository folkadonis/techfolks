import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useContestsStore } from '@store/contestsStore'
import { useProblemsStore } from '@store/problemsStore'
import { useGroupsStore } from '@store/groupsStore'
import toast from 'react-hot-toast'

interface ContestFormData {
  title: string
  description: string
  start_time: string
  end_time: string
  type: 'ACM-ICPC' | 'IOI' | 'AtCoder' | 'Codeforces'
  max_participants: number
  is_public: boolean
  registration_deadline: string
  rules: string
  group_ids: number[]
  problem_codes: string[]
}

const CreateContestPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addContest } = useContestsStore()
  const { problems: storedProblems } = useProblemsStore()
  const { groups } = useGroupsStore()
  const isAdmin = user?.role === 'admin'
  
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
    is_public: true,
    registration_deadline: '',
    rules: '',
    group_ids: [],
    problem_codes: []
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedProblemCode, setSelectedProblemCode] = useState('')
  
  // Get user's groups (where they are owner or manager)
  const userGroups = groups.filter(g => g.is_owner || g.is_manager)

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
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

      if (startDate < new Date()) {
        newErrors.start_time = 'Start time must be in the future'
      }
    }

    if (!formData.registration_deadline) {
      newErrors.registration_deadline = 'Registration deadline is required'
    } else if (formData.start_time) {
      const regDeadline = new Date(formData.registration_deadline)
      const startDate = new Date(formData.start_time)
      
      if (regDeadline >= startDate) {
        newErrors.registration_deadline = 'Registration deadline must be before start time'
      }
    }

    if (formData.max_participants < 1 || formData.max_participants > 10000) {
      newErrors.max_participants = 'Max participants must be between 1 and 10000'
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
      
      // Create new contest
      const newContest = {
        id: Date.now(),
        title: formData.title,
        description: formData.description,
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration,
        status: 'upcoming' as const,
        problems: formData.problem_codes,
        participants: 0,
        created_by: user?.username || 'admin',
        created_at: new Date().toISOString(),
        is_public: formData.is_public,
        group_ids: formData.group_ids,
        type: formData.type,
        max_participants: formData.max_participants,
        registration_deadline: formData.registration_deadline,
        rules: formData.rules
      }
      
      // Add to store
      addContest(newContest)
      
      toast.success('Contest created successfully!')
      navigate(`/contests/${newContest.id}`)
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

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h3>
        <p className="text-gray-500">Only administrators can create contests.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Contest</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new competitive programming contest for users to participate.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Contest Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`input w-full ${errors.title ? 'border-red-500' : ''}`}
                placeholder="e.g., Summer Programming Challenge 2024"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

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
                className={`input w-full ${errors.max_participants ? 'border-red-500' : ''}`}
                min="1"
                max="10000"
              />
              {errors.max_participants && (
                <p className="text-red-500 text-sm mt-1">{errors.max_participants}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Contest Visibility *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    checked={formData.is_public}
                    onChange={() => handleInputChange('is_public', true)}
                    className="mr-2"
                  />
                  <span className="text-sm">Public</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="visibility"
                    checked={!formData.is_public}
                    onChange={() => handleInputChange('is_public', false)}
                    className="mr-2"
                  />
                  <span className="text-sm">Private</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.is_public 
                  ? 'Anyone can view and register for this contest' 
                  : 'Only invited participants can view and register'}
              </p>
            </div>
          </div>
        </div>

        {/* Contest Description */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Contest Description</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`input w-full h-32 resize-none ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Describe the contest objectives, themes, and what participants can expect..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Contest Rules
              </label>
              <textarea
                value={formData.rules}
                onChange={(e) => handleInputChange('rules', e.target.value)}
                className="input w-full h-24 resize-none"
                placeholder="Contest rules, scoring system, submission guidelines..."
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Schedule</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        {/* Group Assignment */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Group Assignment (Optional)</h2>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Assign to Groups
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {userGroups.length === 0 ? (
                <p className="text-sm text-gray-500">No groups available. Create or join a group to assign contests.</p>
              ) : (
                userGroups.map((group) => (
                  <label key={group.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.group_ids.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleInputChange('group_ids', [...formData.group_ids, group.id])
                        } else {
                          handleInputChange('group_ids', formData.group_ids.filter(id => id !== group.id))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {group.name} 
                      <span className="text-xs text-gray-500 ml-1">
                        {group.is_owner ? '(Owner)' : '(Manager)'}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              You can assign this contest to multiple groups you own or manage. If no groups are selected, the contest will only appear in the main contests page.
            </p>
          </div>
        </div>

        {/* Problem Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Contest Problems</h2>
          
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
                    toast.success('Problem added to contest')
                  }
                }}
                disabled={!selectedProblemCode}
                className="btn btn-primary px-4 py-2"
              >
                Add Problem
              </button>
            </div>

            {formData.problem_codes.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Selected Problems ({formData.problem_codes.length})</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                  {formData.problem_codes.map((code, index) => {
                    const problem = problems.find(p => p.code === code)
                    return (
                      <div key={code} className="flex items-center justify-between p-3">
                        <div>
                          <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mr-2">
                            {code}
                          </span>
                          <span className="text-sm">
                            {problem?.title || 'Unknown Problem'}
                          </span>
                          {problem && (
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {problem.difficulty}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleInputChange('problem_codes', formData.problem_codes.filter(c => c !== code))
                            toast.success('Problem removed from contest')
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
            ) : (
              <p className="text-gray-500 text-sm">No problems selected yet. Add problems to include in this contest.</p>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/contests')}
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

export default CreateContestPage