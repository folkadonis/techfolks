import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@store/authStore'
import toast from 'react-hot-toast'

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api'

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error),
    )

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const { response } = error

        if (response?.status === 401) {
          // Token expired or invalid
          useAuthStore.getState().logout()
          window.location.href = '/login'
          toast.error('Session expired. Please login again.')
        } else if (response?.status === 403) {
          toast.error('You do not have permission to perform this action.')
        } else if (response?.status === 500) {
          toast.error('Server error. Please try again later.')
        }

        return Promise.reject(error)
      },
    )
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.api.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.api.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.api.put<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    const response = await this.api.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.api.delete<T>(url, config)
    return response.data
  }
}

export const apiService = new ApiService()

// Specific API endpoints
export const authAPI = {
  login: (data: { username: string; password: string }) =>
    apiService.post('/auth/login', data),
  register: (data: { username: string; email: string; password: string }) =>
    apiService.post('/auth/register', data),
  logout: () => apiService.post('/auth/logout'),
  me: () => apiService.get('/auth/me'),
  refreshToken: () => apiService.post('/auth/refresh'),
}

export const problemsAPI = {
  getAll: (params?: any) => apiService.get('/problems', { params }),
  getById: (id: string) => apiService.get(`/problems/${id}`),
  create: (data: any) => apiService.post('/problems', data),
  update: (id: string, data: any) => apiService.put(`/problems/${id}`, data),
  delete: (id: string) => apiService.delete(`/problems/${id}`),
  getRecommendations: () => apiService.get('/problems/recommendations'),
  submit: (problemId: string, data: { code: string; language: string }) =>
    apiService.post(`/problems/${problemId}/submit`, data),
  getSubmissions: (problemId: string) =>
    apiService.get(`/problems/${problemId}/submissions`),
}

export const contestsAPI = {
  getAll: (params?: any) => apiService.get('/contests', { params }),
  getById: (id: string) => apiService.get(`/contests/${id}`),
  create: (data: any) => apiService.post('/contests', data),
  update: (id: string, data: any) => apiService.put(`/contests/${id}`, data),
  delete: (id: string) => apiService.delete(`/contests/${id}`),
  register: (id: string) => apiService.post(`/contests/${id}/register`),
  unregister: (id: string) => apiService.delete(`/contests/${id}/register`),
  getLeaderboard: (id: string) => apiService.get(`/contests/${id}/leaderboard`),
  getProblems: (id: string) => apiService.get(`/contests/${id}/problems`),
  addProblem: (id: string, problemId: string) => apiService.post(`/contests/${id}/problems`, { problemId }),
  removeProblem: (id: string, problemId: string) => apiService.delete(`/contests/${id}/problems/${problemId}`),
}

export const userAPI = {
  getProfile: () => apiService.get('/users/profile'),
  updateProfile: (data: any) => apiService.put('/users/profile', data),
  getUserById: (id: string) => apiService.get(`/users/${id}`),
  getSubmissions: (userId?: string) =>
    apiService.get(userId ? `/users/${userId}/submissions` : '/users/me/submissions'),
  getStats: (userId?: string) =>
    apiService.get(userId ? `/users/${userId}/stats` : '/users/me/stats'),
}

export const leaderboardAPI = {
  getGlobal: (params?: any) => apiService.get('/leaderboard/global', { params }),
  getWeekly: (params?: any) => apiService.get('/leaderboard/weekly', { params }),
  getMonthly: (params?: any) => apiService.get('/leaderboard/monthly', { params }),
  getUserPosition: (userId: string) => apiService.get(`/leaderboard/user/${userId}`),
}

export const groupsAPI = {
  getAll: (params?: any) => apiService.get('/groups', { params }),
  getMyGroups: () => apiService.get('/groups/my'),
  getById: (id: string) => apiService.get(`/groups/${id}`),
  create: (data: any) => apiService.post('/groups', data),
  update: (id: string, data: any) => apiService.put(`/groups/${id}`, data),
  delete: (id: string) => apiService.delete(`/groups/${id}`),
  join: (inviteCode: string) => apiService.post(`/groups/join/${inviteCode}`),
  leave: (id: string) => apiService.post(`/groups/${id}/leave`),
  getMembers: (id: string) => apiService.get(`/groups/${id}/members`),
  removeMember: (id: string, userId: string) => apiService.delete(`/groups/${id}/members/${userId}`),
  promoteMember: (id: string, userId: string) => apiService.post(`/groups/${id}/members/${userId}/promote`),
  demoteMember: (id: string, userId: string) => apiService.post(`/groups/${id}/members/${userId}/demote`),
  createContest: (id: string, data: any) => apiService.post(`/groups/${id}/contests`, data),
}

export const dashboardAPI = {
  getStats: () => apiService.get('/dashboard'),
}

export const adminAPI = {
  getUsers: (params?: any) => apiService.get('/admin/users', { params }),
  banUser: (userId: string) => apiService.put(`/admin/users/${userId}/ban`),
  unbanUser: (userId: string) => apiService.put(`/admin/users/${userId}/unban`),
  deleteUser: (userId: string) => apiService.delete(`/admin/users/${userId}`),
  promoteUser: (userId: string) => apiService.put(`/admin/users/${userId}/promote`),
  promoteUserByUsername: (username: string) => apiService.put(`/admin/users/${username}/promote`),
  updateUserRole: (userId: string, role: string) => apiService.put(`/admin/users/${userId}/role`, { role }),
  getSystemStats: () => apiService.get('/admin/stats'),
  clearData: () => apiService.post('/admin/clear-data'),
}