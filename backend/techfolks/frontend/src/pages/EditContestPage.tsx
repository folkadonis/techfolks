import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { contestsAPI } from '@services/api'
import { useAuthStore } from '@store/authStore'
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
}

const EditContestPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [formData, setFormData] = useState<ContestFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    type: 'ACM-ICPC',
    max_participants: 100,
    is_public: true,
    registration_deadline: '',
    rules: ''
  })

  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (id) {
      fetchContest()
    }
  }, [id])

  const fetchContest = async () => {
    try {
      setFetchLoading(true)
      const response = await contestsAPI.getById(id!)
      const contest = response.data
      
      // Format datetime values for input fields
      const formatDateTime = (dateString: string) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const offset = date.getTimezoneOffset()
        const localDate = new Date(date.getTime() - offset * 60000)
        return localDate.toISOString().slice(0, 16)
      }
      
      setFormData({
        title: contest.title || '',
        description: contest.description || '',
        start_time: formatDateTime(contest.start_time),
        end_time: formatDateTime(contest.end_time),
        type: contest.type || 'ACM-ICPC',
        max_participants: contest.max_participants || 100,
        is_public: contest.is_public ?? true,
        registration_deadline: formatDateTime(contest.registration_deadline),
        rules: contest.rules || ''
      })
    } catch (error: any) {
      console.error('Error fetching contest:', error)
      toast.error('Failed to load contest')
      navigate('/contests')
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
      await contestsAPI.update(id!, formData)
      toast.success('Contest updated successfully!')
      navigate(`/contests/${id}`)
    } catch (error: any) {
      console.error('Error updating contest:', error)
      toast.error(error.response?.data?.message || 'Failed to update contest')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contest? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await contestsAPI.delete(id!)
      toast.success('Contest deleted successfully!')
      navigate('/contests')
    } catch (error: any) {
      console.error('Error deleting contest:', error)
      toast.error(error.response?.data?.message || 'Failed to delete contest')
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

  const getMinDateTime = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const localDate = new Date(now.getTime() - offset * 60000)
    return localDate.toISOString().slice(0, 16)
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h3>
        <p className="text-gray-500">Only administrators can edit contests.</p>
      </div>
    )
  }

  if (fetchLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading contest...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Contest</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Modify the competitive programming contest details.
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => handleInputChange('is_public', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="is_public" className="text-sm">
                Make this contest public
              </label>
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

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="btn bg-red-600 hover:bg-red-700 text-white px-6 py-2"
          >
            {loading ? 'Deleting...' : 'Delete Contest'}
          </button>
          
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/contests/${id}`)}
              className="btn btn-outline px-6 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-6 py-2"
            >
              {loading ? 'Updating...' : 'Update Contest'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default EditContestPage