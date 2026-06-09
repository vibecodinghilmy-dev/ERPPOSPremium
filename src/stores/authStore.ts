import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '@/types'

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  selectedOutletId: string | null
  setUser: (user: UserProfile | null) => void
  setIsLoading: (loading: boolean) => void
  setSelectedOutlet: (outletId: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      selectedOutletId: null,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setSelectedOutlet: (selectedOutletId) => set({ selectedOutletId }),
      logout: () => set({ user: null, isAuthenticated: false, selectedOutletId: null }),
    }),
    {
      name: 'prostream-auth',
      partialize: (state) => ({
        selectedOutletId: state.selectedOutletId,
      }),
    }
  )
)
