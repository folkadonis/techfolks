import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { useGroupsStore } from '@store/groupsStore'
import { useForumStore } from '@store/forumStore'
import GroupChat from '@components/chat/GroupChat'
import toast from 'react-hot-toast'

const GroupForumPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const { getGroup } = useGroupsStore()
  const { getPostsByGroup, addPost } = useForumStore()
  
  const [group, setGroup] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: '' })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState('')

  useEffect(() => {
    if (id) {
      fetchForumData()
    }
  }, [id])

  const fetchForumData = () => {
    try {
      setLoading(true)
      
      // Get group
      const storedGroup = getGroup(parseInt(id!))
      if (storedGroup) {
        setGroup(storedGroup)
        
        // Get forum posts for this group
        const groupPosts = getPostsByGroup(parseInt(id!))
        
        // Add some mock posts if none exist
        if (groupPosts.length === 0) {
          const mockPosts = [
            {
              id: Date.now(),
              group_id: parseInt(id!),
              title: 'Welcome to the forum!',
              content: 'This is the discussion forum for our group. Feel free to ask questions, share resources, and discuss problems.',
              author_id: storedGroup.owner_id.toString(),
              author_name: storedGroup.owner_name,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              replies_count: 0,
              views: 0,
              is_pinned: true,
              is_locked: false,
              tags: ['announcement', 'welcome']
            }
          ]
          mockPosts.forEach(post => addPost(post))
          setPosts(mockPosts)
        } else {
          setPosts(groupPosts)
        }
      } else {
        toast.error('Group not found')
        navigate('/groups')
      }
    } catch (error) {
      console.error('Error fetching forum data:', error)
      toast.error('Failed to load forum')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated) {
      toast.error('Please login to create posts')
      return
    }
    
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    const post = {
      id: Date.now(),
      group_id: parseInt(id!),
      title: newPost.title,
      content: newPost.content,
      author_id: user?.id || '',
      author_name: user?.username || 'Anonymous',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      replies_count: 0,
      views: 0,
      is_pinned: false,
      is_locked: false,
      tags: newPost.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    }

    addPost(post)
    setPosts([post, ...posts])
    setNewPost({ title: '', content: '', tags: '' })
    setShowCreatePost(false)
    toast.success('Post created successfully!')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    return date.toLocaleDateString()
  }

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      announcement: 'bg-red-100 text-red-800',
      question: 'bg-blue-100 text-blue-800',
      discussion: 'bg-green-100 text-green-800',
      tutorial: 'bg-purple-100 text-purple-800',
      help: 'bg-yellow-100 text-yellow-800',
      default: 'bg-gray-100 text-gray-800'
    }
    return colors[tag.toLowerCase()] || colors.default
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = !searchQuery || 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTag = !filterTag || post.tags.includes(filterTag)
    
    return matchesSearch && matchesTag
  })

  const allTags = Array.from(new Set(posts.flatMap(post => post.tags)))

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading forum...</div>
      </div>
    )
  }

  const canPost = group && (group.is_member || group.is_owner || group.is_manager)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Group Forum</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Discussion forum for <span className="font-semibold">{group?.name}</span>
            </p>
          </div>
          {canPost && (
            <button
              onClick={() => setShowCreatePost(true)}
              className="btn btn-primary px-4 py-2"
            >
              New Post
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Filter:</span>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="input"
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Create New Post</h3>
            <form onSubmit={handleCreatePost}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="input w-full"
                    placeholder="Enter post title"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Content *
                  </label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    className="input w-full h-48 resize-none"
                    placeholder="Write your post content..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newPost.tags}
                    onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., question, help, discussion"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePost(false)
                    setNewPost({ title: '', content: '', tags: '' })
                  }}
                  className="btn btn-outline px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4 py-2"
                >
                  Create Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <div className="text-gray-400 text-5xl mb-4">💬</div>
          <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
            {searchQuery || filterTag ? 'No posts found' : 'No posts yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery || filterTag 
              ? 'Try adjusting your search or filters.'
              : canPost 
                ? 'Be the first to start a discussion!' 
                : 'Join the group to participate in discussions.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {post.is_pinned && (
                      <span className="text-orange-500" title="Pinned">📌</span>
                    )}
                    {post.is_locked && (
                      <span className="text-gray-500" title="Locked">🔒</span>
                    )}
                    <Link
                      to={`/groups/${id}/forum/${post.id}`}
                      className="text-xl font-semibold hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      {post.title}
                    </Link>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {post.content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>by {post.author_name}</span>
                      <span>{formatDate(post.created_at)}</span>
                      <span>{post.replies_count} replies</span>
                      <span>{post.views} views</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {post.tags.map((tag: string) => (
                        <span key={tag} className={`px-2 py-1 text-xs rounded-full ${getTagColor(tag)}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
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

      {/* Group Chat */}
      {group && (
        <GroupChat 
          groupId={group.id}
          groupName={group.name}
          canChat={canPost}
        />
      )}
    </div>
  )
}

export default GroupForumPage