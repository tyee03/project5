import { redirect } from "next/navigation"

export default function HomePage() {
  // 첫 페이지를 로그인 페이지로 리다이렉트
  redirect("/login")
}
