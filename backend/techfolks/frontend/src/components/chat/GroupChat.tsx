import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@store/authStore'
import { useChatStore } from '@store/chatStore'
import toast from 'react-hot-toast'

interface GroupChatProps {
  groupId: number
  groupName: string
  canChat: boolean
}

const GroupChat = ({ groupId, groupName, canChat }: GroupChatProps) => {
  const { user, isAuthenticated } = useAuthStore()
  const { 
    getMessages, 
    addMessage, 
    activeUsers, 
    typingUsers,
    setUserTyping,
    removeUserTyping,
    resetUnreadCount,
    addActiveUser,
    removeActiveUser
  } = useChatStore()
  
  const [message, setMessage] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [replyTo, setReplyTo] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  
  const messages = getMessages(groupId)
  const groupActiveUsers = activeUsers[groupId] || []
  const groupTypingUsers = typingUsers[groupId] || {}
  
  useEffect(() => {
    if (isOpen && isAuthenticated && user?.id) {
      // Simulate user joining the chat
      addActiveUser(groupId, user.id)
      resetUnreadCount(groupId)
      
      // Add join message
      const joinMessage = {
        id: `${Date.now()}-join`,
        group_id: groupId,
        content: `${user.username} joined the chat`,
        author_id: 'system',
        author_name: 'System',
        created_at: new Date().toISOString(),
        type: 'join' as const
      }
      
      if (!messages.some(m => m.type === 'join' && m.content.includes(user.username))) {
        addMessage(groupId, joinMessage)
      }
      
      return () => {
        // Simulate user leaving the chat
        removeActiveUser(groupId, user.id)
        removeUserTyping(groupId, user.id)
      }
    }
  }, [isOpen, groupId, user, isAuthenticated])
  
  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    scrollToBottom()
  }, [messages])
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  const handleTyping = () => {
    if (!user) return
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Set user as typing
    setUserTyping(groupId, user.id, user.username)
    
    // Remove typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      removeUserTyping(groupId, user.id)
    }, 2000)
  }
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isAuthenticated || !user) {
      toast.error('Please login to send messages')
      return
    }
    
    if (!canChat) {
      toast.error('You must be a member of this group to send messages')
      return
    }
    
    if (!message.trim()) return
    
    const newMessage = {
      id: `${Date.now()}-${user.id}`,
      group_id: groupId,
      content: message.trim(),
      author_id: user.id,
      author_name: user.username,
      created_at: new Date().toISOString(),
      type: 'text' as const,
      reply_to: replyTo ? {
        id: replyTo.id,
        author_name: replyTo.author_name,
        content: replyTo.content
      } : undefined
    }
    
    addMessage(groupId, newMessage)
    setMessage('')
    setReplyTo(null)
    removeUserTyping(groupId, user.id)
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const hours = date.getHours()
    const minutes = date.getMinutes()
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }
  
  const getMessageClass = (msg: any) => {
    if (msg.type === 'system' || msg.type === 'join' || msg.type === 'leave') {
      return 'text-center text-sm text-gray-500 my-2'
    }
    
    const isOwnMessage = user?.id === msg.author_id
    return isOwnMessage
      ? 'ml-auto bg-primary-600 text-white'
      : 'mr-auto bg-gray-100 dark:bg-gray-700'
  }
  
  const typingUsersList = Object.values(groupTypingUsers).filter(username => username !== user?.username)
  
  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-colors z-40"
        title="Toggle Chat"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
          />
        </svg>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {messages.length > 99 ? '99+' : messages.length}
          </span>
        )}
      </button>
      
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="font-semibold">{groupName} Chat</h3>
              <p className="text-xs text-gray-500">
                {groupActiveUsers.length} members online
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <div className="text-4xl mb-2">💬</div>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.type === 'text' ? 'flex' : ''}
                >
                  {msg.type === 'text' ? (
                    <div
                      className={`max-w-[75%] px-4 py-2 rounded-lg ${getMessageClass(msg)}`}
                    >
                      {msg.reply_to && (
                        <div className="text-xs opacity-70 mb-1 border-l-2 border-gray-300 pl-2">
                          <div className="font-medium">{msg.reply_to.author_name}</div>
                          <div className="line-clamp-1">{msg.reply_to.content}</div>
                        </div>
                      )}
                      <div className="text-xs font-medium mb-1 opacity-70">
                        {msg.author_name}
                      </div>
                      <div className="text-sm">{msg.content}</div>
                      <div className="text-xs mt-1 opacity-50">
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  ) : (
                    <div className={getMessageClass(msg)}>
                      {msg.content}
                    </div>
                  )}
                  {msg.type === 'text' && user?.id !== msg.author_id && (
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Reply"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" 
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Typing Indicator */}
          {typingUsersList.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-500">
              {typingUsersList.length === 1
                ? `${typingUsersList[0]} is typing...`
                : `${typingUsersList.join(', ')} are typing...`}
            </div>
          )}
          
          {/* Reply Preview */}
          {replyTo && (
            <div className="mx-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium text-xs text-gray-500">Replying to {replyTo.author_name}</div>
                <div className="line-clamp-1">{replyTo.content}</div>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Input */}
          {canChat ? (
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value)
                    handleTyping()
                  }}
                  placeholder="Type a message..."
                  className="input flex-1"
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="btn btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                    />
                  </svg>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500">
              {isAuthenticated ? 'Join the group to participate in chat' : 'Login to participate in chat'}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default GroupChat