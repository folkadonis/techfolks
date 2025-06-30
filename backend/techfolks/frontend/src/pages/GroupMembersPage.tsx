import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useGroupsStore } from '@store/groupsStore'
import toast from 'react-hot-toast'

interface GroupMember {
  id: number
  username: string
  full_name: string
  role: 'owner' | 'manager' | 'member'
  joined_at: string
  rating: number
  problems_solved: number
  email?: string
}

const GroupMembersPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getGroup, updateGroup } = useGroupsStore()

  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberUsername, setNewMemberUsername] = useState('')

  useEffect(() => {
    if (id) {
      fetchGroupData()
    }
  }, [id])

  const fetchGroupData = () => {
    try {
      setLoading(true)
      
      // Get group from store
      const storedGroup = getGroup(parseInt(id!))
      
      if (storedGroup) {
        setGroup(storedGroup)
        
        // Mock members data
        const mockMembers: GroupMember[] = [
          {
            id: storedGroup.owner_id,
            username: storedGroup.owner_name,
            full_name: storedGroup.owner_name,
            role: 'owner',
            joined_at: storedGroup.created_at,
            rating: 2100,
            problems_solved: 850,
            email: `${storedGroup.owner_name}@example.com`
          }
        ]
        
        // Add any managers from the group
        if (storedGroup.managers) {
          storedGroup.managers.forEach((manager: string, index: number) => {
            mockMembers.push({
              id: Date.now() + index,
              username: manager,
              full_name: manager,
              role: 'manager',
              joined_at: new Date().toISOString(),
              rating: 1800,
              problems_solved: 500,
              email: `${manager}@example.com`
            })
          })
        }
        
        // Add some mock members
        if (storedGroup.member_count > mockMembers.length) {
          for (let i = mockMembers.length; i < Math.min(storedGroup.member_count, 10); i++) {
            mockMembers.push({
              id: Date.now() + i,
              username: `member_${i}`,
              full_name: `Member ${i}`,
              role: 'member',
              joined_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
              rating: 1200 + Math.floor(Math.random() * 600),
              problems_solved: Math.floor(Math.random() * 300),
              email: `member${i}@example.com`
            })
          }
        }
        
        setMembers(mockMembers)
      } else {
        toast.error('Group not found')
        navigate('/groups')
      }
    } catch (error) {
      console.error('Error fetching group data:', error)
      toast.error('Failed to load group data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberUsername.trim()) {
      toast.error('Please enter a username')
      return
    }

    try {
      // Check if member already exists
      if (members.some(m => m.username === newMemberUsername)) {
        toast.error('This user is already a member')
        return
      }

      // Mock adding a new member
      const newMember: GroupMember = {
        id: Date.now(),
        username: newMemberUsername,
        full_name: newMemberUsername,
        role: 'member',
        joined_at: new Date().toISOString(),
        rating: 1500,
        problems_solved: 100,
        email: `${newMemberUsername}@example.com`
      }

      setMembers(prev => [...prev, newMember])
      
      // Update group member count
      updateGroup(group.id, { member_count: group.member_count + 1 })
      setGroup((prev: any) => ({ ...prev, member_count: prev.member_count + 1 }))
      
      setNewMemberUsername('')
      setShowAddMember(false)
      toast.success(`${newMemberUsername} has been added to the group`)
    } catch (error) {
      console.error('Error adding member:', error)
      toast.error('Failed to add member')
    }
  }

  const handleRemoveMember = async (memberId: number, username: string) => {
    if (window.confirm(`Are you sure you want to remove ${username} from the group?`)) {
      try {
        setMembers(prev => prev.filter(member => member.id !== memberId))
        
        // Update group member count
        updateGroup(group.id, { member_count: group.member_count - 1 })
        setGroup((prev: any) => ({ ...prev, member_count: prev.member_count - 1 }))
        
        toast.success(`${username} has been removed from the group`)
      } catch (error) {
        console.error('Error removing member:', error)
        toast.error('Failed to remove member')
      }
    }
  }

  const handlePromoteToManager = async (memberId: number, username: string) => {
    try {
      // Update member role to manager
      setMembers(prev => prev.map(member => 
        member.id === memberId 
          ? { ...member, role: 'manager' as const }
          : member
      ))
      
      // Update group managers list
      const updatedManagers = [...(group.managers || []), username]
      updateGroup(group.id, { managers: updatedManagers })
      setGroup((prev: any) => ({ ...prev, managers: updatedManagers }))
      
      toast.success(`${username} has been promoted to manager`)
    } catch (error) {
      console.error('Error promoting member:', error)
      toast.error('Failed to promote member')
    }
  }

  const handleDemoteFromManager = async (memberId: number, username: string) => {
    try {
      // Update member role to regular member
      setMembers(prev => prev.map(member => 
        member.id === memberId 
          ? { ...member, role: 'member' as const }
          : member
      ))
      
      // Update group managers list
      const updatedManagers = (group.managers || []).filter((m: string) => m !== username)
      updateGroup(group.id, { managers: updatedManagers })
      setGroup((prev: any) => ({ ...prev, managers: updatedManagers }))
      
      toast.success(`${username} has been demoted to member`)
    } catch (error) {
      console.error('Error demoting manager:', error)
      toast.error('Failed to demote manager')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-blue-100 text-blue-800'
      case 'manager': return 'bg-purple-100 text-purple-800'
      case 'member': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 2100) return 'text-red-600'
    if (rating >= 1900) return 'text-orange-600'
    if (rating >= 1600) return 'text-purple-600'
    if (rating >= 1400) return 'text-blue-600'
    if (rating >= 1200) return 'text-green-600'
    return 'text-gray-600'
  }

  const filteredMembers = members.filter(member =>
    member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!user || !group) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h3>
        <p className="text-gray-500">Group not found or you don't have access.</p>
      </div>
    )
  }

  const isOwner = user.id && group.owner_id === parseInt(user.id)

  if (!isOwner) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h3>
        <p className="text-gray-500">Only the group owner can manage members.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading members...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manage Group Members</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Add, remove, and manage members for <span className="font-semibold">{group.name}</span>
        </p>
      </div>

      {/* Group Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-500">Total Members</span>
            <div className="text-2xl font-bold">{group.member_count}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Managers</span>
            <div className="text-2xl font-bold">{members.filter(m => m.role === 'manager').length}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Regular Members</span>
            <div className="text-2xl font-bold">{members.filter(m => m.role === 'member').length}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Group Code</span>
            <div className="font-mono text-lg">{group.invite_code}</div>
          </div>
        </div>
      </div>

      {/* Invite Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Invite Members</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Share this code with others to invite them to join the group
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <code className="text-lg font-mono bg-white dark:bg-gray-800 px-4 py-2 rounded-lg">
              {group.invite_code}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(group.invite_code)
                toast.success('Invite code copied!')
              }}
              className="btn btn-primary px-4 py-2"
            >
              Copy Code
            </button>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex-1 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full"
            />
          </div>
          <button
            onClick={() => setShowAddMember(true)}
            className="btn btn-primary px-4 py-2"
          >
            + Add Member Directly
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Add New Member</h3>
            <form onSubmit={handleAddMember}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={newMemberUsername}
                  onChange={(e) => setNewMemberUsername(e.target.value)}
                  placeholder="Enter username"
                  className="input w-full"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false)
                    setNewMemberUsername('')
                  }}
                  className="btn btn-outline px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4 py-2"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Problems Solved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.full_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        @{member.username}
                      </div>
                      {member.email && (
                        <div className="text-xs text-gray-400">
                          {member.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getRatingColor(member.rating)}`}>
                      {member.rating}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {member.problems_solved}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {member.role === 'member' && (
                      <div className="space-x-2">
                        <button
                          onClick={() => handlePromoteToManager(member.id, member.username)}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                        >
                          Promote
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id, member.username)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {member.role === 'manager' && (
                      <div className="space-x-2">
                        <button
                          onClick={() => handleDemoteFromManager(member.id, member.username)}
                          className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                        >
                          Demote
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id, member.username)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {member.role === 'owner' && (
                      <span className="text-gray-400">Owner</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <button
          onClick={() => navigate(`/groups/${id}`)}
          className="btn btn-outline px-6 py-2"
        >
          ← Back to Group
        </button>
      </div>
    </div>
  )
}

export default GroupMembersPage