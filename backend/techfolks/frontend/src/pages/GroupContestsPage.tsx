import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useGroupsStore } from '@store/groupsStore'
import { useContestsStore } from '@store/contestsStore'
import toast from 'react-hot-toast'

interface GroupContest {
  id: number
  title: string
  description: string
  start_time: string
  end_time: string
  status: 'upcoming' | 'running' | 'ended'
  participants: number
  problems_count: number
  created_by: string
}

const GroupContestsPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getGroup } = useGroupsStore()
  const { getContestsByGroup } = useContestsStore()
  
  const [group, setGroup] = useState<any>(null)
  const [contests, setContests] = useState<GroupContest[]>([])
  const [activeTab, setActiveTab] = useState<'upcoming' | 'running' | 'ended'>('upcoming')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchGroupContests()
    }
  }, [id])

  const fetchGroupContests = () => {
    try {
      setLoading(true)
      
      // Get group
      const storedGroup = getGroup(parseInt(id!))
      if (storedGroup) {
        setGroup(storedGroup)
        
        // Get contests for this group
        const groupContests = getContestsByGroup(parseInt(id!))
        
        // Mock some additional contests
        const mockContests: GroupContest[] = [
          {
            id: 1001,
            title: 'Weekly Practice Contest #1',
            description: 'Regular practice contest for group members',
            start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
            status: 'upcoming',
            participants: 0,
            problems_count: 5,
            created_by: storedGroup.owner_name
          },
          {
            id: 1002,
            title: 'Speed Programming Challenge',
            description: 'Test your speed with easy problems',
            start_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
            status: 'ended',
            participants: 12,
            problems_count: 8,
            created_by: storedGroup.owner_name
          }
        ]
        
        // Combine real and mock contests
        const allContests = [...groupContests, ...mockContests].map(c => ({
          ...c,
          problems_count: c.problems?.length || c.problems_count || 0
        }))
        
        setContests(allContests)
      } else {
        toast.error('Group not found')
        navigate('/groups')
      }
    } catch (error) {
      console.error('Error fetching contests:', error)
      toast.error('Failed to load contests')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'running': return 'bg-green-100 text-green-800'
      case 'ended': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const canCreateContest = group && (group.is_owner || group.is_manager)

  const filteredContests = contests.filter(contest => contest.status === activeTab)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading contests...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Group Contests</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Contests for <span className="font-semibold">{group?.name}</span>
            </p>
          </div>
          {canCreateContest && (
            <Link
              to={`/groups/${id}/contests/create`}
              className="btn btn-primary px-4 py-2"
            >
              Create Contest
            </Link>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[
          { key: 'upcoming', label: 'Upcoming', count: contests.filter(c => c.status === 'upcoming').length },
          { key: 'running', label: 'Running', count: contests.filter(c => c.status === 'running').length },
          { key: 'ended', label: 'Ended', count: contests.filter(c => c.status === 'ended').length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Contests List */}
      {filteredContests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 text-5xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
            No {activeTab} contests
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {activeTab === 'upcoming' && canCreateContest && 'Create a new contest to get started!'}
            {activeTab === 'upcoming' && !canCreateContest && 'Check back later for upcoming contests.'}
            {activeTab === 'running' && 'No contests are currently running.'}
            {activeTab === 'ended' && 'No past contests to show.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredContests.map((contest) => (
            <div key={contest.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{contest.title}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contest.status)}`}>
                      {contest.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {contest.description}
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Start Time</span>
                      <div className="font-medium">{formatDateTime(contest.start_time)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">End Time</span>
                      <div className="font-medium">{formatDateTime(contest.end_time)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Problems</span>
                      <div className="font-medium">{contest.problems_count}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Participants</span>
                      <div className="font-medium">{contest.participants}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    Created by {contest.created_by}
                  </div>
                </div>
                
                <div className="ml-4">
                  <Link
                    to={`/contests/${contest.id}`}
                    className="btn btn-primary px-4 py-2"
                  >
                    {contest.status === 'upcoming' ? 'View Details' : 
                     contest.status === 'running' ? 'Enter Contest' : 
                     'View Results'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Back Button */}
      <div className="mt-6">
        <Link
          to={`/groups/${id}`}
          className="btn btn-outline px-6 py-2"
        >
          ← Back to Group
        </Link>
      </div>
    </div>
  )
}

export default GroupContestsPage