import { create } from 'zustand'

export interface User {
    id: string
    email: string
    role: 'mentor' | 'mentee'
}

interface AuthState {
    user: User | null
    token: string | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (token: string, user: User) => void
    logout: () => void
    initializeLoader: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,

    login: (token, user) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token)
            localStorage.setItem('user', JSON.stringify(user))
        }
        set({ token, user, isAuthenticated: true })
    },

    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
        }
        set({ token: null, user: null, isAuthenticated: false })
    },

    initializeLoader: () => {
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('token')
            const storedUser = localStorage.getItem('user')

            if (storedToken && storedUser) {
                set({
                    token: storedToken,
                    user: JSON.parse(storedUser),
                    isAuthenticated: true,
                    isLoading: false,
                })
            } else {
                set({ isLoading: false })
            }
        } else {
            set({ isLoading: false })
        }
    },
}))
