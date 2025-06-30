import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useGroupsStore } from '@store/groupsStore'
import toast from 'react-hot-toast'

const JoinGroupPage = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { groups, updateGroup } = useGroupsStore()
  
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [groupPreview, setGroupPreview] = useState<any>(null)

  const handleCodeChange = (value: string) => {
    const formattedCode = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setInviteCode(formattedCode)
    
    // Look for group with this code
    if (formattedCode.length >= 6) {
      const group = groups.find(g => g.invite_code === formattedCode)
      if (group) {
        setGroupPreview(group)
      } else {
        setGroupPreview(null)
      }
    } else {
      setGroupPreview(null)
    }
  }

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated) {
      toast.error('Please login to join groups')
      navigate('/login')
      return
    }
    
    if (!inviteCode || inviteCode.length < 6) {
      toast.error('Please enter a valid invite code')
      return
    }

    setLoading(true)
    try {
      // Find group by invite code
      const group = groups.find(g => g.invite_code === inviteCode)
      
      if (!group) {
        toast.error('Invalid invite code. Please check and try again.')
        return
      }
      
      // Check if already a member
      if (group.is_member) {
        toast.error('You are already a member of this group')
        navigate(`/groups/${group.id}`)
        return
      }
      
      // Update group membership
      updateGroup(group.id, {
        is_member: true,
        member_count: group.member_count + 1
      })
      
      toast.success(`Successfully joined ${group.name}!`)
      navigate(`/groups/${group.id}`)
    } catch (error) {
      console.error('Error joining group:', error)
      toast.error('Failed to join group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Join a Group</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter the invite code to join a group
        </p>
      </div>

      <form onSubmit={handleJoinGroup} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Invite Code
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Enter invite code"
            className="input w-full text-center text-2xl font-mono uppercase"
            maxLength={10}
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2 text-center">
            Ask your group owner or manager for the invite code
          </p>
        </div>

        {groupPreview && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{groupPreview.name}</h3>
            {groupPreview.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {groupPreview.description}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Owner</span>
                <div className="font-medium">{groupPreview.owner_name}</div>
              </div>
              <div>
                <span className="text-gray-500">Members</span>
                <div className="font-medium">{groupPreview.member_count}</div>
              </div>
              {groupPreview.badges && groupPreview.badges.length > 0 && (
                <div className="col-span-2">
                  <div className="flex flex-wrap gap-1">
                    {groupPreview.badges.map((badge: string, index: number) => (
                      <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate('/groups')}
            className="btn btn-outline px-6 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !inviteCode || inviteCode.length < 6}
            className="btn btn-primary px-6 py-2"
          >
            {loading ? 'Joining...' : 'Join Group'}
          </button>
        </div>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Don't have an invite code?
        </p>
        <Link
          to="/groups"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          Browse public groups
        </Link>
      </div>
    </div>
  )
}

export default JoinGroupPage