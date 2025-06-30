import { create } from 'zustand'

interface User {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
  avatar?: string
  createdAt: string
  problems_solved?: number
  solved_problems?: number[]
  rating?: number
  max_rating?: number
  contests_participated_count?: number
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, token: string) => void
  register: (user: User) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: (user, token) => set({ user, token, isAuthenticated: true, isLoading: false }),
  register: (user) => set({ user, token: null, isAuthenticated: true, isLoading: false }),
  logout: () => set({ user: null, token: null, isAuthenticated: false, isLoading: false }),
  updateUser: (userData) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    })),
  setLoading: (loading) => set({ isLoading: loading }),
}))