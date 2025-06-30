import { create } from 'zustand'

interface Group {
  id: number
  name: string
  description?: string
  invite_code: string
  is_private: boolean
  owner_id: number
  owner_name: string
  member_count: number
  created_at: string
  is_member: boolean
  is_owner: boolean
  is_manager: boolean
  contest_count?: number
  problem_count?: number
  badges?: string[]
  managers?: string[]
}

interface GroupsState {
  groups: Group[]
  addGroup: (group: Group) => void
  updateGroup: (id: number, updates: Partial<Group>) => void
  deleteGroup: (id: number) => void
  getGroup: (id: number) => Group | undefined
}

export const useGroupsStore = create<GroupsState>()((set, get) => ({
  groups: [],
  addGroup: (group) => set((state) => ({ groups: [...state.groups, group] })),
  updateGroup: (id, updates) =>
    set((state) => ({
      groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),
  deleteGroup: (id) =>
    set((state) => ({
      groups: state.groups.filter((g) => g.id !== id),
    })),
  getGroup: (id) => get().groups.find((g) => g.id === id),
}))