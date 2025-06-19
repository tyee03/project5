"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MailIcon, PlusCircleIcon, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
            >
              <PlusCircleIcon />
              <span>Quick Create</span>
            </SidebarMenuButton>
            <Button size="icon" className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:opacity-0" variant="outline">
              <MailIcon />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={isActive}
                  className={cn(
                    "transition-all duration-200 ease-in-out",
                    isActive && [
                      // Active state styling - easily customizable for themes
                      "bg-sidebar-accent text-sidebar-accent-foreground",
                      "border-l-4 border-primary",
                      "font-semibold",
                      "scale-105 transform",
                      "shadow-sm",
                      // Custom CSS variables for easy theme changes
                      "data-[active=true]:bg-[var(--nav-active-bg,hsl(var(--sidebar-accent)))]",
                      "data-[active=true]:text-[var(--nav-active-text,hsl(var(--sidebar-accent-foreground)))]",
                      "data-[active=true]:border-l-[var(--nav-active-border-width,4px)]",
                      "data-[active=true]:border-l-[var(--nav-active-border-color,hsl(var(--primary)))]",
                    ],
                    !isActive && [
                      "hover:bg-sidebar-accent/50",
                      "hover:text-sidebar-accent-foreground",
                      "hover:scale-102 hover:transform",
                    ],
                  )}
                  data-active={isActive}
                >
                  <Link href={item.url} className="flex items-center gap-2 w-full">
                    {item.icon && (
                      <item.icon className={cn("transition-all duration-200", isActive ? "scale-110" : "scale-100")} />
                    )}
                    <span className={cn("transition-all duration-200", isActive && "font-semibold tracking-wide")}>
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
