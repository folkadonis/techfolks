import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { contestsAPI } from '@services/api'
import { useAuthStore } from '@store/authStore'
import { useContestsStore } from '@store/contestsStore'
import toast from 'react-hot-toast'

interface Contest {
  id: number
  title: string
  description?: string
  contest_type: string
  start_time: string
  end_time: string
  is_public: boolean
  registration_open: boolean
  created_by: number
  created_at: string
  participants_count?: number
  problems_count?: number
  status?: 'upcoming' | 'running' | 'ended'
}

const ContestsPage = () => {
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'running' | 'ended'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const { user, isAuthenticated } = useAuthStore()
  const { contests: storedContests } = useContestsStore()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchContests()
  }, [storedContests])

  const fetchContests = async () => {
    try {
      setLoading(true)
      
      // Try to fetch from API
      let apiContests: Contest[] = []
      try {
        const response = await contestsAPI.getAll()
        apiContests = response.data
      } catch (error) {
        console.log('API not available, using local data')
      }
      
      // Combine API contests with stored contests
      const allContests = [...apiContests, ...storedContests]
      
      // Remove duplicates based on ID
      const uniqueContests = allContests.filter((contest, index, self) =>
        index === self.findIndex((c) => c.id === contest.id)
      )
      
      // Add status and mock data
      const contestsWithStatus = uniqueContests.map((contest: any) => ({
        ...contest,
        status: getContestStatus(contest.start_time, contest.end_time),
        participants_count: contest.participants_count || contest.participants || Math.floor(Math.random() * 500) + 10,
        problems_count: contest.problems_count || contest.problems?.length || Math.floor(Math.random() * 10) + 5,
        contest_type: contest.contest_type || contest.type || 'ACM-ICPC'
      }))
      
      setContests(contestsWithStatus)
    } catch (error: any) {
      console.error('Error fetching contests:', error)
      // If there's an error, at least show stored contests
      const contestsWithStatus = storedContests.map((contest: any) => ({
        ...contest,
        status: getContestStatus(contest.start_time, contest.end_time),
        participants_count: contest.participants || 0,
        problems_count: contest.problems?.length || 0,
        contest_type: contest.type || 'ACM-ICPC'
      }))
      setContests(contestsWithStatus)
    } finally {
      setLoading(false)
    }
  }

  const getContestStatus = (startTime: string, endTime: string): 'upcoming' | 'running' | 'ended' => {
    const now = new Date()
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    if (now < start) return 'upcoming'
    if (now >= start && now <= end) return 'running'
    return 'ended'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'running': return 'bg-green-100 text-green-800 border-green-200'
      case 'ended': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getContestTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'acm_icpc': return 'bg-purple-100 text-purple-800'
      case 'ioi': return 'bg-indigo-100 text-indigo-800'
      case 'atcoder': return 'bg-orange-100 text-orange-800'
      case 'codeforces': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${diffHours}h ${diffMinutes}m`
  }

  const filteredContests = contests.filter(contest => 
    filter === 'all' || contest.status === filter
  ).filter(contest => 
    !searchQuery || 
    contest.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    contest.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleRegister = async (contestId: number) => {
    if (!isAuthenticated) {
      toast.error('Please login to register for contests')
      return
    }

    try {
      await contestsAPI.register(contestId.toString())
      toast.success('Successfully registered for contest!')
      fetchContests() // Refresh to update participant count
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to register for contest')
    }
  }

  const handleDelete = async (contestId: number) => {
    if (!confirm('Are you sure you want to delete this contest? This action cannot be undone.')) {
      return
    }

    try {
      await contestsAPI.delete(contestId.toString())
      toast.success('Contest deleted successfully!')
      fetchContests() // Refresh the list
    } catch (error: any) {
      console.error('Error deleting contest:', error)
      toast.error(error.response?.data?.message || 'Failed to delete contest')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading contests...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Contests</h1>
        {isAdmin && (
          <Link
            to="/admin/create-contest"
            className="btn btn-primary px-4 py-2"
          >
            Create Contest
          </Link>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search contests by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full md:w-96 pl-10"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        {['all', 'upcoming', 'running', 'ended'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === filterOption
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </button>
        ))}
      </div>

      {filteredContests.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-foreground mb-2">No contests available</h3>
          <p className="text-muted-foreground">
            {filter === 'all' 
              ? (isAdmin ? 'Create your first contest to get started!' : 'Check back later for new contests.')
              : `No ${filter} contests at the moment.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContests.map((contest) => (
            <div key={contest.id} className="bg-card text-card-foreground rounded-lg shadow border border-border overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">
                        <Link 
                          to={`/contests/${contest.id}`}
                          className="hover:text-primary-600 dark:hover:text-primary-400"
                        >
                          {contest.title}
                        </Link>
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(contest.status!)}`}>
                        {contest.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getContestTypeColor(contest.contest_type)}`}>
                        {contest.contest_type.replace('_', '-')}
                      </span>
                      {!contest.is_public && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                          Private
                        </span>
                      )}
                    </div>
                    
                    {contest.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {contest.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Start:</span>
                        <div>{formatDateTime(contest.start_time)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span>
                        <div>{getDuration(contest.start_time, contest.end_time)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Problems:</span>
                        <div>{contest.problems_count}</div>
                      </div>
                      <div>
                        <span className="font-medium">Participants:</span>
                        <div>{contest.participants_count}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-6">
                    <Link
                      to={`/contests/${contest.id}`}
                      className="btn btn-outline px-4 py-2 text-sm"
                    >
                      View Contest
                    </Link>
                    
                    {contest.status === 'upcoming' && contest.registration_open && (
                      <button
                        onClick={() => handleRegister(contest.id)}
                        disabled={!isAuthenticated}
                        className="btn btn-primary px-4 py-2 text-sm"
                      >
                        Register
                      </button>
                    )}
                    
                    {contest.status === 'running' && (
                      <Link
                        to={`/contests/${contest.id}/participate`}
                        className="btn btn-primary px-4 py-2 text-sm"
                      >
                        Participate
                      </Link>
                    )}
                    
                    {contest.status === 'ended' && (
                      <Link
                        to={`/contests/${contest.id}/standings`}
                        className="btn btn-outline px-4 py-2 text-sm"
                      >
                        Final Standings
                      </Link>
                    )}

                    {isAdmin && (
                      <div className="flex space-x-2 mt-2">
                        <Link
                          to={`/admin/edit-contest/${contest.id}`}
                          className="btn btn-outline btn-sm px-3 py-1 text-xs"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(contest.id)}
                          className="btn bg-red-600 hover:bg-red-700 text-white btn-sm px-3 py-1 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VJudge-style Quick Stats */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Contest Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {contests.filter(c => c.status === 'upcoming').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Upcoming</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {contests.filter(c => c.status === 'running').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Running</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {contests.filter(c => c.status === 'ended').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Ended</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {contests.reduce((sum, c) => sum + (c.participants_count || 0), 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Participants</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContestsPage