import { create } from 'zustand'

interface ForumPost {
  id: number
  group_id: number
  title: string
  content: string
  author_id: string
  author_name: string
  created_at: string
  updated_at: string
  replies_count: number
  views: number
  is_pinned: boolean
  is_locked: boolean
  tags: string[]
}

interface ForumReply {
  id: number
  post_id: number
  content: string
  author_id: string
  author_name: string
  created_at: string
  updated_at: string
  is_accepted?: boolean // For Q&A style posts
}

interface ForumState {
  posts: ForumPost[]
  replies: Record<number, ForumReply[]> // post_id -> replies array
  addPost: (post: ForumPost) => void
  updatePost: (id: number, updates: Partial<ForumPost>) => void
  deletePost: (id: number) => void
  addReply: (postId: number, reply: ForumReply) => void
  deleteReply: (postId: number, replyId: number) => void
  getPostsByGroup: (groupId: number) => ForumPost[]
  getPost: (id: number) => ForumPost | undefined
  getReplies: (postId: number) => ForumReply[]
  incrementViews: (postId: number) => void
}

export const useForumStore = create<ForumState>()((set, get) => ({
  posts: [],
  replies: {},
  
  addPost: (post) => set((state) => ({ 
    posts: [...state.posts, post] 
  })),
  
  updatePost: (id, updates) =>
    set((state) => ({
      posts: state.posts.map((p) => 
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      ),
    })),
    
  deletePost: (id) =>
    set((state) => {
      const newReplies = { ...state.replies }
      delete newReplies[id]
      return {
        posts: state.posts.filter((p) => p.id !== id),
        replies: newReplies
      }
    }),
    
  addReply: (postId, reply) =>
    set((state) => ({
      replies: {
        ...state.replies,
        [postId]: [...(state.replies[postId] || []), reply]
      },
      posts: state.posts.map(p => 
        p.id === postId 
          ? { ...p, replies_count: p.replies_count + 1 }
          : p
      )
    })),
    
  deleteReply: (postId, replyId) =>
    set((state) => ({
      replies: {
        ...state.replies,
        [postId]: (state.replies[postId] || []).filter(r => r.id !== replyId)
      },
      posts: state.posts.map(p => 
        p.id === postId 
          ? { ...p, replies_count: Math.max(0, p.replies_count - 1) }
          : p
      )
    })),
    
  getPostsByGroup: (groupId) => 
    get().posts.filter((p) => p.group_id === groupId)
      .sort((a, b) => {
        // Pinned posts first
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        // Then by date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }),
      
  getPost: (id) => get().posts.find((p) => p.id === id),
  
  getReplies: (postId) => get().replies[postId] || [],
  
  incrementViews: (postId) =>
    set((state) => ({
      posts: state.posts.map(p => 
        p.id === postId 
          ? { ...p, views: p.views + 1 }
          : p
      )
    }))
}))