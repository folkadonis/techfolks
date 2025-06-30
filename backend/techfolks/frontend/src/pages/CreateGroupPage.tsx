import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useGroupsStore } from '@store/groupsStore'
import toast from 'react-hot-toast'

interface GroupFormData {
  name: string
  description: string
  is_public: boolean
  max_members: number
  auto_accept: boolean
  rules: string
}

const CreateGroupPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const { addGroup } = useGroupsStore()

  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    is_public: true,
    max_members: 50,
    auto_accept: false,
    rules: ''
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Group name must be at least 3 characters'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Group name must not exceed 50 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must not exceed 500 characters'
    }

    if (isNaN(formData.max_members) || formData.max_members < 2 || formData.max_members > 1000) {
      newErrors.max_members = 'Max members must be between 2 and 1000'
    }

    if (formData.rules && formData.rules.length > 1000) {
      newErrors.rules = 'Rules must not exceed 1000 characters'
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
      // Mock group creation
      const newGroup = {
        id: Date.now(),
        name: formData.name,
        description: formData.description,
        invite_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        is_private: !formData.is_public,
        owner_id: user?.id ? parseInt(user.id) : 1,
        owner_name: user?.username || 'Unknown',
        member_count: 1,
        created_at: new Date().toISOString(),
        is_member: true,
        is_owner: true,
        is_manager: true,
        contest_count: 0,
        problem_count: 0,
        badges: ['New'],
        managers: []
      }
      
      // Add to store
      addGroup(newGroup)
      
      toast.success('Group created successfully!')
      navigate(`/groups/${newGroup.id}`)
    } catch (error: any) {
      console.error('Error creating group:', error)
      toast.error('Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof GroupFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleNumberChange = (field: keyof GroupFormData, value: string) => {
    const numValue = value === '' ? 50 : parseInt(value)
    if (!isNaN(numValue) && numValue >= 0) {
      handleInputChange(field, numValue)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Login Required</h3>
        <p className="text-gray-500">Please login to create groups. Anyone can create a group and become its owner.</p>
        <div className="mt-4">
          <Link to="/login" className="btn btn-primary">
            Login to Create Group
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Group</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a study group or team to collaborate on competitive programming.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`input w-full ${errors.name ? 'border-red-500' : ''}`}
                placeholder="e.g., ICPC Training Team 2024"
                maxLength={50}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formData.name.length}/50 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`input w-full h-32 resize-none ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Describe the purpose and goals of your group..."
                maxLength={500}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Group Rules (Optional)
              </label>
              <textarea
                value={formData.rules}
                onChange={(e) => handleInputChange('rules', e.target.value)}
                className={`input w-full h-24 resize-none ${errors.rules ? 'border-red-500' : ''}`}
                placeholder="Set group rules, expectations, and guidelines..."
                maxLength={1000}
              />
              {errors.rules && (
                <p className="text-red-500 text-sm mt-1">{errors.rules}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formData.rules.length}/1000 characters
              </p>
            </div>
          </div>
        </div>

        {/* Group Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Group Settings</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Maximum Members *
              </label>
              <input
                type="number"
                value={formData.max_members}
                onChange={(e) => handleNumberChange('max_members', e.target.value)}
                className={`input w-full ${errors.max_members ? 'border-red-500' : ''}`}
                min="2"
                max="1000"
              />
              {errors.max_members && (
                <p className="text-red-500 text-sm mt-1">{errors.max_members}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Number of members allowed in the group (2-1000)
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => handleInputChange('is_public', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="is_public" className="text-sm">
                  <span className="font-medium">Public Group</span>
                  <p className="text-gray-500 text-xs">
                    Anyone can find and view this group. Private groups are invite-only.
                  </p>
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="auto_accept"
                  checked={formData.auto_accept}
                  onChange={(e) => handleInputChange('auto_accept', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="auto_accept" className="text-sm">
                  <span className="font-medium">Auto-accept join requests</span>
                  <p className="text-gray-500 text-xs">
                    Automatically accept new members without manual approval.
                  </p>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="btn btn-outline px-6 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary px-6 py-2"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateGroupPage