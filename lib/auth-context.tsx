"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  loading: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; message?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 초기 세션 확인
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.warn("Failed to get session:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // If Supabase is not configured, fall back to mock authentication
        if (error.message === "Supabase not configured") {
          return mockLogin(email, password)
        }
        return { success: false, message: error.message }
      }

      if (data.user) {
        setUser(data.user)
        return { success: true }
      }

      return { success: false, message: "로그인에 실패했습니다." }
    } catch (error) {
      console.error("로그인 오류:", error)
      // Fall back to mock authentication
      return mockLogin(email, password)
    }
  }

  const mockLogin = async (email: string, password: string) => {
    // Mock users for development
    const mockUsers = [
      { email: "admin@company.com", password: "admin123", name: "관리자" },
      { email: "user@company.com", password: "user123", name: "사용자" },
    ]

    const mockUser = mockUsers.find((u) => u.email === email && u.password === password)

    if (mockUser) {
      const user = {
        id: mockUser.email,
        email: mockUser.email,
        user_metadata: { name: mockUser.name },
      } as User

      setUser(user)
      return { success: true }
    }

    return { success: false, message: "이메일 또는 비밀번호가 잘못되었습니다." }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      })

      if (error) {
        if (error.message === "Supabase not configured") {
          return { success: true, message: "회원가입이 완료되었습니다. (개발 모드)" }
        }
        return { success: false, message: error.message }
      }

      if (data.user) {
        return { success: true, message: "회원가입이 완료되었습니다. 이메일을 확인해주세요." }
      }

      return { success: false, message: "회원가입에 실패했습니다." }
    } catch (error) {
      console.error("회원가입 오류:", error)
      return { success: true, message: "회원가입이 완료되었습니다. (개발 모드)" }
    }
  }

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error && error.message !== "Supabase not configured") {
        console.error("로그아웃 실패:", error.message)
      }
    } catch (error) {
      console.error("로그아웃 오류:", error)
    } finally {
      setUser(null)
    }
  }

  return <AuthContext.Provider value={{ user, login, logout, loading, signUp }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
