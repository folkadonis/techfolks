import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import toast from 'react-hot-toast'

interface GroupMember {
  id: number
  username: string
  full_name: string
  role: 'owner' | 'manager' | 'member'
  joined_at: string
  rating: number
  problems_solved: number
}

interface Group {
  id: number
  name: string
  description?: string
  owner_name: string
  member_count: number
  created_at: string
}

const GroupManagePage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)
  const [newManagerUsername, setNewManagerUsername] = useState('')

  useEffect(() => {
    if (id) {
      fetchGroupData()
    }
  }, [id])

  const fetchGroupData = async () => {
    try {
      setLoading(true)
      
      // Mock group data
      const mockGroup: Group = {
        id: parseInt(id!),
        name: 'ACM Training Camp',
        description: 'Intensive training group for ACM-ICPC preparation.',
        owner_name: 'coach_ahmed',
        member_count: 32,
        created_at: '2024-01-15T14:00:00Z'
      }

      // Mock members data
      const mockMembers: GroupMember[] = [
        {
          id: 1,
          username: 'coach_ahmed',
          full_name: 'Ahmed Hassan',
          role: 'owner',
          joined_at: '2024-01-15T14:00:00Z',
          rating: 2100,
          problems_solved: 850
        },
        {
          id: 2,
          username: 'assistant_coach',
          full_name: 'Sarah Ali',
          role: 'manager',
          joined_at: '2024-01-16T10:00:00Z',
          rating: 1850,
          problems_solved: 650
        },
        {
          id: 3,
          username: 'student_1',
          full_name: 'Omar Mahmoud',
          role: 'member',
          joined_at: '2024-01-20T09:00:00Z',
          rating: 1450,
          problems_solved: 320
        },
        {
          id: 4,
          username: 'student_2',
          full_name: 'Fatima Ibrahim',
          role: 'member',
          joined_at: '2024-01-22T15:30:00Z',
          rating: 1520,
          problems_solved: 380
        },
        {
          id: 5,
          username: 'advanced_student',
          full_name: 'Youssef Mohamed',
          role: 'member',
          joined_at: '2024-01-25T11:15:00Z',
          rating: 1680,
          problems_solved: 480
        }
      ]

      setGroup(mockGroup)
      setMembers(mockMembers)
    } catch (error) {
      console.error('Error fetching group data:', error)
      toast.error('Failed to load group data')
    } finally {
      setLoading(false)
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
      toast.success(`${username} has been demoted to member`)
    } catch (error) {
      console.error('Error demoting manager:', error)
      toast.error('Failed to demote manager')
    }
  }

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newManagerUsername.trim()) {
      toast.error('Please enter a username')
      return
    }

    try {
      // Mock adding a new manager
      const newMember: GroupMember = {
        id: Date.now(),
        username: newManagerUsername,
        full_name: `${newManagerUsername} (New Manager)`,
        role: 'manager',
        joined_at: new Date().toISOString(),
        rating: 1600,
        problems_solved: 400
      }

      setMembers(prev => [...prev, newMember])
      setNewManagerUsername('')
      toast.success(`${newManagerUsername} has been added as manager`)
    } catch (error) {
      console.error('Error adding manager:', error)
      toast.error('Failed to add manager')
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

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h3>
        <p className="text-gray-500">Only administrators can manage group permissions.</p>
      </div>
    )
  }

  if (loading || !group) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading group data...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Manage Group Permissions</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Assign and manage manager roles for <span className="font-semibold">{group.name}</span>
        </p>
      </div>

      {/* Group Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Group Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-500">Group Name</span>
            <div className="font-medium">{group.name}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Owner</span>
            <div className="font-medium">{group.owner_name}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Total Members</span>
            <div className="font-medium">{group.member_count}</div>
          </div>
        </div>
      </div>

      {/* Add New Manager */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Manager</h2>
        <form onSubmit={handleAddManager} className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={newManagerUsername}
              onChange={(e) => setNewManagerUsername(e.target.value)}
              placeholder="Enter username to promote to manager"
              className="input w-full"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary px-6 py-2"
          >
            Add Manager
          </button>
        </form>
        <p className="text-sm text-gray-500 mt-2">
          Only admins can assign manager permissions. Managers can moderate the group but cannot delete it.
        </p>
      </div>

      {/* Members List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold">Group Members</h2>
        </div>
        
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
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.full_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        @{member.username}
                      </div>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {member.role === 'member' && (
                      <button
                        onClick={() => handlePromoteToManager(member.id, member.username)}
                        className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                      >
                        Promote to Manager
                      </button>
                    )}
                    {member.role === 'manager' && (
                      <button
                        onClick={() => handleDemoteFromManager(member.id, member.username)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Demote to Member
                      </button>
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
          onClick={() => navigate('/groups')}
          className="btn btn-outline px-6 py-2"
        >
          ← Back to Groups
        </button>
      </div>
    </div>
  )
}

export default GroupManagePage