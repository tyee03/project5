"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AnimatedBackground from "@/components/animated-background"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase/client"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.")
      setLoading(false)
      return
    }

    try {
      const result = await signUp(email, password, name)

      if (result.success) {
        setSuccess(true)
        setSuccessMessage(result.message || "회원가입이 완료되었습니다!")
        // 이메일 확인이 필요한 경우 로그인 페이지로 바로 이동하지 않음
      } else {
        setError(result.message || "회원가입에 실패했습니다.")
      }
    } catch (error) {
      console.error("회원가입 오류:", error)
      setError("회원가입 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (error) {
      console.error("Google 회원가입 오류:", error)
      setError("Google 회원가입 중 오류가 발생했습니다.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <AnimatedBackground />
      <Card className="w-full max-w-sm relative z-10">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Enter your information to create an account</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center py-4">
              <div className="text-green-500 font-medium mb-2">{successMessage}</div>
              <div className="text-sm text-muted-foreground">이메일을 확인하여 계정을 활성화해주세요.</div>
              <Button variant="outline" className="mt-4 w-full" onClick={() => router.push("/login")}>
                로그인 페이지로 이동
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <div className="text-sm text-red-500 text-center">{error}</div>}
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2">
          {!success && (
            <>
              <Button type="submit" className="w-full" onClick={handleSubmit} disabled={loading}>
                {loading ? "처리 중..." : "Sign up"}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleGoogleSignup}>
                Sign up with Google
              </Button>
            </>
          )}
          <div className="text-sm text-center mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
