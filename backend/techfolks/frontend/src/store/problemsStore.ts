import { create } from 'zustand'

interface TestCase {
  id: string
  input: string
  expected_output: string
  is_sample: boolean
  points: number
}

interface Problem {
  id: number
  code: string // Unique problem code (e.g., P-ABC123)
  title: string
  statement: string
  input_format: string
  output_format: string
  constraints: string
  difficulty: 'easy' | 'medium' | 'hard'
  time_limit: number
  memory_limit: number
  is_public: boolean
  tags: string[]
  test_cases: TestCase[]
  author: {
    id: string
    username: string
    email: string
  }
  created_by: string
  created_at: string
  solved_count: number
  attempted_count: number
}

interface ProblemsState {
  problems: Problem[]
  addProblem: (problem: Problem) => void
  updateProblem: (id: number, updates: Partial<Problem>) => void
  deleteProblem: (id: number) => void
  getProblem: (id: number) => Problem | undefined
  getProblemByCode: (code: string) => Problem | undefined
  generateUniqueCode: () => string
}

export const useProblemsStore = create<ProblemsState>()((set, get) => ({
  problems: [],
  
  addProblem: (problem) => set((state) => ({ 
    problems: [...state.problems, problem] 
  })),
  
  updateProblem: (id, updates) =>
    set((state) => ({
      problems: state.problems.map((p) => 
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
    
  deleteProblem: (id) =>
    set((state) => ({
      problems: state.problems.filter((p) => p.id !== id),
    })),
    
  getProblem: (id) => get().problems.find((p) => p.id === id),
  
  getProblemByCode: (code) => get().problems.find((p) => p.code === code),
  
  generateUniqueCode: () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = 'P-'
    
    // Generate a random 6-character code
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    // Check if code already exists
    const existing = get().problems.find(p => p.code === code)
    if (existing) {
      // Recursively generate a new code if collision
      return get().generateUniqueCode()
    }
    
    return code
  }
}))