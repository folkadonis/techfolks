import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useProblemsStore } from '@store/problemsStore'
import { problemsAPI } from '@services/api'
import toast from 'react-hot-toast'

interface Problem {
  id: number
  code: string
  title: string
  difficulty: string
  time_limit: number
  memory_limit: number
  is_public: boolean
  created_at: string
  solved_count?: number
  attempted_count?: number
  tags?: string[]
}

const ProblemsPage = () => {
  const [problems, setProblems] = useState<Problem[]>([])
  const [recommendedProblems, setRecommendedProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'recommended' | 'solved' | 'unsolved'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const { user } = useAuthStore()
  const { problems: storedProblems } = useProblemsStore()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    fetchProblems()
    if (user) {
      generateRecommendations()
    }
  }, [user, storedProblems])

  const fetchProblems = async () => {
    try {
      setLoading(true)
      
      const data = await problemsAPI.getAll()
      setProblems(data.problems || [])
    } catch (error: any) {
      console.error('Error fetching problems:', error)
      toast.error('Failed to load problems')
    } finally {
      setLoading(false)
    }
  }

  const generateRecommendations = async () => {
    try {
      const data = await problemsAPI.getRecommendations()
      setRecommendedProblems(data.problems || [])
    } catch (error) {
      console.error('Error generating recommendations:', error)
      setRecommendedProblems([])
    }
  }

  const getFilteredProblems = () => {
    let filtered = problems

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(problem =>
        problem.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(problem => problem.difficulty === difficultyFilter)
    }

    // Apply tab filter
    switch (activeTab) {
      case 'recommended':
        return recommendedProblems
      case 'solved':
        // Filter to problems solved by the user
        return user?.solved_problems ? filtered.filter(problem => user.solved_problems!.includes(problem.id)) : []
      case 'unsolved':
        // Filter to problems not solved by the user
        return user?.solved_problems ? filtered.filter(problem => !user.solved_problems!.includes(problem.id)) : filtered
      default:
        return filtered
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const filteredProblems = getFilteredProblems()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading problems...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Problems</h1>
        {isAdmin && (
          <Link
            to="/admin/create-problem"
            className="btn btn-primary px-4 py-2"
          >
            Create Problem
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems..."
            className="input w-full"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: 'All Problems', count: problems.length },
          { key: 'recommended', label: 'Recommended', count: recommendedProblems.length, icon: '⭐' },
          { key: 'solved', label: 'Solved', count: user?.solved_problems ? problems.filter(p => user.solved_problems!.includes(p.id)).length : 0, icon: '✅' },
          { key: 'unsolved', label: 'Unsolved', count: user?.solved_problems ? problems.filter(p => !user.solved_problems!.includes(p.id)).length : problems.length, icon: '⏳' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            <span className="text-xs bg-muted-foreground/20 px-1 rounded">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Recommendation Banner */}
      {activeTab === 'recommended' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600 dark:text-blue-400 text-xl">🎯</span>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Personalized Recommendations
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Based on your rating ({user?.rating || 1200}) and problem-solving history
              </p>
            </div>
          </div>
        </div>
      )}

      {filteredProblems.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {searchQuery ? 'No problems match your search' : 'No problems available'}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery 
              ? 'Try adjusting your search query or filters.'
              : (isAdmin ? 'Create your first problem to get started!' : 'Check back later for new problems.')
            }
          </p>
        </div>
      ) : (
        <div className="bg-card text-card-foreground shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Problem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredProblems.map((problem) => (
                  <tr key={problem.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {problem.code || `P-${problem.id}`}
                        </code>
                        {!problem.is_public && (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-muted-foreground text-background rounded">
                            Private
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {problem.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {problem.time_limit}ms / {problem.memory_limit}MB
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      <div className="text-xs">
                        <div>Solved: {problem.solved_count || 0}</div>
                        <div>Attempts: {problem.attempted_count || 0}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {problem.tags?.slice(0, 3).map((tag, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-muted text-muted-foreground rounded">
                            {tag}
                          </span>
                        ))}
                        {problem.tags && problem.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{problem.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/problems/${problem.code || `P-${problem.id}`}/solve`}
                          className="text-primary hover:text-primary/80"
                        >
                          Solve
                        </Link>
                        <Link
                          to={`/problems/${problem.id}`}
                          className="text-muted-foreground hover:text-foreground"
                          title="View details"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProblemsPage