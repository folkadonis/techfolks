import { useState, useEffect } from 'react'
import { useAuthStore } from '@store/authStore'
import { leaderboardAPI } from '@services/api'
import toast from 'react-hot-toast'

interface LeaderboardUser {
  id: number
  username: string
  rating: number
  max_rating: number
  problems_solved: number
  contests_participated: number
  rank: number
  profile_picture?: string
  country?: string
  badge?: string
  achievements: string[]
  last_active: string
}

const LeaderboardPage = () => {
  const { user } = useAuthStore()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [timeFrame, setTimeFrame] = useState<'all-time' | 'monthly' | 'weekly'>('all-time')
  const [category, setCategory] = useState<'rating' | 'problems' | 'contests'>('rating')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchLeaderboard()
  }, [timeFrame, category])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      
      let apiCall;
      const params = {
        timeFrame,
        category,
        search: searchQuery || undefined,
        limit: 50
      };
      
      switch (timeFrame) {
        case 'weekly':
          apiCall = leaderboardAPI.getWeekly(params)
          break
        case 'monthly':
          apiCall = leaderboardAPI.getMonthly(params)
          break
        default:
          apiCall = leaderboardAPI.getGlobal(params)
      }
      
      const response = await apiCall
      
      // Map API response to our interface
      const mappedUsers: LeaderboardUser[] = response.users.map((user: any, index: number) => ({
        id: user.id,
        username: user.username,
        rating: user.rating || 1200,
        max_rating: user.max_rating || user.rating || 1200,
        problems_solved: user.problems_solved || 0,
        contests_participated: user.contests_participated || 0,
        rank: user.rank || index + 1,
        country: user.country,
        badge: user.badge || getRatingBadge(user.rating || 1200),
        achievements: user.achievements || [],
        last_active: user.last_active || new Date().toISOString(),
        profile_picture: user.avatar_url
      }))
      
      setLeaderboard(mappedUsers)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      toast.error('Failed to load leaderboard')
      
      // Fallback to empty array on error
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }
  
  const getRatingBadge = (rating: number): string => {
    if (rating >= 2400) return 'Grandmaster'
    if (rating >= 2100) return 'Master'
    if (rating >= 1900) return 'Candidate Master'
    if (rating >= 1600) return 'Expert'
    if (rating >= 1400) return 'Specialist'
    return 'Pupil'
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 2400) return 'text-red-600 dark:text-red-400'
    if (rating >= 2100) return 'text-orange-600 dark:text-orange-400'
    if (rating >= 1900) return 'text-purple-600 dark:text-purple-400'
    if (rating >= 1600) return 'text-blue-600 dark:text-blue-400'
    if (rating >= 1400) return 'text-green-600 dark:text-green-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Grandmaster': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'Master': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'Candidate Master': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'Expert': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'Specialist': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const filteredLeaderboard = leaderboard.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const currentUserRank = leaderboard.find(u => u.username === user?.username)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Global Leaderboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Compete with programmers from around the world
        </p>
      </div>

      {/* Current User Stats */}
      {currentUserRank && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-lg p-6 mb-6 border border-primary-200 dark:border-primary-700">
          <h3 className="text-lg font-semibold mb-3">Your Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {getRankIcon(currentUserRank.rank)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Global Rank</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getRatingColor(currentUserRank.rating)}`}>
                {currentUserRank.rating}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Current Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentUserRank.problems_solved}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Problems Solved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentUserRank.contests_participated}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Contests</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Time Frame</label>
              <select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as any)}
                className="input-sm"
              >
                <option value="all-time">All Time</option>
                <option value="monthly">This Month</option>
                <option value="weekly">This Week</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="input-sm"
              >
                <option value="rating">Rating</option>
                <option value="problems">Problems Solved</option>
                <option value="contests">Contests Participated</option>
              </select>
            </div>
          </div>
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium mb-1">Search User</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              className="input w-full"
            />
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Problems
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Badge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500">Loading leaderboard...</div>
                  </td>
                </tr>
              ) : filteredLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500">No users found</div>
                  </td>
                </tr>
              ) : (
                filteredLeaderboard.map((leaderUser) => (
                  <tr 
                    key={leaderUser.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      leaderUser.username === user?.username ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-medium">
                        {getRankIcon(leaderUser.rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mr-3">
                          <span className="text-primary-600 dark:text-primary-400 font-semibold">
                            {leaderUser.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {leaderUser.username}
                            {leaderUser.username === user?.username && (
                              <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">(You)</span>
                            )}
                          </div>
                          {leaderUser.country && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {leaderUser.country}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`font-semibold ${getRatingColor(leaderUser.rating)}`}>
                        {leaderUser.rating}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Max: {leaderUser.max_rating}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                      {leaderUser.problems_solved}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">
                      {leaderUser.contests_participated}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {leaderUser.badge && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBadgeColor(leaderUser.badge)}`}>
                          {leaderUser.badge}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(leaderUser.last_active).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Achievement Legends */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Rating System</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm">Grandmaster (2400+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span className="text-sm">Master (2100+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            <span className="text-sm">Candidate Master (1900+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span className="text-sm">Expert (1600+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-sm">Specialist (1400+)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
            <span className="text-sm">Pupil (&lt;1400)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeaderboardPage