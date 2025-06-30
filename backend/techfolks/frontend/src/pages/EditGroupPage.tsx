import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { groupsAPI } from '@services/api'
import { useAuthStore } from '@store/authStore'
import toast from 'react-hot-toast'

interface GroupFormData {
  name: string
  description: string
  is_public: boolean
  max_members: number
  auto_accept: boolean
  rules: string
}

const EditGroupPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()

  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    is_public: true,
    max_members: 50,
    auto_accept: false,
    rules: ''
  })

  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    if (id) {
      fetchGroup()
    }
  }, [id])

  const fetchGroup = async () => {
    try {
      setFetchLoading(true)
      const response = await groupsAPI.getById(id!)
      const group = response.data
      
      // Check if current user is the owner
      setIsOwner(group.owner_id === user?.id)
      
      setFormData({
        name: group.name || '',
        description: group.description || '',
        is_public: group.is_public ?? true,
        max_members: group.max_members || 50,
        auto_accept: group.auto_accept ?? false,
        rules: group.rules || ''
      })
    } catch (error: any) {
      console.error('Error fetching group:', error)
      toast.error('Failed to load group')
      navigate('/groups')
    } finally {
      setFetchLoading(false)
    }
  }

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

    if (formData.max_members < 2 || formData.max_members > 1000) {
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
      await groupsAPI.update(id!, formData)
      toast.success('Group updated successfully!')
      navigate(`/groups/${id}`)
    } catch (error: any) {
      console.error('Error updating group:', error)
      toast.error(error.response?.data?.message || 'Failed to update group')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone and all members will be removed.')) {
      return
    }

    setLoading(true)
    try {
      await groupsAPI.delete(id!)
      toast.success('Group deleted successfully!')
      navigate('/groups')
    } catch (error: any) {
      console.error('Error deleting group:', error)
      toast.error(error.response?.data?.message || 'Failed to delete group')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof GroupFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Login Required</h3>
        <p className="text-gray-500">Please login to edit groups.</p>
      </div>
    )
  }

  if (fetchLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading group...</div>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h3>
        <p className="text-gray-500">Only group owners can edit group settings.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Group</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Modify your group settings and information.
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
                onChange={(e) => handleInputChange('max_members', parseInt(e.target.value))}
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

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="btn bg-red-600 hover:bg-red-700 text-white px-6 py-2"
          >
            {loading ? 'Deleting...' : 'Delete Group'}
          </button>
          
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/groups/${id}`)}
              className="btn btn-outline px-6 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary px-6 py-2"
            >
              {loading ? 'Updating...' : 'Update Group'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default EditGroupPage