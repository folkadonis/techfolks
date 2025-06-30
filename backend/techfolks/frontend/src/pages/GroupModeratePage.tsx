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

interface Contest {
  id: number
  title: string
  start_time: string
  end_time: string
  status: 'upcoming' | 'running' | 'ended'
  participants: number
  problems_count: number
}

interface Problem {
  id: number
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  solved_count: number
  tags: string[]
  added_at: string
}

interface Group {
  id: number
  name: string
  description?: string
  owner_name: string
  member_count: number
  is_manager: boolean
}

const GroupModeratePage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [contests, setContests] = useState<Contest[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [activeTab, setActiveTab] = useState<'members' | 'contests' | 'problems'>('members')
  const [loading, setLoading] = useState(false)

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
        is_manager: true
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
          username: 'problematic_user',
          full_name: 'Spam User',
          role: 'member',
          joined_at: '2024-06-20T09:00:00Z',
          rating: 800,
          problems_solved: 5
        }
      ]

      // Mock contests data
      const mockContests: Contest[] = [
        {
          id: 1,
          title: 'Weekly Practice Contest #12',
          start_time: '2024-07-05T14:00:00Z',
          end_time: '2024-07-05T17:00:00Z',
          status: 'upcoming',
          participants: 0,
          problems_count: 5
        },
        {
          id: 2,
          title: 'ACM-ICPC Regional Simulation',
          start_time: '2024-06-25T10:00:00Z',
          end_time: '2024-06-25T15:00:00Z',
          status: 'ended',
          participants: 28,
          problems_count: 8
        }
      ]

      // Mock problems data
      const mockProblems: Problem[] = [
        {
          id: 1,
          title: 'Binary Search Implementation',
          difficulty: 'Easy',
          solved_count: 25,
          tags: ['Binary Search', 'Implementation'],
          added_at: '2024-06-15T10:00:00Z'
        },
        {
          id: 2,
          title: 'Graph Traversal Challenge',
          difficulty: 'Medium',
          solved_count: 18,
          tags: ['Graphs', 'DFS', 'BFS'],
          added_at: '2024-06-20T14:30:00Z'
        },
        {
          id: 3,
          title: 'Advanced DP Problem',
          difficulty: 'Hard',
          solved_count: 8,
          tags: ['Dynamic Programming', 'Optimization'],
          added_at: '2024-06-22T16:00:00Z'
        }
      ]

      setGroup(mockGroup)
      setMembers(mockMembers)
      setContests(mockContests)
      setProblems(mockProblems)
    } catch (error) {
      console.error('Error fetching group data:', error)
      toast.error('Failed to load group data')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: number, username: string) => {
    if (window.confirm(`Are you sure you want to remove ${username} from the group?`)) {
      try {
        setMembers(prev => prev.filter(member => member.id !== memberId))
        toast.success(`${username} has been removed from the group`)
      } catch (error) {
        console.error('Error removing member:', error)
        toast.error('Failed to remove member')
      }
    }
  }

  const handleDeleteContest = async (contestId: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        setContests(prev => prev.filter(contest => contest.id !== contestId))
        toast.success('Contest deleted successfully')
      } catch (error) {
        console.error('Error deleting contest:', error)
        toast.error('Failed to delete contest')
      }
    }
  }

  const handleRemoveProblem = async (problemId: number, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}" from the group?`)) {
      try {
        setProblems(prev => prev.filter(problem => problem.id !== problemId))
        toast.success('Problem removed from group')
      } catch (error) {
        console.error('Error removing problem:', error)
        toast.error('Failed to remove problem')
      }
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600'
      case 'Medium': return 'text-yellow-600'
      case 'Hard': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'running': return 'bg-green-100 text-green-800'
      case 'ended': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Login Required</h3>
        <p className="text-gray-500">Please login to access group moderation.</p>
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

  if (!group.is_manager) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Access Denied</h3>
        <p className="text-gray-500">Only group managers can access moderation tools.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Moderate Group</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Moderation tools for <span className="font-semibold">{group.name}</span>
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

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[
          { key: 'members', label: 'Members' },
          { key: 'contests', label: 'Contests' },
          { key: 'problems', label: 'Problems' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Moderate Members</h2>
            <p className="text-sm text-gray-500 mt-1">Remove disruptive members and manage group participation</p>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {member.rating}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {member.role === 'member' && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.username)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Remove Member
                        </button>
                      )}
                      {(member.role === 'owner' || member.role === 'manager') && (
                        <span className="text-gray-400">Cannot remove</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contests Tab */}
      {activeTab === 'contests' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Moderate Contests</h2>
            <p className="text-sm text-gray-500 mt-1">Manage group contests and competitions</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {contests.map((contest) => (
                  <tr key={contest.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {contest.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {contest.problems_count} problems
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contest.status)}`}>
                        {contest.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {contest.participants}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(contest.start_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleDeleteContest(contest.id, contest.title)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Problems Tab */}
      {activeTab === 'problems' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">Moderate Problems</h2>
            <p className="text-sm text-gray-500 mt-1">Manage group problem collections</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Problem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Solved Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {problems.map((problem) => (
                  <tr key={problem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {problem.title}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {problem.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {problem.solved_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(problem.added_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleRemoveProblem(problem.id, problem.title)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

export default GroupModeratePage