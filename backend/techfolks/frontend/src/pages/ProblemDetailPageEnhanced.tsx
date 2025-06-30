import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { problemsAPI } from '@services/api'
import toast from 'react-hot-toast'

interface ProblemStatistics {
  total_submissions: number
  accepted_submissions: number
  success_rate: number
  average_runtime: number
  average_memory: number
  difficulty_votes: {
    easy: number
    medium: number
    hard: number
  }
}

interface Discussion {
  id: number
  title: string
  author: string
  created_at: string
  replies_count: number
  votes: number
  is_pinned: boolean
  tags: string[]
}

interface Editorial {
  approach: string
  complexity: {
    time: string
    space: string
  }
  code_snippets: {
    language: string
    code: string
  }[]
}

const ProblemDetailPageEnhanced = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  
  const [problem, setProblem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'statement' | 'statistics' | 'discussions' | 'editorial' | 'submissions'>('statement')
  const [statistics, setStatistics] = useState<ProblemStatistics | null>(null)
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [showNewDiscussion, setShowNewDiscussion] = useState(false)
  const [newDiscussion, setNewDiscussion] = useState({ title: '', content: '', tags: '' })
  
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (id) {
      fetchProblemData()
    }
  }, [id])

  const fetchProblemData = async () => {
    try {
      setLoading(true)
      
      // Get problem from API
      const response = await problemsAPI.getById(id!)
      
      if (response.success && response.data) {
        const problemData = response.data
        setProblem({
          id: problemData.id,
          code: problemData.slug,
          title: problemData.title,
          description: problemData.statement,
          input_format: problemData.input_format,
          output_format: problemData.output_format,
          constraints: problemData.constraints,
          difficulty: problemData.difficulty,
          time_limit: problemData.time_limit,
          memory_limit: problemData.memory_limit,
          is_public: problemData.is_public,
          tags: problemData.tags || [],
          author: problemData.author?.username || 'Unknown',
          created_at: problemData.created_at
        })
        
        // Set statistics from API response
        if (problemData.statistics) {
          setStatistics({
            total_submissions: problemData.statistics.total_submissions || 0,
            accepted_submissions: problemData.statistics.accepted_count || 0,
            success_rate: problemData.statistics.total_submissions > 0 
              ? (problemData.statistics.accepted_count / problemData.statistics.total_submissions) * 100 
              : 0,
            average_runtime: problemData.statistics.average_runtime || 0,
            average_memory: problemData.statistics.average_memory || 0,
            difficulty_votes: {
              easy: 0,
              medium: 0,
              hard: 0
            }
          })
        }
      } else {
        toast.error('Problem not found')
        navigate('/problems')
      }
      
      // Mock discussions for now (can be replaced with API later)
      setDiscussions([
        {
          id: 1,
          title: 'Discussion about this problem',
          author: 'user',
          created_at: new Date().toISOString(),
          replies_count: 0,
          votes: 0,
          is_pinned: false,
          tags: ['general']
        }
      ])
      
    } catch (error) {
      console.error('Error fetching problem:', error)
      toast.error('Failed to load problem')
      
      // Fallback to mock data if API fails
      setProblem({
        id: parseInt(id!),
        code: `P-${id}`,
        title: 'Sample Problem',
        description: 'This is a sample problem. The API might not be available.',
        input_format: 'Sample input format',
        output_format: 'Sample output format',
        constraints: 'Sample constraints',
        difficulty: 'easy',
        time_limit: 1000,
        memory_limit: 256,
        is_public: true,
        tags: ['sample'],
        author: 'admin',
        created_at: new Date().toISOString()
      })
      
      setStatistics({
        total_submissions: 0,
        accepted_submissions: 0,
        success_rate: 0,
        average_runtime: 0,
        average_memory: 0,
        difficulty_votes: { easy: 0, medium: 0, hard: 0 }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDiscussion = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated) {
      toast.error('Please login to create discussions')
      navigate('/login')
      return
    }
    
    if (!newDiscussion.title.trim() || !newDiscussion.content.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    
    const discussion: Discussion = {
      id: Date.now(),
      title: newDiscussion.title,
      author: user?.username || 'Anonymous',
      created_at: new Date().toISOString(),
      replies_count: 0,
      votes: 0,
      is_pinned: false,
      tags: newDiscussion.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    }
    
    setDiscussions([discussion, ...discussions])
    setNewDiscussion({ title: '', content: '', tags: '' })
    setShowNewDiscussion(false)
    toast.success('Discussion created successfully!')
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'hard': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getAcceptanceRateColor = (rate: number) => {
    if (rate >= 60) return 'text-green-600 dark:text-green-400'
    if (rate >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading problem...</div>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-foreground mb-2">Problem Not Found</h3>
        <p className="text-muted-foreground">The problem you're looking for doesn't exist.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-card text-card-foreground rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{problem.title}</h1>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getDifficultyColor(problem.difficulty)}`}>
                {problem.difficulty}
              </span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {problem.code}
              </code>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {problem.tags?.map((tag: string) => (
                <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded">
                  {tag}
                </span>
              ))}
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span>Time Limit: {problem.time_limit}ms</span>
              <span>Memory Limit: {problem.memory_limit}MB</span>
              <span>Author: {problem.author?.username || problem.author || 'Unknown'}</span>
              <span>Created: {new Date(problem.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Link
              to={`/problems/${problem.code}/solve`}
              className="btn btn-primary px-6 py-2"
            >
              Solve Problem
            </Link>
            {isAdmin && (
              <>
                <Link
                  to={`/admin/edit-problem/${problem.id}`}
                  className="btn btn-outline px-6 py-2"
                >
                  Edit Problem
                </Link>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this problem?')) {
                      toast.success('Problem deleted')
                      navigate('/problems')
                    }
                  }}
                  className="btn btn-outline px-6 py-2 text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                >
                  Delete Problem
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-card text-card-foreground rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {statistics.total_submissions.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Submissions</div>
          </div>
          <div className="bg-card text-card-foreground rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {statistics.accepted_submissions.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Accepted</div>
          </div>
          <div className="bg-card text-card-foreground rounded-lg shadow p-4 text-center">
            <div className={`text-2xl font-bold ${getAcceptanceRateColor(statistics.success_rate)}`}>
              {statistics.success_rate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
          <div className="bg-card text-card-foreground rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {statistics.average_runtime}ms
            </div>
            <div className="text-sm text-muted-foreground">Avg Runtime</div>
          </div>
          <div className="bg-card text-card-foreground rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {statistics.average_memory.toFixed(1)}MB
            </div>
            <div className="text-sm text-muted-foreground">Avg Memory</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        {['statement', 'statistics', 'discussions', 'editorial', 'submissions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-card text-card-foreground rounded-lg shadow">
        {activeTab === 'statement' && (
          <div className="p-6 prose dark:prose-invert max-w-none">
            <h3 className="text-xl font-semibold mb-4">Problem Statement</h3>
            <p className="whitespace-pre-wrap">{problem.description}</p>
            
            {problem.input_format && (
              <>
                <h3 className="text-xl font-semibold mt-6 mb-4">Input Format</h3>
                <p className="whitespace-pre-wrap">{problem.input_format}</p>
              </>
            )}
            
            {problem.output_format && (
              <>
                <h3 className="text-xl font-semibold mt-6 mb-4">Output Format</h3>
                <p className="whitespace-pre-wrap">{problem.output_format}</p>
              </>
            )}
            
            {problem.constraints && (
              <>
                <h3 className="text-xl font-semibold mt-6 mb-4">Constraints</h3>
                <p className="whitespace-pre-wrap">{problem.constraints}</p>
              </>
            )}
            
            <h3 className="text-xl font-semibold mt-6 mb-4">Sample Test Cases</h3>
            <div className="space-y-4">
              {problem.test_cases && problem.test_cases.filter(tc => tc.is_sample).length > 0 ? (
                problem.test_cases
                  .filter(tc => tc.is_sample)
                  .map((testCase, index) => (
                    <div key={testCase.id || index} className="bg-muted rounded-lg p-4">
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">Sample Test Case {index + 1}</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium mb-1">Input</div>
                          <pre className="bg-background p-2 rounded text-sm overflow-x-auto border whitespace-pre-wrap">
                            {testCase.input}
                          </pre>
                        </div>
                        <div>
                          <div className="text-sm font-medium mb-1">Expected Output</div>
                          <pre className="bg-background p-2 rounded text-sm overflow-x-auto border whitespace-pre-wrap">
                            {testCase.expected_output}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                // Fallback for old format or when no test cases
                <div className="bg-muted rounded-lg p-4">
                  <div className="mb-2">
                    <div className="text-sm font-medium mb-1">Input</div>
                    <pre className="bg-background p-2 rounded text-sm overflow-x-auto border">4
2 7 11 15
9</pre>
                  </div>
                  <div className="mb-2">
                    <div className="text-sm font-medium mb-1">Output</div>
                    <pre className="bg-background p-2 rounded text-sm overflow-x-auto border">0 1</pre>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Explanation</div>
                    <p className="text-sm">nums[0] + nums[1] = 2 + 7 = 9</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'statistics' && statistics && (
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-6">Problem Statistics</h3>
            
            {/* Acceptance Rate Chart */}
            <div className="mb-8">
              <h4 className="font-medium mb-3">Acceptance Rate</h4>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-8 overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-500"
                  style={{ width: `${statistics.success_rate}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>0%</span>
                <span>{statistics.success_rate.toFixed(1)}%</span>
                <span>100%</span>
              </div>
            </div>
            
            {/* Difficulty Votes */}
            <div className="mb-8">
              <h4 className="font-medium mb-3">Community Difficulty Votes</h4>
              <div className="space-y-2">
                {Object.entries(statistics.difficulty_votes).map(([level, votes]) => {
                  const total = Object.values(statistics.difficulty_votes).reduce((a, b) => a + b, 0)
                  const percentage = (votes / total) * 100
                  return (
                    <div key={level}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm capitalize">{level}</span>
                        <span className="text-sm">{votes} votes ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-700 rounded h-4 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            level === 'easy' ? 'bg-green-500' :
                            level === 'medium' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Submission Status Distribution */}
            <div>
              <h4 className="font-medium mb-3">Submission Results</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">58.5%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Accepted</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">23.2%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Wrong Answer</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">12.8%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Time Limit</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">5.5%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Other</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'discussions' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Discussions</h3>
              <button
                onClick={() => setShowNewDiscussion(true)}
                className="btn btn-primary px-4 py-2"
              >
                New Discussion
              </button>
            </div>
            
            {/* New Discussion Form */}
            {showNewDiscussion && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
                <form onSubmit={handleCreateDiscussion}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Title</label>
                      <input
                        type="text"
                        value={newDiscussion.title}
                        onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                        className="input w-full"
                        placeholder="Enter discussion title..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Content</label>
                      <textarea
                        value={newDiscussion.content}
                        onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
                        className="input w-full h-32 resize-none"
                        placeholder="Write your discussion content..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                      <input
                        type="text"
                        value={newDiscussion.tags}
                        onChange={(e) => setNewDiscussion({ ...newDiscussion, tags: e.target.value })}
                        className="input w-full"
                        placeholder="e.g., solution, help, optimization"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewDiscussion(false)
                        setNewDiscussion({ title: '', content: '', tags: '' })
                      }}
                      className="btn btn-outline px-4 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-4 py-2"
                    >
                      Create Discussion
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Discussions List */}
            <div className="space-y-4">
              {discussions.map((discussion) => (
                <div key={discussion.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {discussion.is_pinned && (
                          <span className="text-orange-500" title="Pinned">📌</span>
                        )}
                        <h4 className="font-medium text-lg hover:text-primary-600 cursor-pointer">
                          {discussion.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {discussion.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>by {discussion.author}</span>
                        <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                        <span>{discussion.replies_count} replies</span>
                        <span>{discussion.votes} votes</span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'editorial' && (
          <div className="p-6 prose dark:prose-invert max-w-none">
            <h3 className="text-xl font-semibold mb-4">Editorial</h3>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Editorial will be available after you solve the problem or after the contest ends.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-6">Your Submissions</h3>
            {!isAuthenticated ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Please login to view your submissions</p>
                <Link to="/login" className="btn btn-primary">Login</Link>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No submissions yet. <Link to={`/problems/${problem.code}/solve`} className="text-primary-600 hover:text-primary-700">Solve this problem</Link></p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <Link to="/problems" className="btn btn-outline px-6 py-2">
          ← Back to Problems
        </Link>
      </div>
    </div>
  )
}

export default ProblemDetailPageEnhanced