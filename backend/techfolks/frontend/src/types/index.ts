// User types
export interface User {
  id: string
  username: string
  email: string
  role: 'user' | 'admin'
  avatar?: string
  rating: number
  rank: number
  solvedProblems: number
  createdAt: string
  updatedAt: string
}

// Problem types
export interface Problem {
  id: string
  title: string
  slug: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string[]
  tags: string[]
  constraints: string
  inputFormat: string
  outputFormat: string
  examples: Example[]
  testCases?: TestCase[]
  timeLimit: number
  memoryLimit: number
  solvedBy: number
  totalSubmissions: number
  createdAt: string
  updatedAt: string
}

export interface Example {
  input: string
  output: string
  explanation?: string
}

export interface TestCase {
  id: string
  input: string
  output: string
  isHidden: boolean
}

// Submission types
export interface Submission {
  id: string
  problemId: string
  userId: string
  code: string
  language: string
  status: SubmissionStatus
  runtime?: number
  memory?: number
  testCasesPassed?: number
  totalTestCases?: number
  error?: string
  createdAt: string
}

export type SubmissionStatus =
  | 'pending'
  | 'running'
  | 'accepted'
  | 'wrong_answer'
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'runtime_error'
  | 'compilation_error'

// Contest types
export interface Contest {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  duration: number
  problems: ContestProblem[]
  participants: number
  status: 'upcoming' | 'active' | 'ended'
  rules: string[]
  prizes?: Prize[]
  createdAt: string
  updatedAt: string
}

export interface ContestProblem {
  problemId: string
  points: number
  order: number
}

export interface Prize {
  rank: number
  description: string
  amount?: number
}

// Leaderboard types
export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatar?: string
  rating: number
  solvedProblems: number
  totalSubmissions: number
  acceptanceRate: number
  contests: number
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  success: false
  error: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Form types
export interface LoginFormData {
  username: string
  password: string
}

export interface RegisterFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface ProblemFilterOptions {
  difficulty?: 'easy' | 'medium' | 'hard'
  category?: string
  tags?: string[]
  search?: string
  sortBy?: 'title' | 'difficulty' | 'solvedBy' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}