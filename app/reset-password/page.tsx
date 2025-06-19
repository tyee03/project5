"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AnimatedBackground from "@/components/animated-background"
import { supabase } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
      }
    } catch (error) {
      console.error("비밀번호 재설정 오류:", error)
      setError("비밀번호 재설정 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <AnimatedBackground />
      <Card className="w-full max-w-sm relative z-10">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {success
              ? "비밀번호 재설정 링크를 이메일로 보내드렸습니다."
              : "Enter your email address and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center py-4">
              <div className="text-green-500 font-medium mb-2">이메일을 확인해주세요!</div>
              <div className="text-sm text-muted-foreground">비밀번호 재설정 링크를 {email}로 보내드렸습니다.</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-4">
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
                {error && <div className="text-sm text-red-500 text-center">{error}</div>}
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2">
          {success ? (
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                로그인 페이지로 돌아가기
              </Button>
            </Link>
          ) : (
            <>
              <Button type="submit" className="w-full" onClick={handleSubmit} disabled={loading}>
                {loading ? "전송 중..." : "Send reset link"}
              </Button>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  로그인 페이지로 돌아가기
                </Button>
              </Link>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
