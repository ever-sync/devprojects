import { logout } from '@/actions/auth'
import { Avatar } from '@/components/shared/Avatar'
import { RoleBadge } from '@/components/shared/RoleBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'
import Link from 'next/link'
import type { Profile, Notification } from '@/types'
import { MobileNav } from './MobileNav'
import { NotificationBell } from './NotificationBell'

interface TopbarProps {
  profile: Profile
  notifications: Notification[]
}

export function Topbar({ profile, notifications }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 bg-background/90 px-4 backdrop-blur-sm md:px-6">
      {/* Mobile hamburger */}
      <MobileNav role={profile.role as 'admin' | 'client'} profile={profile} />

      {/* Spacer on desktop */}
      <div className="hidden md:block" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <NotificationBell notifications={notifications} userId={profile.id} />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
              <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-foreground leading-tight">{profile.full_name}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground font-normal truncate">{profile.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <RoleBadge role={profile.role as 'admin' | 'client'} />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                Meu Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logout}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full cursor-pointer text-red-400 focus:text-red-400">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
