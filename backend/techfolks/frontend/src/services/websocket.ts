import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@store/authStore'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

class WebSocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<Function>> = new Map()

  connect() {
    if (this.socket?.connected) return

    const token = useAuthStore.getState().token

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.emit('connected')
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected')
      this.emit('disconnected')
    })

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', error)
    })

    // Handle custom events
    this.socket.onAny((event, ...args) => {
      this.emit(event, ...args)
    })
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  send(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  off(event: string, callback?: Function) {
    if (callback) {
      this.listeners.get(event)?.delete(callback)
    } else {
      this.listeners.delete(event)
    }
  }

  private emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(...args))
    }
  }
}

export const wsService = new WebSocketService()

// Specific WebSocket events
export const wsEvents = {
  // Contest events
  CONTEST_START: 'contest:start',
  CONTEST_END: 'contest:end',
  CONTEST_UPDATE: 'contest:update',

  // Submission events
  SUBMISSION_RESULT: 'submission:result',
  SUBMISSION_UPDATE: 'submission:update',

  // Leaderboard events
  LEADERBOARD_UPDATE: 'leaderboard:update',

  // Notification events
  NOTIFICATION: 'notification',

  // Code execution events
  CODE_OUTPUT: 'code:output',
  CODE_ERROR: 'code:error',
}