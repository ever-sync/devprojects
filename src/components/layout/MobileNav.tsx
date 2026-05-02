'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCog,
  Settings,
  Menu,
  X,
  MoreHorizontal,
  MessageCircle,
  FileText,
  Headphones,
  BarChart3,
  FileBadge,
  ListChecks,
  Sun,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import { Avatar } from '@/components/shared/Avatar'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  badge?: number
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Meu Dia', href: '/my-day', icon: Sun },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, adminOnly: true },
  { label: 'Propostas', href: '/proposals', icon: FileBadge },
  { label: 'Projetos', href: '/projects', icon: FolderKanban },
  { label: 'Clientes', href: '/clients', icon: Users, adminOnly: true },
  { label: 'Delegações', href: '/delegations', icon: ListChecks, adminOnly: true },
]

const secondaryNavItems: NavItem[] = [
  { label: 'Equipe', href: '/team', icon: UserCog, adminOnly: true },
  { label: 'Configurações', href: '/settings', icon: Settings },
]

interface MobileNavProfile {
  full_name: string
  avatar_url?: string | null
  role: string
}

interface MobileNavProps {
  role: UserRole
  profile: MobileNavProfile
}

export function MobileNav({ role, profile }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const visibleMain = mainNavItems.filter((item) => !item.adminOnly || role === 'admin')
  const visibleSecondary = secondaryNavItems.filter((item) => !item.adminOnly || role === 'admin')

  function isActive(item: NavItem) {
    return item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href)
  }

  function NavLink({ item }: { item: NavItem }) {
    const Icon = item.icon
    const active = isActive(item)
    return (
      <Link
        href={item.href}
        onClick={() => setOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
          active
            ? 'bg-sidebar-accent text-sidebar-foreground'
            : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60',
        )}
      >
        <Icon className="w-4 h-4" />
        <span className="flex-1">{item.label}</span>
        {item.badge != null && (
          <span className="text-[11px] font-semibold bg-sidebar-foreground/10 text-sidebar-foreground px-1.5 py-0.5 rounded-full leading-none">
            {item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between px-5 pt-6 pb-5">
            <Image
              src="/logo.png"
              alt="ReobotLabs"
              width={140}
              height={23}
              priority
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Profile card */}
          <div className="px-3 mb-4">
            <div className="flex items-center gap-3 bg-sidebar-accent rounded-2xl px-3 py-2.5">
              <Avatar
                name={profile.full_name}
                avatarUrl={profile.avatar_url}
                size="sm"
                className="ring-2 ring-sidebar-border flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {profile.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {role === 'admin' ? 'Admin account' : 'Client account'}
                </p>
              </div>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-border/20 transition-colors flex-shrink-0"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Separator */}
          <div className="mx-3 mb-3 h-px bg-sidebar-border" />

          {/* Main nav */}
          <nav className="px-3 space-y-0.5 mb-2">
            {visibleMain.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          {/* Separator */}
          <div className="mx-3 my-3 h-px bg-sidebar-border" />

          {/* Secondary nav */}
          <nav className="px-3 space-y-0.5">
            {visibleSecondary.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          {/* Flex spacer */}
          <div className="flex-1" />

          {/* Footer links */}
          <div className="px-3 space-y-0.5 mb-3">
            <Link
              href="#"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Blog
            </Link>
            <Link
              href="#"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
            >
              <Headphones className="w-4 h-4" />
              Suporte
            </Link>
          </div>

          {/* "Need help?" card */}
          <div className="px-3 pb-5">
            <div className="sidebar-help-card rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-bold text-white mb-0.5">Precisa de ajuda?</p>
              <p className="text-xs text-white/70">Nosso suporte funciona 24/7</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
