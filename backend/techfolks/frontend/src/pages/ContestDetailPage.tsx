import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useContestsStore } from '@store/contestsStore'
import { useProblemsStore } from '@store/problemsStore'
import { useGroupsStore } from '@store/groupsStore'
import toast from 'react-hot-toast'

interface ContestProblem {
  code: string
  title: string
  difficulty: string
  solved: boolean
  attempts: number
}

const ContestDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { getContest, updateContest } = useContestsStore()
  const { getProblemByCode } = useProblemsStore()
  const { getGroup } = useGroupsStore()
  
  const [contest, setContest] = useState<any>(null)
  const [problems, setProblems] = useState<ContestProblem[]>([])
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [showEditTiming, setShowEditTiming] = useState(false)
  const [editedTiming, setEditedTiming] = useState({
    start_time: '',
    end_time: ''
  })

  useEffect(() => {
    if (id) {
      fetchContestData()
    }
  }, [id])

  useEffect(() => {
    // Update time remaining every second
    const timer = setInterval(() => {
      if (contest) {
        updateTimeRemaining()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [contest])

  const fetchContestData = () => {
    try {
      setLoading(true)
      
      // Get contest from store or mock data
      const storedContest = getContest(parseInt(id!))
      
      if (storedContest) {
        setContest(storedContest)
        setEditedTiming({
          start_time: storedContest.start_time,
          end_time: storedContest.end_time
        })
        
        // Load problems for this contest
        const contestProblems: ContestProblem[] = storedContest.problems.map((code: string) => {
          const problem = getProblemByCode(code)
          return {
            code,
            title: problem?.title || 'Unknown Problem',
            difficulty: problem?.difficulty || 'medium',
            solved: false,
            attempts: 0
          }
        })
        
        setProblems(contestProblems)
      } else {
        // Mock contest data
        const mockContest = {
          id: parseInt(id!),
          title: 'Sample Programming Contest',
          description: 'This is a sample contest to demonstrate the contest interface.',
          start_time: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
          end_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
          duration: 180, // 3 hours
          status: 'upcoming',
          problems: ['P-ABC123', 'P-DEF456', 'P-GHI789'],
          participants: 25,
          created_by: 'admin',
          created_at: new Date().toISOString(),
          is_public: true,
          rules: 'Standard ACM-ICPC rules apply. No communication with others during the contest.',
          type: 'ACM-ICPC'
        }
        
        setContest(mockContest)
        setEditedTiming({
          start_time: mockContest.start_time,
          end_time: mockContest.end_time
        })
        
        // Mock problems
        const mockProblems: ContestProblem[] = [
          { code: 'P-ABC123', title: 'Two Sum', difficulty: 'easy', solved: false, attempts: 0 },
          { code: 'P-DEF456', title: 'Longest Substring', difficulty: 'medium', solved: false, attempts: 0 },
          { code: 'P-GHI789', title: 'Binary Tree Path', difficulty: 'hard', solved: false, attempts: 0 }
        ]
        
        setProblems(mockProblems)
      }
      
      // Check if user is registered (mock)
      setIsRegistered(true)
      
    } catch (error) {
      console.error('Error fetching contest:', error)
      toast.error('Failed to load contest')
    } finally {
      setLoading(false)
    }
  }

  const updateTimeRemaining = () => {
    if (!contest) return

    const now = new Date()
    const start = new Date(contest.start_time)
    const end = new Date(contest.end_time)

    if (now < start) {
      // Contest hasn't started
      const diff = start.getTime() - now.getTime()
      setTimeRemaining(`Starts in ${formatTimeDiff(diff)}`)
    } else if (now >= start && now < end) {
      // Contest is running
      const diff = end.getTime() - now.getTime()
      setTimeRemaining(`Ends in ${formatTimeDiff(diff)}`)
      if (contest.status !== 'running') {
        setContest({ ...contest, status: 'running' })
      }
    } else {
      // Contest ended
      setTimeRemaining('Contest Ended')
      if (contest.status !== 'ended') {
        setContest({ ...contest, status: 'ended' })
      }
    }
  }

  const formatTimeDiff = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    return `${hours}h ${minutes}m ${seconds}s`
  }

  const handleRegister = () => {
    if (!isAuthenticated) {
      toast.error('Please login to register for contests')
      navigate('/login')
      return
    }

    setIsRegistered(true)
    toast.success('Successfully registered for the contest!')
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'running': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'ended': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const handleUpdateTiming = (e: React.FormEvent) => {
    e.preventDefault()
    
    const start = new Date(editedTiming.start_time)
    const end = new Date(editedTiming.end_time)
    
    if (start >= end) {
      toast.error('End time must be after start time')
      return
    }
    
    if (end <= new Date() && contest.status !== 'ended') {
      toast.error('Cannot set end time in the past')
      return
    }
    
    // Calculate new duration in minutes
    const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
    
    // Update contest
    const updatedContest = {
      ...contest,
      start_time: editedTiming.start_time,
      end_time: editedTiming.end_time,
      duration
    }
    
    updateContest(contest.id, updatedContest)
    setContest(updatedContest)
    setShowEditTiming(false)
    toast.success('Contest timing updated successfully!')
  }

  // Check if user is the owner of any of the contest's groups
  const isGroupOwner = () => {
    if (!contest.group_ids || contest.group_ids.length === 0) return false
    return contest.group_ids.some(groupId => {
      const group = getGroup(groupId)
      return group && group.is_owner
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading contest...</div>
      </div>
    )
  }

  if (!contest) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-foreground mb-2">Contest Not Found</h3>
        <p className="text-muted-foreground">The contest you're looking for doesn't exist.</p>
      </div>
    )
  }

  const canViewProblems = contest.status === 'running' && isRegistered

  return (
    <div className="max-w-6xl mx-auto">
      {/* Contest Header */}
      <div className="bg-card text-card-foreground rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{contest.title}</h1>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(contest.status)}`}>
                {contest.status}
              </span>
            </div>
            
            <p className="text-muted-foreground mb-4">
              {contest.description}
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <div className="font-medium">{contest.type}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Duration</span>
                <div className="font-medium">{contest.duration} minutes</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Problems</span>
                <div className="font-medium">{problems.length}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Participants</span>
                <div className="font-medium">{contest.participants}</div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Time</span>
                <div className="font-medium text-primary-600">{timeRemaining}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Start: {new Date(contest.start_time).toLocaleString()}</span>
              <span>•</span>
              <span>End: {new Date(contest.end_time).toLocaleString()}</span>
              <span>•</span>
              <span>Created by {contest.created_by}</span>
            </div>
            
            {contest.group_ids && contest.group_ids.length > 0 && (
              <div className="mt-2">
                <span className="text-sm text-muted-foreground">Groups: </span>
                {contest.group_ids.map((groupId, index) => {
                  const group = getGroup(groupId)
                  return group ? (
                    <Link
                      key={groupId}
                      to={`/groups/${groupId}`}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      {group.name}{index < contest.group_ids.length - 1 ? ', ' : ''}
                    </Link>
                  ) : null
                })}
              </div>
            )}
            
            {isGroupOwner() && (
              <button
                onClick={() => setShowEditTiming(true)}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                ✏️ Edit Contest Timing
              </button>
            )}
          </div>
          
          <div className="ml-6">
            {contest.status === 'upcoming' && !isRegistered && (
              <button
                onClick={handleRegister}
                className="btn btn-primary px-6 py-2"
              >
                Register
              </button>
            )}
            {contest.status === 'upcoming' && isRegistered && (
              <div className="text-center">
                <div className="text-green-600 font-medium mb-2">✓ Registered</div>
                <p className="text-sm text-muted-foreground">You're ready to participate</p>
              </div>
            )}
            {contest.status === 'running' && isRegistered && (
              <Link
                to="/leaderboard"
                className="btn btn-outline px-6 py-2"
              >
                View Leaderboard
              </Link>
            )}
            {contest.status === 'ended' && (
              <Link
                to="/leaderboard"
                className="btn btn-primary px-6 py-2"
              >
                View Results
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Contest Rules */}
      {contest.rules && (
        <div className="bg-card text-card-foreground rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Contest Rules</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {contest.rules}
          </p>
        </div>
      )}

      {/* Problems List */}
      <div className="bg-card text-card-foreground rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold">Contest Problems</h2>
          {contest.status === 'upcoming' && (
            <p className="text-sm text-muted-foreground mt-1">Problems will be visible when the contest starts</p>
          )}
          {contest.status === 'running' && !isRegistered && (
            <p className="text-sm text-muted-foreground mt-1">Register to view and solve problems</p>
          )}
        </div>
        
        {canViewProblems ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Problem Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Problem Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {problems.map((problem, index) => (
                  <tr key={problem.code} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {String.fromCharCode(65 + index)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {problem.code}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">
                        {problem.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {problem.solved ? (
                        <span className="text-green-600 font-medium">✓ Solved</span>
                      ) : problem.attempts > 0 ? (
                        <span className="text-yellow-600">Attempted ({problem.attempts})</span>
                      ) : (
                        <span className="text-muted-foreground">Not attempted</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/problems/${problem.code}/contest/${contest.id}`}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Solve
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">🔒</div>
            <p className="text-muted-foreground">
              {contest.status === 'upcoming' 
                ? 'Problems will be unlocked when the contest starts' 
                : 'Register to view and solve contest problems'}
            </p>
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-outline px-6 py-2"
        >
          ← Back
        </button>
      </div>

      {/* Edit Timing Modal */}
      {showEditTiming && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card text-card-foreground rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Edit Contest Timing</h3>
            <form onSubmit={handleUpdateTiming}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editedTiming.start_time.slice(0, 16)}
                    onChange={(e) => setEditedTiming({
                      ...editedTiming,
                      start_time: new Date(e.target.value).toISOString()
                    })}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editedTiming.end_time.slice(0, 16)}
                    onChange={(e) => setEditedTiming({
                      ...editedTiming,
                      end_time: new Date(e.target.value).toISOString()
                    })}
                    className="input w-full"
                    required
                  />
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Changing contest timing will affect all participants. 
                    {contest.status === 'running' && ' The contest is currently running.'}
                    {contest.status === 'ended' && ' This contest has already ended.'}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTiming(false)
                    setEditedTiming({
                      start_time: contest.start_time,
                      end_time: contest.end_time
                    })
                  }}
                  className="btn btn-outline px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4 py-2"
                >
                  Update Timing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContestDetailPage