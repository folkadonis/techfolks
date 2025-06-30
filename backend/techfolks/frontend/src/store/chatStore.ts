import { create } from 'zustand'

interface ChatMessage {
  id: string
  group_id: number
  content: string
  author_id: string
  author_name: string
  created_at: string
  type: 'text' | 'system' | 'join' | 'leave'
  reply_to?: {
    id: string
    author_name: string
    content: string
  }
}

interface ChatState {
  messages: Record<number, ChatMessage[]> // group_id -> messages array
  activeUsers: Record<number, string[]> // group_id -> user_ids array
  typingUsers: Record<number, Record<string, string>> // group_id -> {user_id: username}
  unreadCounts: Record<number, number> // group_id -> unread count
  
  // Actions
  addMessage: (groupId: number, message: ChatMessage) => void
  getMessages: (groupId: number) => ChatMessage[]
  clearMessages: (groupId: number) => void
  
  // Active users
  setActiveUsers: (groupId: number, users: string[]) => void
  addActiveUser: (groupId: number, userId: string) => void
  removeActiveUser: (groupId: number, userId: string) => void
  
  // Typing indicators
  setUserTyping: (groupId: number, userId: string, username: string) => void
  removeUserTyping: (groupId: number, userId: string) => void
  
  // Unread counts
  setUnreadCount: (groupId: number, count: number) => void
  resetUnreadCount: (groupId: number) => void
  incrementUnreadCount: (groupId: number) => void
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: {},
  activeUsers: {},
  typingUsers: {},
  unreadCounts: {},
  
  addMessage: (groupId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [groupId]: [...(state.messages[groupId] || []), message].slice(-100) // Keep last 100 messages for performance
    }
  })),
  
  getMessages: (groupId) => get().messages[groupId] || [],
  
  clearMessages: (groupId) => set((state) => ({
    messages: {
      ...state.messages,
      [groupId]: []
    }
  })),
  
  setActiveUsers: (groupId, users) => set((state) => ({
    activeUsers: {
      ...state.activeUsers,
      [groupId]: users
    }
  })),
  
  addActiveUser: (groupId, userId) => set((state) => ({
    activeUsers: {
      ...state.activeUsers,
      [groupId]: [...new Set([...(state.activeUsers[groupId] || []), userId])]
    }
  })),
  
  removeActiveUser: (groupId, userId) => set((state) => ({
    activeUsers: {
      ...state.activeUsers,
      [groupId]: (state.activeUsers[groupId] || []).filter(id => id !== userId)
    }
  })),
  
  setUserTyping: (groupId, userId, username) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [groupId]: {
        ...(state.typingUsers[groupId] || {}),
        [userId]: username
      }
    }
  })),
  
  removeUserTyping: (groupId, userId) => set((state) => {
    const groupTyping = { ...(state.typingUsers[groupId] || {}) }
    delete groupTyping[userId]
    
    return {
      typingUsers: {
        ...state.typingUsers,
        [groupId]: groupTyping
      }
    }
  }),
  
  setUnreadCount: (groupId, count) => set((state) => ({
    unreadCounts: {
      ...state.unreadCounts,
      [groupId]: count
    }
  })),
  
  resetUnreadCount: (groupId) => set((state) => ({
    unreadCounts: {
      ...state.unreadCounts,
      [groupId]: 0
    }
  })),
  
  incrementUnreadCount: (groupId) => set((state) => ({
    unreadCounts: {
      ...state.unreadCounts,
      [groupId]: (state.unreadCounts[groupId] || 0) + 1
    }
  }))
}))