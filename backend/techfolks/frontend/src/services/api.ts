import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@store/authStore'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
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
  submit: (problemId: string, data: { code: string; language: string }) =>
    apiService.post(`/problems/${problemId}/submit`, data),
  getSubmissions: (problemId: string) =>
    apiService.get(`/problems/${problemId}/submissions`),
}

export const contestsAPI = {
  getAll: (params?: any) => apiService.get('/contests', { params }),
  getById: (id: string) => apiService.get(`/contests/${id}`),
  register: (id: string) => apiService.post(`/contests/${id}/register`),
  getLeaderboard: (id: string) => apiService.get(`/contests/${id}/leaderboard`),
}

export const userAPI = {
  getProfile: (username: string) => apiService.get(`/users/${username}`),
  updateProfile: (data: any) => apiService.patch('/users/me', data),
  getSubmissions: (userId?: string) =>
    apiService.get(userId ? `/users/${userId}/submissions` : '/users/me/submissions'),
  getStats: (userId?: string) =>
    apiService.get(userId ? `/users/${userId}/stats` : '/users/me/stats'),
}

export const leaderboardAPI = {
  getGlobal: (params?: any) => apiService.get('/leaderboard', { params }),
  getWeekly: () => apiService.get('/leaderboard/weekly'),
  getMonthly: () => apiService.get('/leaderboard/monthly'),
}