import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { groupsAPI } from '@services/api'
import { useAuthStore } from '@store/authStore'
import toast from 'react-hot-toast'

interface Group {
  id: number
  name: string
  description?: string
  invite_code: string
  is_private: boolean
  owner_id: number
  owner_name: string
  member_count: number
  created_at: string
  is_member: boolean
  is_owner: boolean
  contest_count?: number
  problem_count?: number
  logo_url?: string
  badges?: string[]
}

interface GroupMember {
  id: number
  username: string
  full_name: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
  rating: number
  problems_solved: number
}

const GroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'browse' | 'my-groups'>('my-groups')
  const [joinCode, setJoinCode] = useState('')
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    // Always fetch groups
    fetchGroups()
    if (isAuthenticated) {
      fetchMyGroups()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchGroups = async () => {
    try {
      // Use mock data directly since backend may not be ready
      const mockGroups: Group[] = [
        {
          id: 1,
          name: 'SUST SWE Contest Group',
          description: 'Official competitive programming group for SUST Software Engineering students. Host weekly contests, problem collections, and practice sessions.',
          invite_code: 'SUSTSWE2024',
          is_private: false,
          owner_id: 2,
          owner_name: 'prof_rahman',
          member_count: 45,
          created_at: '2024-01-10T10:00:00Z',
          is_member: false,
          is_owner: false,
          contest_count: 12,
          problem_count: 150,
          badges: ['University', 'Official']
        },
        {
          id: 2,
          name: 'ACM Training Camp',
          description: 'Intensive training group for ACM-ICPC preparation. Replay contests from World Finals and Regional contests with detailed editorial discussions.',
          invite_code: 'ACMTRAIN',
          is_private: false,
          owner_id: 3,
          owner_name: 'coach_ahmed',
          member_count: 32,
          created_at: '2024-01-15T14:00:00Z',
          is_member: true,
          is_owner: false,
          contest_count: 25,
          problem_count: 300,
          badges: ['Training', 'ACM-ICPC']
        },
        {
          id: 3,
          name: 'Codeforces Div1 Practice',
          description: 'Advanced group for Div1 participants. Solve hard problems, discuss optimization techniques, and prepare for rating contests.',
          invite_code: 'DIV1HARD',
          is_private: true,
          owner_id: 4,
          owner_name: 'red_coder',
          member_count: 15,
          created_at: '2024-01-20T09:00:00Z',
          is_member: false,
          is_owner: false,
          contest_count: 8,
          problem_count: 120,
          badges: ['Elite', 'Advanced']
        }
      ]
      setGroups(mockGroups)
    } catch (error) {
      console.error('Error fetching groups:', error)
      setGroups([])
    }
  }

  const fetchMyGroups = async () => {
    try {
      setLoading(true)
      
      // Add a small delay to simulate loading but ensure it's fast
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Use mock data directly since backend may not be ready
      const mockMyGroups: Group[] = [
        {
          id: 4,
          name: 'My Contest Training Group',
          description: 'Personal group for organizing practice contests, curating problem collections, and tracking improvement in competitive programming.',
          invite_code: 'MYCP2024',
          is_private: true,
          owner_id: user?.id || 5,
          owner_name: user?.username || 'admin',
          member_count: 8,
          created_at: '2024-06-01T10:00:00Z',
          is_member: true,
          is_owner: true,
          contest_count: 5,
          problem_count: 75,
          badges: ['Personal', 'Training']
        },
        {
          id: 2,
          name: 'ACM Training Camp',
          description: 'Intensive training group for ACM-ICPC preparation. Replay contests from World Finals and Regional contests with detailed editorial discussions.',
          invite_code: 'ACMTRAIN',
          is_private: false,
          owner_id: 3,
          owner_name: 'coach_ahmed',
          member_count: 32,
          created_at: '2024-01-15T14:00:00Z',
          is_member: true,
          is_owner: false,
          contest_count: 25,
          problem_count: 300,
          badges: ['Training', 'ACM-ICPC']
        }
      ]
      setMyGroups(mockMyGroups)
    } catch (error) {
      console.error('Error fetching my groups:', error)
      setMyGroups([])
    } finally {
      setLoading(false)
    }
  }


  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!joinCode.trim()) {
      toast.error('Invite code is required')
      return
    }

    try {
      // Simulate joining a group
      const group = groups.find(g => g.invite_code.toLowerCase() === joinCode.toLowerCase())
      if (group) {
        const updatedGroup = { ...group, is_member: true, member_count: group.member_count + 1 }
        setMyGroups(prev => [updatedGroup, ...prev])
        setGroups(prev => prev.map(g => g.id === group.id ? updatedGroup : g))
        setJoinCode('')
        toast.success(`Successfully joined ${group.name}!`)
      } else {
        toast.error('Invalid invite code')
      }
    } catch (error) {
      toast.error('Failed to join group')
    }
  }

  const handleLeaveGroup = async (groupId: number) => {
    try {
      setMyGroups(prev => prev.filter(g => g.id !== groupId))
      setGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, is_member: false, member_count: g.member_count - 1 } : g
      ))
      toast.success('Left group successfully')
    } catch (error) {
      toast.error('Failed to leave group')
    }
  }

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone and all members will be removed.')) {
      return
    }

    try {
      await groupsAPI.delete(groupId.toString())
      setMyGroups(prev => prev.filter(g => g.id !== groupId))
      setGroups(prev => prev.filter(g => g.id !== groupId))
      toast.success('Group deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting group:', error)
      toast.error(error.response?.data?.message || 'Failed to delete group')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Authentication Required</h3>
        <p className="text-gray-500 mb-4">Please login to access groups.</p>
        <Link to="/login" className="btn btn-primary">
          Login
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading groups...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Collaborative spaces for hosting contests, curating problems, and training together
          </p>
        </div>
        <Link
          to="/groups/create"
          className="btn btn-primary px-4 py-2"
        >
          Create Group
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[
          { key: 'my-groups', label: 'My Groups' },
          { key: 'browse', label: 'Browse Groups' }
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

      {/* My Groups Tab */}
      {activeTab === 'my-groups' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Groups ({myGroups.length})</h2>
            <form onSubmit={handleJoinGroup} className="flex space-x-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter invite code"
                className="input px-3 py-2 text-sm"
              />
              <button type="submit" className="btn btn-primary px-4 py-2 text-sm">
                Join Group
              </button>
            </form>
          </div>

          {myGroups.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No groups yet</h3>
              <p className="text-gray-500 mb-4">Create or join a group to start collaborating!</p>
              <Link
                to="/groups/create"
                className="btn btn-primary mr-2"
              >
                Create Group
              </Link>
              <button
                onClick={() => setActiveTab('browse')}
                className="btn btn-outline"
              >
                Browse Groups
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myGroups.map((group) => (
                <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">
                        <Link 
                          to={`/groups/${group.id}`}
                          className="hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          {group.name}
                        </Link>
                      </h3>
                      
                      {/* Badges */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {group.is_owner && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Owner</span>
                        )}
                        {group.is_private && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Private</span>
                        )}
                        {group.badges?.map((badge, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {group.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {group.description}
                    </p>
                  )}

                  {/* VJudge-style stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {group.member_count}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {group.contest_count || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Contests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {group.problem_count || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Problems</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div>
                      by <span className="font-medium">{group.owner_name}</span>
                    </div>
                    <div>
                      {formatDate(group.created_at)}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Code: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{group.invite_code}</span>
                    </div>
                    <div className="space-x-2">
                      <Link
                        to={`/groups/${group.id}`}
                        className="btn btn-outline px-3 py-1 text-sm"
                      >
                        View
                      </Link>
                      {group.is_owner ? (
                        <div className="flex space-x-2">
                          <Link
                            to={`/groups/${group.id}/edit`}
                            className="btn btn-outline px-3 py-1 text-sm"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            className="btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleLeaveGroup(group.id)}
                          className="btn btn-outline text-red-600 border-red-600 hover:bg-red-50 px-3 py-1 text-sm"
                        >
                          Leave
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Browse Groups Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Public Groups</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.filter(g => !g.is_private).map((group) => (
              <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{group.name}</h3>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {group.is_member && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Joined</span>
                      )}
                      {group.badges?.map((badge, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {group.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {group.description}
                  </p>
                )}

                {/* VJudge-style stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {group.member_count}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {group.contest_count || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Contests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {group.problem_count || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Problems</div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div>
                    by <span className="font-medium">{group.owner_name}</span>
                  </div>
                  <div>
                    {formatDate(group.created_at)}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Code: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{group.invite_code}</span>
                  </div>
                  <div className="space-x-2">
                    <Link
                      to={`/groups/${group.id}`}
                      className="btn btn-outline px-3 py-1 text-sm"
                    >
                      View
                    </Link>
                    {!group.is_member && (
                      <button
                        onClick={() => {
                          setJoinCode(group.invite_code)
                          handleJoinGroup({ preventDefault: () => {} } as any)
                        }}
                        className="btn btn-primary px-3 py-1 text-sm"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

export default GroupsPage