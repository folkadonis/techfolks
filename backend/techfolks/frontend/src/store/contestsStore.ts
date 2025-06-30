import { create } from 'zustand'

interface Contest {
  id: number
  title: string
  description: string
  start_time: string
  end_time: string
  duration: number // in minutes
  status: 'upcoming' | 'running' | 'ended'
  problems: string[] // Array of problem codes
  participants: number
  created_by: string
  created_at: string
  is_public: boolean
  group_ids: number[] // Array of group IDs this contest belongs to
  type?: string
  max_participants?: number
  registration_deadline?: string
  rules?: string
}

interface ContestsState {
  contests: Contest[]
  addContest: (contest: Contest) => void
  updateContest: (id: number, updates: Partial<Contest>) => void
  deleteContest: (id: number) => void
  getContest: (id: number) => Contest | undefined
  getContestsByGroup: (groupId: number) => Contest[]
  addProblemToContest: (contestId: number, problemCode: string) => void
  removeProblemFromContest: (contestId: number, problemCode: string) => void
}

export const useContestsStore = create<ContestsState>()((set, get) => ({
  contests: [],
  
  addContest: (contest) => set((state) => ({ 
    contests: [...state.contests, contest] 
  })),
  
  updateContest: (id, updates) =>
    set((state) => ({
      contests: state.contests.map((c) => 
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
    
  deleteContest: (id) =>
    set((state) => ({
      contests: state.contests.filter((c) => c.id !== id),
    })),
    
  getContest: (id) => get().contests.find((c) => c.id === id),
  
  getContestsByGroup: (groupId) => 
    get().contests.filter((c) => c.group_ids && c.group_ids.includes(groupId)),
  
  addProblemToContest: (contestId, problemCode) =>
    set((state) => ({
      contests: state.contests.map((c) => 
        c.id === contestId 
          ? { ...c, problems: [...c.problems, problemCode] }
          : c
      ),
    })),
    
  removeProblemFromContest: (contestId, problemCode) =>
    set((state) => ({
      contests: state.contests.map((c) => 
        c.id === contestId 
          ? { ...c, problems: c.problems.filter(p => p !== problemCode) }
          : c
      ),
    })),
}))