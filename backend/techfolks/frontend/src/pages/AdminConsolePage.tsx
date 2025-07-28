import { useState, useEffect } from 'react'
import { useAuthStore } from '@store/authStore'
import { useGroupsStore } from '@store/groupsStore'
import { useProblemsStore } from '@store/problemsStore'
import { useContestsStore } from '@store/contestsStore'
import { Navigate } from 'react-router-dom'
import { adminAPI } from '@services/api'
import toast from 'react-hot-toast'

interface SystemStats {
  total_users: number
  active_users: number
  admin_users: number
  verified_users: number
  total_problems: number
  total_contests: number
  total_submissions: number
  server_uptime: number
  memory_usage: number
  cpu_usage: number
}

interface User {
  id: string
  username: string
  email: string
  full_name?: string
  role: 'admin' | 'user' | 'problem_setter' | 'moderator'
  rating: number
  max_rating: number
  problems_solved: number
  contests_participated_count: number
  created_at: string
  last_login?: string
  is_banned: boolean
  is_verified: boolean
  is_active: boolean
}

const AdminConsolePage = () => {
  const { user } = useAuthStore()
  const { groups, deleteGroup } = useGroupsStore()
  const { problems, deleteProblem } = useProblemsStore()
  const { contests, deleteContest } = useContestsStore()
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'content' | 'system'>('dashboard')
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Redirect if not admin
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  useEffect(() => {
    fetchSystemStats()
    fetchUsers()
  }, [])

  const fetchSystemStats = async () => {
    try {
      const response = await adminAPI.getSystemStats()
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching system stats:', error)
      toast.error('Error loading system statistics')
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers()
      setUsers(response.data?.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Error loading users')
    }
  }

  const handleBanUser = async (userId: string, ban: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${ban ? 'ban' : 'unban'}`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, is_banned: ban } : u))
        toast.success(`User ${ban ? 'banned' : 'unbanned'} successfully`)
      } else {
        toast.error(`Failed to ${ban ? 'ban' : 'unban'} user`)
      }
    } catch (error) {
      console.error(`Error ${ban ? 'banning' : 'unbanning'} user:`, error)
      toast.error(`Error ${ban ? 'banning' : 'unbanning'} user`)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId))
        toast.success('User deleted successfully')
      } else {
        toast.error('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Error deleting user')
    }
  }

  const handlePromoteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to promote this user to admin?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/promote`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: 'admin' as const } : u))
        toast.success('User promoted to admin')
      } else {
        toast.error('Failed to promote user')
      }
    } catch (error) {
      console.error('Error promoting user:', error)
      toast.error('Error promoting user')
    }
  }

  const handleBulkAction = (action: 'ban' | 'unban' | 'delete') => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first')
      return
    }

    const actionText = action === 'delete' ? 'delete' : action
    if (confirm(`Are you sure you want to ${actionText} ${selectedUsers.length} selected users?`)) {
      if (action === 'delete') {
        setUsers(users.filter(u => !selectedUsers.includes(u.id)))
      } else {
        setUsers(users.map(u => 
          selectedUsers.includes(u.id) ? { ...u, is_banned: action === 'ban' } : u
        ))
      }
      setSelectedUsers([])
      toast.success(`Selected users ${actionText === 'delete' ? 'deleted' : actionText + 'ned'} successfully`)
    }
  }

  const handleDeleteGroup = (groupId: number) => {
    if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      deleteGroup(groupId)
      toast.success('Group deleted successfully')
    }
  }

  const handleDeleteProblem = (problemId: number) => {
    if (confirm('Are you sure you want to delete this problem? This action cannot be undone.')) {
      deleteProblem(problemId)
      toast.success('Problem deleted successfully')
    }
  }

  const handleDeleteContest = (contestId: number) => {
    if (confirm('Are you sure you want to delete this contest? This action cannot be undone.')) {
      deleteContest(contestId)
      toast.success('Contest deleted successfully')
    }
  }

  const clearAllData = async () => {
    if (confirm('Are you sure you want to clear ALL data? This will delete all users, groups, problems, and contests. This action cannot be undone.')) {
      if (confirm('This is your final warning. This will permanently delete ALL data. Are you absolutely sure?')) {
        try {
          await adminAPI.clearData()
          toast.success('All data cleared successfully')
          window.location.href = '/login'
        } catch (error) {
          console.error('Error clearing data:', error)
          toast.error('Error clearing data')
        }
      }
    }
  }

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Console</h1>
        <p className="text-muted-foreground">
          Master control panel for TechFolks platform
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'users', label: 'User Management', icon: '👥' },
          { id: 'content', label: 'Content Management', icon: '📝' },
          { id: 'system', label: 'System Controls', icon: '⚙️' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'bg-card text-card-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {stats.total_users.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.active_users.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats.total_problems}
              </div>
              <div className="text-sm text-muted-foreground">Problems</div>
            </div>
            <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {stats.total_submissions.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Submissions</div>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-card text-card-foreground rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">System Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <span className="text-sm text-muted-foreground">{stats.memory_usage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${stats.memory_usage}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">CPU Usage</span>
                  <span className="text-sm text-muted-foreground">{stats.cpu_usage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${stats.cpu_usage}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Server Uptime</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {Math.round(stats.server_uptime)}s
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-card text-card-foreground rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-muted rounded">
                <span className="text-green-600">✅</span>
                <span className="text-sm">User 'john_doe' solved problem 'Two Sum'</span>
                <span className="text-xs text-muted-foreground ml-auto">2 minutes ago</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted rounded">
                <span className="text-blue-600">👥</span>
                <span className="text-sm">New group 'Algorithm Study Group' created</span>
                <span className="text-xs text-muted-foreground ml-auto">15 minutes ago</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted rounded">
                <span className="text-purple-600">🏆</span>
                <span className="text-sm">Contest 'Weekly Challenge #42' started</span>
                <span className="text-xs text-muted-foreground ml-auto">1 hour ago</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* User Controls */}
          <div className="bg-card text-card-foreground rounded-lg shadow p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">User Management</h3>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="input"
                />
                <button
                  onClick={() => handleBulkAction('ban')}
                  className="btn btn-outline px-3 py-2 text-sm"
                >
                  Ban Selected
                </button>
                <button
                  onClick={() => handleBulkAction('unban')}
                  className="btn btn-outline px-3 py-2 text-sm"
                >
                  Unban Selected
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="btn bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-sm"
                >
                  Delete Selected
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(filteredUsers.map(u => u.id))
                          } else {
                            setSelectedUsers([])
                          }
                        }}
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Problems</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((userData) => (
                    <tr key={userData.id} className={userData.is_banned ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(userData.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, userData.id])
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== userData.id))
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium">{userData.username}</div>
                          <div className="text-sm text-muted-foreground">{userData.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userData.role === 'admin' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {userData.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-medium">{userData.rating}</td>
                      <td className="px-4 py-4">{userData.problems_solved}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userData.is_banned 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {userData.is_banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex space-x-2">
                          {userData.role !== 'admin' && (
                            <button
                              onClick={() => handlePromoteUser(userData.id)}
                              className="btn btn-outline px-2 py-1 text-xs"
                            >
                              Promote
                            </button>
                          )}
                          <button
                            onClick={() => handleBanUser(userData.id, !userData.is_banned)}
                            className={`btn px-2 py-1 text-xs ${
                              userData.is_banned 
                                ? 'btn-outline' 
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                            }`}
                          >
                            {userData.is_banned ? 'Unban' : 'Ban'}
                          </button>
                          {userData.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(userData.id)}
                              className="btn bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Content Management Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Groups Management */}
          <div className="bg-card text-card-foreground rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Groups ({groups.length})</h3>
            <div className="space-y-3">
              {groups.length === 0 ? (
                <p className="text-muted-foreground">No groups created yet</p>
              ) : (
                groups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {group.member_count} members • Code: {group.invite_code}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Problems Management */}
          <div className="bg-card text-card-foreground rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Problems ({problems.length})</h3>
            <div className="space-y-3">
              {problems.length === 0 ? (
                <p className="text-muted-foreground">No problems created yet</p>
              ) : (
                problems.map((problem) => (
                  <div key={problem.id} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div>
                      <div className="font-medium">{problem.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {problem.code} • {problem.difficulty} • {problem.solved_count} solved
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteProblem(problem.id)}
                      className="btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Contests Management */}
          <div className="bg-card text-card-foreground rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Contests ({contests.length})</h3>
            <div className="space-y-3">
              {contests.length === 0 ? (
                <p className="text-muted-foreground">No contests created yet</p>
              ) : (
                contests.map((contest) => (
                  <div key={contest.id} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div>
                      <div className="font-medium">{contest.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {contest.participant_count} participants • {contest.is_public ? 'Public' : 'Private'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteContest(contest.id)}
                      className="btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* System Controls Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Danger Zone */}
          <div className="bg-card text-card-foreground rounded-lg shadow p-6 border-2 border-red-200 dark:border-red-800">
            <h3 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">⚠️ Danger Zone</h3>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h4 className="font-medium text-red-800 dark:text-red-400 mb-2">Clear All Data</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  This will permanently delete ALL users, groups, problems, contests, and system data. 
                  This action cannot be undone.
                </p>
                <button
                  onClick={clearAllData}
                  className="btn bg-red-600 hover:bg-red-700 text-white px-4 py-2"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>

          {/* Storage Management */}
          <div className="bg-card text-card-foreground rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Storage Management</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <div className="font-medium">Browser Cache</div>
                  <div className="text-sm text-muted-foreground">Clear browser cache and refresh</div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Clear browser cache? This will refresh the page.')) {
                      window.location.reload()
                    }
                  }}
                  className="btn btn-outline px-3 py-2 text-sm"
                >
                  Refresh Cache
                </button>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-card text-card-foreground rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded">
                <div className="font-medium">Platform Version</div>
                <div className="text-sm text-muted-foreground">TechFolks v1.0.0</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="font-medium">Environment</div>
                <div className="text-sm text-muted-foreground">Development</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="font-medium">Database</div>
                <div className="text-sm text-muted-foreground">PostgreSQL</div>
              </div>
              <div className="p-3 bg-muted rounded">
                <div className="font-medium">Last Backup</div>
                <div className="text-sm text-muted-foreground">Never (Dev Mode)</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminConsolePage