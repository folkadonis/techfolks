import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { problemsAPI } from '@services/api'
import { useAuthStore } from '@store/authStore'
import toast from 'react-hot-toast'

interface Problem {
  id: number
  title: string
  statement: string
  input_format?: string
  output_format?: string
  constraints: string
  difficulty: string
  time_limit: number
  memory_limit: number
  is_public: boolean
  author_id: number
  created_at: string
}

const ProblemDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [submitting, setSubmitting] = useState(false)
  const [testInput, setTestInput] = useState('')
  const [testOutput, setTestOutput] = useState('')
  const { isAuthenticated, user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const languages = [
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'java', label: 'Java' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'c', label: 'C' },
  ]

  const defaultCode = {
    python: `def solve():
    # Your solution here
    pass

# Example usage
if __name__ == "__main__":
    result = solve()
    print(result)`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    // Your solution here
    
    return 0;
}`,
    java: `public class Solution {
    public static void main(String[] args) {
        // Your solution here
        
    }
}`,
    javascript: `function solve() {
    // Your solution here
    
}

console.log(solve());`,
    c: `#include <stdio.h>

int main() {
    // Your solution here
    
    return 0;
}`
  }

  useEffect(() => {
    if (id) {
      fetchProblem()
    }
  }, [id])

  useEffect(() => {
    setCode(defaultCode[language as keyof typeof defaultCode] || defaultCode.python)
  }, [language])

  const fetchProblem = async () => {
    try {
      setLoading(true)
      const response = await problemsAPI.getById(id!)
      setProblem(response.data)
    } catch (error: any) {
      console.error('Error fetching problem:', error)
      toast.error('Failed to load problem')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to submit code')
      return
    }

    try {
      setSubmitting(true)
      const response = await problemsAPI.submit(id!, { code, language })
      toast.success('Code submitted successfully!')
      console.log('Submission result:', response)
    } catch (error: any) {
      console.error('Submission error:', error)
      toast.error('Failed to submit code')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTest = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }

    try {
      setSubmitting(true)
      // This would be a test run endpoint
      toast.success('Code tested successfully!')
      setTestOutput('Test output would appear here...')
    } catch (error: any) {
      console.error('Test error:', error)
      toast.error('Failed to test code')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this problem? This action cannot be undone.')) {
      return
    }

    try {
      await problemsAPI.delete(id!)
      toast.success('Problem deleted successfully!')
      navigate('/problems')
    } catch (error: any) {
      console.error('Error deleting problem:', error)
      toast.error('Failed to delete problem')
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'hard': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
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
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Problem not found</h3>
        <p className="text-gray-500">The requested problem could not be found.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Problem Description */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 overflow-y-auto max-h-screen">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {problem.title}
          </h1>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getDifficultyColor(problem.difficulty)}`}>
              {problem.difficulty}
            </span>
            {isAdmin && (
              <div className="flex space-x-2">
                <Link
                  to={`/admin/edit-problem/${id}`}
                  className="btn btn-outline btn-sm px-3 py-1 text-xs"
                >
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  className="btn bg-red-600 hover:bg-red-700 text-white btn-sm px-3 py-1 text-xs"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Problem Statement</h3>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {problem.statement}
            </div>
          </div>

          {problem.input_format && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Input Format</h3>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {problem.input_format}
              </div>
            </div>
          )}

          {problem.output_format && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Output Format</h3>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {problem.output_format}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-2">Constraints</h3>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {problem.constraints}
            </div>
          </div>

          <div className="flex space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Time Limit: {problem.time_limit}ms</span>
            <span>Memory Limit: {problem.memory_limit}MB</span>
          </div>
        </div>
      </div>

      {/* Code Editor */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex flex-col max-h-screen">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Code Editor</h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input w-32"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex-1">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-64 p-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
              placeholder="Write your code here..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Test Input (Optional)</label>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full h-20 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
              placeholder="Enter test input..."
            />
          </div>

          {testOutput && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Output</label>
              <div className="w-full h-20 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 overflow-auto">
                {testOutput}
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleTest}
              disabled={submitting || !code.trim()}
              className="btn btn-outline px-4 py-2 flex-1"
            >
              {submitting ? 'Testing...' : 'Test Code'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !isAuthenticated || !code.trim()}
              className="btn btn-primary px-4 py-2 flex-1"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>

          {!isAuthenticated && (
            <p className="text-sm text-gray-500 text-center">
              Please login to submit your solution
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProblemDetailPage