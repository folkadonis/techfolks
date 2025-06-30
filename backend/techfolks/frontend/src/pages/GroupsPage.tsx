import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useGroupsStore } from '@store/groupsStore'
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
  is_manager: boolean
  contest_count?: number
  problem_count?: number
  badges?: string[]
  managers?: string[] // List of manager usernames
}

const GroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [activeTab, setActiveTab] = useState<'browse' | 'my-groups'>('my-groups')
  const [searchQuery, setSearchQuery] = useState('')
  const { user, isAuthenticated } = useAuthStore()
  const { groups: storedGroups, deleteGroup } = useGroupsStore()
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  useEffect(() => {
    // Load mock data immediately
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
        is_manager: false,
        contest_count: 12,
        problem_count: 150,
        badges: ['University', 'Official'],
        managers: ['teaching_assistant', 'senior_student']
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
        is_manager: user?.username === 'admin',
        contest_count: 25,
        problem_count: 300,
        badges: ['Training', 'ACM-ICPC'],
        managers: ['assistant_coach']
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
        is_manager: false,
        contest_count: 8,
        problem_count: 120,
        badges: ['Elite', 'Advanced'],
        managers: []
      }
    ]

    const mockMyGroups: Group[] = [
      {
        id: 4,
        name: 'My Contest Training Group',
        description: 'Personal group for organizing practice contests, curating problem collections, and tracking improvement in competitive programming.',
        invite_code: 'MYCP2024',
        is_private: true,
        owner_id: user?.id ? parseInt(user.id) : 5,
        owner_name: user?.username || 'admin',
        member_count: 8,
        created_at: '2024-06-01T10:00:00Z',
        is_member: true,
        is_owner: true,
        is_manager: true,
        contest_count: 5,
        problem_count: 75,
        badges: ['Personal', 'Training'],
        managers: []
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
        is_manager: false,
        contest_count: 25,
        problem_count: 300,
        badges: ['Training', 'ACM-ICPC']
      }
    ]

    // Combine mock groups with stored groups
    const allGroups = [...mockGroups, ...storedGroups]
    setGroups(allGroups)
    
    // Filter groups where user is a member/owner
    const userGroups = [...mockMyGroups, ...storedGroups.filter(g => g.is_member || g.is_owner)]
    setMyGroups(userGroups)
  }, [user, storedGroups])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleDeleteGroup = (groupId: number) => {
    deleteGroup(groupId)
    // Update local state
    setGroups(prev => prev.filter(g => g.id !== groupId))
    setMyGroups(prev => prev.filter(g => g.id !== groupId))
    setDeleteConfirmId(null)
    toast.success('Group deleted successfully')
  }

  // Show limited functionality for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Groups</h1>
            <p className="text-muted-foreground mt-1">
              Collaborative spaces for hosting contests, curating problems, and training together
            </p>
          </div>
          <Link to="/login" className="btn btn-primary px-4 py-2">
            Login to Create Group
          </Link>
        </div>

        {/* Show public groups only */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Public Groups</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.filter(g => !g.is_private).map((group) => (
              <div key={group.id} className="bg-card rounded-lg shadow border border-border p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{group.name}</h3>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {group.badges?.map((badge, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {group.description && (
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {group.description}
                  </p>
                )}

                {/* VJudge-style stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {group.member_count}
                    </div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {group.contest_count || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Contests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {group.problem_count || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Problems</div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                  <div>
                    by <span className="font-medium">{group.owner_name}</span>
                  </div>
                  <div>
                    {formatDate(group.created_at)}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Code: <span className="font-mono bg-muted px-1 rounded">{group.invite_code}</span>
                  </div>
                  <div className="space-x-2">
                    <Link
                      to={`/groups/${group.id}`}
                      className="btn btn-outline px-3 py-1 text-sm"
                    >
                      View
                    </Link>
                    <Link
                      to="/login"
                      className="btn btn-primary px-3 py-1 text-sm"
                    >
                      Login to Join
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-muted-foreground mt-1">
            Collaborative spaces for hosting contests, curating problems, and training together
          </p>
        </div>
        <div className="flex space-x-2">
          <Link
            to="/groups/join"
            className="btn btn-outline px-4 py-2"
          >
            Join with Code
          </Link>
          <Link
            to="/groups/create"
            className="btn btn-primary px-4 py-2"
          >
            Create Group
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search groups by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full md:w-96 pl-10"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        {[
          { key: 'my-groups', label: 'My Groups' },
          { key: 'browse', label: 'Browse Groups' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
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
          </div>

          {myGroups.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-4">Create or join a group to start collaborating!</p>
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
              {myGroups.filter(group => 
                !searchQuery || 
                group.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                group.description?.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((group) => (
                <div key={group.id} className="bg-card rounded-lg shadow border border-border p-6">
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
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded">Owner</span>
                        )}
                        {group.is_manager && !group.is_owner && (
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 rounded">Manager</span>
                        )}
                        {group.is_private && (
                          <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded">Private</span>
                        )}
                        {group.badges?.map((badge, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {group.description && (
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {group.description}
                    </p>
                  )}

                  {/* VJudge-style stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {group.member_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {group.contest_count || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Contests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {group.problem_count || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Problems</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                    <div>
                      by <span className="font-medium">{group.owner_name}</span>
                    </div>
                    <div>
                      {formatDate(group.created_at)}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      Code: <span className="font-mono bg-muted px-1 rounded">{group.invite_code}</span>
                    </div>
                    <div className="space-x-2">
                      <Link
                        to={`/groups/${group.id}`}
                        className="btn btn-outline px-3 py-1 text-sm"
                      >
                        View
                      </Link>
                      {group.is_owner && (
                        <>
                          <Link
                            to={`/groups/${group.id}/members`}
                            className="btn btn-primary px-3 py-1 text-sm"
                          >
                            Members
                          </Link>
                          <Link
                            to={`/groups/${group.id}/edit`}
                            className="btn btn-outline px-3 py-1 text-sm"
                          >
                            Edit
                          </Link>
                        </>
                      )}
                      {group.is_manager && !group.is_owner && (
                        <Link
                          to={`/groups/${group.id}/moderate`}
                          className="btn btn-outline px-3 py-1 text-sm text-purple-600 border-purple-600"
                        >
                          Moderate
                        </Link>
                      )}
                      {user?.role === 'admin' && (
                        <>
                          <Link
                            to={`/groups/${group.id}/manage`}
                            className="btn btn-outline px-3 py-1 text-sm text-orange-600 border-orange-600"
                          >
                            Manage
                          </Link>
                          <button
                            onClick={() => setDeleteConfirmId(group.id)}
                            className="btn btn-outline px-3 py-1 text-sm text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                          >
                            Delete
                          </button>
                        </>
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
            {groups.filter(g => !g.is_private && !g.is_member).filter(group => 
              !searchQuery || 
              group.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              group.description?.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((group) => (
              <div key={group.id} className="bg-card rounded-lg shadow border border-border p-6">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{group.name}</h3>
                    
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {group.is_member && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded">Joined</span>
                      )}
                      {group.badges?.map((badge, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {group.description && (
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {group.description}
                  </p>
                )}

                {/* VJudge-style stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {group.member_count}
                    </div>
                    <div className="text-xs text-muted-foreground">Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {group.contest_count || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Contests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {group.problem_count || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Problems</div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                  <div>
                    by <span className="font-medium">{group.owner_name}</span>
                  </div>
                  <div>
                    {formatDate(group.created_at)}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Code: <span className="font-mono bg-muted px-1 rounded">{group.invite_code}</span>
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
                        className="btn btn-primary px-3 py-1 text-sm"
                      >
                        Join
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => setDeleteConfirmId(group.id)}
                        className="btn btn-outline px-3 py-1 text-sm text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4 text-red-600">Delete Group</h3>
            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete this group? This action cannot be undone and will remove all associated data including members, contests, problems, and forum posts.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn btn-outline px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteGroup(deleteConfirmId)}
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

export default GroupsPage