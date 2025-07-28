import { useState, useEffect } from 'react'
import { useAuthStore } from '@store/authStore'
import { userAPI } from '@services/api'
import toast from 'react-hot-toast'

interface UserStats {
  problemsSolved: number
  contestsParticipated: number
  currentRating: number
  maxRating: number
  totalSubmissions: number
  acceptedSubmissions: number
  accuracyRate: number
  recentSubmissions: any[]
  solvedByDifficulty: {
    easy: number
    medium: number
    hard: number
  }
}

const ProfilePage = () => {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      setLoading(true)
      // Fetch user statistics
      const response = await userAPI.getProfile()
      
      // Calculate solved by difficulty (mock data for now)
      const solvedByDifficulty = {
        easy: Math.floor((response.data.problems_solved || 0) * 0.5),
        medium: Math.floor((response.data.problems_solved || 0) * 0.35),
        hard: Math.floor((response.data.problems_solved || 0) * 0.15),
      }
      
      const userStats: UserStats = {
        problemsSolved: response.data.problems_solved || 0,
        contestsParticipated: response.data.contests_participated_count || 0,
        currentRating: response.data.rating || 1200,
        maxRating: response.data.max_rating || response.data.rating || 1200,
        totalSubmissions: response.data.total_submissions || 0,
        acceptedSubmissions: response.data.accepted_submissions || 0,
        accuracyRate: response.data.total_submissions > 0 
          ? Math.round((response.data.accepted_submissions / response.data.total_submissions) * 100)
          : 0,
        recentSubmissions: response.data.recent_submissions || [],
        solvedByDifficulty
      }
      
      setStats(userStats)
    } catch (error) {
      console.error('Error fetching user stats:', error)
      // Use mock data if API fails
      setStats({
        problemsSolved: user?.problems_solved || 0,
        contestsParticipated: user?.contests_participated_count || 0,
        currentRating: user?.rating || 1200,
        maxRating: user?.max_rating || user?.rating || 1200,
        totalSubmissions: 0,
        acceptedSubmissions: 0,
        accuracyRate: 0,
        recentSubmissions: [],
        solvedByDifficulty: { easy: 0, medium: 0, hard: 0 }
      })
    } finally {
      setLoading(false)
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 2400) return 'text-red-600 dark:text-red-400'
    if (rating >= 2100) return 'text-orange-600 dark:text-orange-400'
    if (rating >= 1900) return 'text-purple-600 dark:text-purple-400'
    if (rating >= 1600) return 'text-blue-600 dark:text-blue-400'
    if (rating >= 1400) return 'text-cyan-600 dark:text-cyan-400'
    if (rating >= 1200) return 'text-green-600 dark:text-green-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getRatingTitle = (rating: number) => {
    if (rating >= 2400) return 'Grandmaster'
    if (rating >= 2100) return 'Master'
    if (rating >= 1900) return 'Expert'
    if (rating >= 1600) return 'Specialist'
    if (rating >= 1400) return 'Pupil'
    if (rating >= 1200) return 'Newbie'
    return 'Unrated'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Profile Header */}
      <div className="bg-card text-card-foreground rounded-lg shadow p-6 mb-6">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold text-primary">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{user?.username}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
            <div className="flex items-center mt-2 space-x-4">
              <span className={`font-semibold ${getRatingColor(stats?.currentRating || 1200)}`}>
                {getRatingTitle(stats?.currentRating || 1200)} ({stats?.currentRating})
              </span>
              {stats && stats.maxRating > stats.currentRating && (
                <span className="text-sm text-muted-foreground">
                  Max: {stats.maxRating}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-primary">{stats?.problemsSolved || 0}</div>
          <div className="text-sm text-muted-foreground mt-1">Problems Solved</div>
        </div>
        <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {stats?.contestsParticipated || 0}
          </div>
          <div className="text-sm text-muted-foreground mt-1">Contests</div>
        </div>
        <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats?.accuracyRate || 0}%
          </div>
          <div className="text-sm text-muted-foreground mt-1">Accuracy</div>
        </div>
        <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats?.totalSubmissions || 0}
          </div>
          <div className="text-sm text-muted-foreground mt-1">Submissions</div>
        </div>
      </div>

      {/* Problem Solving Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Difficulty Distribution */}
        <div className="bg-card text-card-foreground rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Problems by Difficulty</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Easy</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.solvedByDifficulty.easy || 0}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${Math.min((stats?.solvedByDifficulty.easy || 0) / Math.max(stats?.problemsSolved || 1, 1) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Medium</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.solvedByDifficulty.medium || 0}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${Math.min((stats?.solvedByDifficulty.medium || 0) / Math.max(stats?.problemsSolved || 1, 1) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-red-600 dark:text-red-400">Hard</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.solvedByDifficulty.hard || 0}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${Math.min((stats?.solvedByDifficulty.hard || 0) / Math.max(stats?.problemsSolved || 1, 1) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submission Stats */}
        <div className="bg-card text-card-foreground rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Submission Statistics</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded">
              <span className="text-sm font-medium">Total Submissions</span>
              <span className="font-semibold">{stats?.totalSubmissions || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Accepted
              </span>
              <span className="font-semibold text-green-700 dark:text-green-300">
                {stats?.acceptedSubmissions || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded">
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                Wrong/TLE/MLE
              </span>
              <span className="font-semibold text-red-700 dark:text-red-300">
                {(stats?.totalSubmissions || 0) - (stats?.acceptedSubmissions || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Actions */}
      <div className="mt-6 flex justify-end space-x-4">
        <button className="btn btn-outline">
          Edit Profile
        </button>
        <button className="btn btn-outline">
          Change Password
        </button>
      </div>
    </div>
  )
}

export default ProfilePage