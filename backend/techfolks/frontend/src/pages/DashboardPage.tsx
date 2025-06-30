import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { dashboardAPI } from '@services/api'

interface DashboardStats {
  problemsSolved: number
  contestsParticipated: number
  currentRating: number
  maxRating: number
  totalSubmissions: number
  acceptedSubmissions: number
  recentContests: any[]
  recentSubmissions: any[]
  upcomingContests: any[]
}

const DashboardPage = () => {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Always load dashboard data, even without user
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const data = await dashboardAPI.getStats()
      setStats(data)
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'Accepted': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'Wrong Answer': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'Time Limit Exceeded': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      case 'Compilation Error': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
      default: return 'text-muted-foreground bg-muted border-border'
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 2100) return 'text-red-600 dark:text-red-400'
    if (rating >= 1900) return 'text-orange-600 dark:text-orange-400'
    if (rating >= 1600) return 'text-purple-600 dark:text-purple-400'
    if (rating >= 1400) return 'text-blue-600 dark:text-blue-400'
    if (rating >= 1200) return 'text-green-600 dark:text-green-400'
    return 'text-muted-foreground'
  }

  const getRatingTitle = (rating: number) => {
    if (rating >= 2100) return 'Master'
    if (rating >= 1900) return 'Candidate Master'
    if (rating >= 1600) return 'Expert'
    if (rating >= 1400) return 'Specialist'
    if (rating >= 1200) return 'Pupil'
    return 'Newbie'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-muted-foreground mb-2">Failed to load dashboard</h3>
        <p className="text-muted-foreground">Please try refreshing the page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow text-white p-6">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.username}!</h1>
        <p className="text-blue-100">Ready to solve some problems today?</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            {stats.problemsSolved}
          </div>
          <div className="text-sm text-muted-foreground">Problems Solved</div>
        </div>

        <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            {stats.contestsParticipated}
          </div>
          <div className="text-sm text-muted-foreground">Contests Participated</div>
        </div>

        <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
          <div className={`text-3xl font-bold mb-2 ${getRatingColor(stats.currentRating)}`}>
            {stats.currentRating}
          </div>
          <div className="text-sm text-muted-foreground">
            {getRatingTitle(stats.currentRating)}
          </div>
        </div>

        <div className="bg-card text-card-foreground rounded-lg shadow p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            {Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100)}%
          </div>
          <div className="text-sm text-muted-foreground">
            Success Rate ({stats.acceptedSubmissions}/{stats.totalSubmissions})
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Submissions */}
        <div className="bg-card text-card-foreground rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">Recent Submissions</h2>
              <Link 
                to="/submissions" 
                className="text-primary-600 hover:text-primary-800 text-sm"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="divide-y divide-border">
            {stats.recentSubmissions.map((submission, index) => (
              <div key={index} className="px-6 py-4 hover:bg-muted">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {submission.problem}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {submission.time} • {submission.language}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getVerdictColor(submission.verdict)}`}>
                    {submission.verdict}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Contests */}
        <div className="bg-card text-card-foreground rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-foreground">Upcoming Contests</h2>
              <Link 
                to="/contests" 
                className="text-primary-600 hover:text-primary-800 text-sm"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="divide-y divide-border">
            {stats.upcomingContests.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No upcoming contests
              </div>
            ) : (
              stats.upcomingContests.map((contest, index) => (
                <div key={index} className="px-6 py-4 hover:bg-muted">
                  <div className="font-medium text-foreground mb-1">
                    <Link 
                      to={`/contests/${contest.id}`}
                      className="hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      {contest.title}
                    </Link>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(contest.start_time).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {contest.contest_type.replace('_', '-')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rating Chart Placeholder */}
      <div className="bg-card text-card-foreground rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Rating Progress</h2>
        <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-xl mb-2">📈</div>
            <div>Rating chart will be implemented here</div>
            <div className="text-sm mt-2">
              Current: {stats.currentRating} | Max: {stats.maxRating}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card text-card-foreground rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/problems"
            className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="text-blue-600 dark:text-blue-400 text-xl mr-3">🧩</div>
            <div>
              <div className="font-medium text-foreground">Solve Problems</div>
              <div className="text-sm text-muted-foreground">Practice coding problems</div>
            </div>
          </Link>

          <Link
            to="/contests"
            className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <div className="text-green-600 dark:text-green-400 text-xl mr-3">🏆</div>
            <div>
              <div className="font-medium text-foreground">Join Contests</div>
              <div className="text-sm text-muted-foreground">Compete with others</div>
            </div>
          </Link>

          <Link
            to="/leaderboard"
            className="flex items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <div className="text-purple-600 dark:text-purple-400 text-xl mr-3">📊</div>
            <div>
              <div className="font-medium text-foreground">View Rankings</div>
              <div className="text-sm text-muted-foreground">Check your rank</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage