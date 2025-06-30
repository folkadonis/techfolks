import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useGroupsStore } from '@store/groupsStore'
import GroupChat from '@components/chat/GroupChat'
import toast from 'react-hot-toast'

interface GroupMember {
  id: number
  username: string
  role: 'owner' | 'manager' | 'member'
  joined_at: string
  rating: number
}

interface Contest {
  id: number
  title: string
  start_time: string
  status: 'upcoming' | 'running' | 'ended'
  participants: number
}

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { getGroup, deleteGroup } = useGroupsStore()
  
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [contests, setContests] = useState<Contest[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'contests' | 'forum' | 'members'>('overview')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (id) {
      fetchGroupData()
    }
  }, [id])

  const fetchGroupData = () => {
    // Check store first
    const storedGroup = getGroup(parseInt(id!))
    
    if (storedGroup) {
      setGroup(storedGroup)
    } else {
      // Mock data for demo groups
      const mockGroups: any = {
        1: {
          id: 1,
          name: 'SUST SWE Contest Group',
          description: 'Official competitive programming group for SUST Software Engineering students. Host weekly contests, problem collections, and practice sessions.',
          invite_code: 'SUSTSWE2024',
          is_private: false,
          owner_name: 'prof_rahman',
          member_count: 45,
          contest_count: 12,
          problem_count: 150,
          badges: ['University', 'Official'],
          created_at: '2024-01-10T10:00:00Z'
        },
        2: {
          id: 2,
          name: 'ACM Training Camp',
          description: 'Intensive training group for ACM-ICPC preparation. Replay contests from World Finals and Regional contests with detailed editorial discussions.',
          invite_code: 'ACMTRAIN',
          is_private: false,
          owner_name: 'coach_ahmed',
          member_count: 32,
          contest_count: 25,
          problem_count: 300,
          badges: ['Training', 'ACM-ICPC'],
          created_at: '2024-01-15T14:00:00Z'
        }
      }
      
      if (mockGroups[id!]) {
        setGroup(mockGroups[id!])
      } else {
        toast.error('Group not found')
        navigate('/groups')
        return
      }
    }

    // Mock members
    setMembers([
      { id: 1, username: group?.owner_name || 'owner', role: 'owner', joined_at: '2024-01-10T10:00:00Z', rating: 2100 },
      { id: 2, username: 'top_coder', role: 'manager', joined_at: '2024-01-12T10:00:00Z', rating: 1950 },
      { id: 3, username: 'student1', role: 'member', joined_at: '2024-01-15T10:00:00Z', rating: 1600 },
      { id: 4, username: 'student2', role: 'member', joined_at: '2024-01-20T10:00:00Z', rating: 1450 }
    ])

    // Mock contests
    setContests([
      { id: 1, title: 'Weekly Contest #12', start_time: '2024-07-05T14:00:00Z', status: 'upcoming', participants: 0 },
      { id: 2, title: 'Practice Round #8', start_time: '2024-06-28T14:00:00Z', status: 'ended', participants: 28 }
    ])
  }

  const handleJoinGroup = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    toast.success('Successfully joined the group!')
    setGroup((prev: any) => ({ ...prev, is_member: true, member_count: prev.member_count + 1 }))
  }

  const handleLeaveGroup = () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      toast.success('Successfully left the group')
      setGroup((prev: any) => ({ ...prev, is_member: false, member_count: prev.member_count - 1 }))
    }
  }

  const handleDeleteGroup = () => {
    if (!group) return
    
    deleteGroup(group.id)
    toast.success('Group deleted successfully')
    navigate('/groups')
  }

  if (!group) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading group...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              {group.badges?.map((badge: string, index: number) => (
                <span key={index} className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                  {badge}
                </span>
              ))}
              {group.is_private && (
                <span className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full">
                  Private
                </span>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{group.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">{group.member_count}</div>
                <div className="text-sm text-gray-500">Members</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{group.contest_count || 0}</div>
                <div className="text-sm text-gray-500">Contests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{group.problem_count || 0}</div>
                <div className="text-sm text-gray-500">Problems</div>
              </div>
              <div>
                <div className="text-sm font-medium">Owner</div>
                <div className="text-sm text-gray-600">{group.owner_name}</div>
              </div>
            </div>
          </div>
          
          <div className="ml-6 space-y-2">
            {!group.is_member && (
              <button onClick={handleJoinGroup} className="btn btn-primary px-6 py-2 w-full">
                Join Group
              </button>
            )}
            {group.is_member && !group.is_owner && (
              <button onClick={handleLeaveGroup} className="btn btn-outline px-6 py-2 w-full">
                Leave Group
              </button>
            )}
            {group.is_owner && (
              <>
                <Link to={`/groups/${group.id}/members`} className="btn btn-primary px-6 py-2 w-full block text-center">
                  Manage Members
                </Link>
                <Link to={`/groups/${group.id}/edit`} className="btn btn-outline px-6 py-2 w-full block text-center">
                  Edit Group
                </Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Link to={`/groups/${group.id}/manage`} className="btn btn-outline px-6 py-2 w-full block text-center text-orange-600 border-orange-600">
                  Manage
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-outline px-6 py-2 w-full text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                >
                  Delete Group
                </button>
              </>
            )}
            {group.is_manager && !group.is_owner && (
              <Link to={`/groups/${group.id}/moderate`} className="btn btn-outline px-6 py-2 w-full block text-center text-purple-600 border-purple-600">
                Moderate
              </Link>
            )}
            <div className="text-center pt-2">
              <div className="text-xs text-gray-500 mb-1">Invite Code</div>
              <div className="flex items-center justify-center space-x-2">
                <code className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                  {group.invite_code}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(group.invite_code)
                    toast.success('Invite code copied!')
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Copy invite code"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'contests', label: 'Contests' },
          { key: 'forum', label: 'Forum' },
          { key: 'members', label: 'Members' }
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to={`/groups/${id}/contests`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">🏆</div>
                <h3 className="font-semibold text-lg">Contests</h3>
                <p className="text-sm text-gray-500 mt-1">View and participate in group contests</p>
              </div>
            </Link>
            
            <Link
              to={`/groups/${id}/forum`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">💬</div>
                <h3 className="font-semibold text-lg">Forum</h3>
                <p className="text-sm text-gray-500 mt-1">Join discussions and ask questions</p>
              </div>
            </Link>
            
            <Link
              to={`/groups/${id}/members`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">👥</div>
                <h3 className="font-semibold text-lg">Members</h3>
                <p className="text-sm text-gray-500 mt-1">View all {group.member_count} members</p>
              </div>
            </Link>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-500">No recent activity to show.</p>
          </div>
        </div>
      )}

      {activeTab === 'contests' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Group Contests</h2>
            <Link
              to={`/groups/${id}/contests`}
              className="btn btn-primary px-4 py-2 text-sm"
            >
              View All Contests
            </Link>
          </div>
          <div className="space-y-4">
            {contests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No contests yet</p>
            ) : (
              contests.slice(0, 3).map((contest) => (
                <div key={contest.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{contest.title}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(contest.start_time).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                        contest.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                        contest.status === 'running' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {contest.status}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {contest.participants} participants
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'forum' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Group Forum</h2>
            <Link
              to={`/groups/${id}/forum`}
              className="btn btn-primary px-4 py-2 text-sm"
            >
              Visit Forum
            </Link>
          </div>
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">💬</div>
            <p className="text-gray-500">
              Join the discussion forum to ask questions, share resources, and connect with other members.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Group Members ({members.length})</h2>
            <div className="flex space-x-2">
              {(group.is_owner || group.is_manager) && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(group.invite_code)
                    toast.success('Invite code copied! Share it with others to join.')
                  }}
                  className="btn btn-outline px-4 py-2 text-sm"
                >
                  📋 Copy Invite Code
                </button>
              )}
              {group.is_owner && (
                <Link
                  to={`/groups/${group.id}/members`}
                  className="btn btn-primary px-4 py-2 text-sm"
                >
                  Manage Members
                </Link>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="font-medium">{member.username}</div>
                    <div className="text-sm text-gray-500">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium">Rating: {member.rating}</div>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      member.role === 'owner' ? 'bg-blue-100 text-blue-800' :
                      member.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6">
        <Link to="/groups" className="btn btn-outline px-6 py-2">
          ← Back to Groups
        </Link>
      </div>

      {/* Group Chat */}
      {group && (
        <GroupChat 
          groupId={group.id}
          groupName={group.name}
          canChat={group.is_member || group.is_owner || group.is_manager}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Delete Group</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>{group.name}</strong>? This action cannot be undone and will:
            </p>
            <ul className="list-disc list-inside mb-6 text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Remove all {group.member_count} members from the group</li>
              <li>Delete all {group.contest_count || 0} contests in this group</li>
              <li>Remove all {group.problem_count || 0} problems associated with this group</li>
              <li>Delete all forum posts and discussions</li>
            </ul>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-outline px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteGroup()
                  setShowDeleteConfirm(false)
                }}
                className="btn bg-red-600 hover:bg-red-700 text-white px-4 py-2"
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupDetailPage