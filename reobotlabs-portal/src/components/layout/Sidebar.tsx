'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCog,
  Settings,
  MoreHorizontal,
  MessageCircle,
  FileText,
  Headphones,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  FileBadge,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/shared/Avatar'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  adminOnly?: boolean
  badge?: number
}

const mainNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: <BarChart3 className="w-4 h-4 shrink-0" />,
    adminOnly: true,
  },
  {
    label: 'Propostas',
    href: '/proposals',
    icon: <FileBadge className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Projetos',
    href: '/projects',
    icon: <FolderKanban className="w-4 h-4 shrink-0" />,
  },
  {
    label: 'Clientes',
    href: '/clients',
    icon: <Users className="w-4 h-4 shrink-0" />,
    adminOnly: true,
  },
]

const secondaryNavItems: NavItem[] = [
  {
    label: 'Equipe',
    href: '/team',
    icon: <UserCog className="w-4 h-4 shrink-0" />,
    adminOnly: true,
  },
  {
    label: 'Configurações',
    href: '/settings',
    icon: <Settings className="w-4 h-4 shrink-0" />,
  },
]

interface SidebarProfile {
  full_name: string
  avatar_url?: string | null
  role: string
}

interface SidebarProps {
  role: UserRole
  profile: SidebarProfile
}

function SidebarNavItem({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem
  isActive: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
        collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
        isActive
          ? 'bg-sidebar-accent text-sidebar-foreground'
          : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60',
      )}
    >
      {item.icon}
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge != null && (
            <span className="text-[11px] font-semibold bg-sidebar-foreground/10 text-sidebar-foreground px-1.5 py-0.5 rounded-full leading-none">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}

export function Sidebar({ role, profile }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const visibleMain = mainNavItems.filter(
    (item) => !item.adminOnly || role === 'admin',
  )
  const visibleSecondary = secondaryNavItems.filter(
    (item) => !item.adminOnly || role === 'admin',
  )

  function isActive(item: NavItem) {
    return item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href)
  }

  return (
    <div className={cn('hidden md:block shrink-0', collapsed ? 'w-16' : 'w-72')}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden md:flex flex-col h-screen overflow-hidden bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-72',
        )}
      >
      {/* Logo + botão colapsar */}
      <div
        className={cn(
          'pt-6 pb-5 flex items-center',
          collapsed ? 'px-3 justify-center' : 'px-4 justify-between',
        )}
      >
        {/* Logo — só mostra quando expandido */}
        {!collapsed && (
          <Image
            src="/logo.png"
            alt="ReobotLabs"
            width={150}
            height={26}
            priority
          />
        )}

        {/* Botão colapsar */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          className={cn(
            'flex items-center justify-center rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
            collapsed ? 'w-10 h-10' : 'w-7 h-7',
          )}
        >
          {collapsed
            ? <ChevronsRight className="w-4 h-4" />
            : <ChevronsLeft className="w-4 h-4" />
          }
        </button>
      </div>

      {/* Profile card */}
      {!collapsed ? (
        <div className="px-3 mb-4">
          <div className="flex items-center gap-3 bg-sidebar-accent rounded-2xl px-3 py-2.5">
            <Avatar
              name={profile.full_name}
              avatarUrl={profile.avatar_url}
              size="sm"
              className="ring-2 ring-sidebar-border shrink-0"
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
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-border/20 transition-colors shrink-0"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-3 mb-4 flex justify-center">
          <Avatar
            name={profile.full_name}
            avatarUrl={profile.avatar_url}
            size="sm"
            className="ring-2 ring-sidebar-border"
          />
        </div>
      )}

      {/* Separator */}
      <div className="mx-3 mb-3 h-px bg-sidebar-border" />

      {/* Main nav */}
      <nav className="px-2 space-y-0.5 mb-2">
        {visibleMain.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            isActive={isActive(item)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Separator */}
      <div className="mx-3 my-3 h-px bg-sidebar-border" />

      {/* Secondary nav */}
      <nav className="px-2 space-y-0.5">
        {visibleSecondary.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            isActive={isActive(item)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Flex spacer */}
      <div className="flex-1" />

      {/* Footer links — expandido */}
      {!collapsed && (
        <div className="px-3 space-y-0.5 mb-3">
          <Link
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <FileText className="w-4 h-4 shrink-0" />
            Blog
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <Headphones className="w-4 h-4 shrink-0" />
            Suporte
          </Link>
        </div>
      )}

      {/* Footer links — colapsado (só ícones) */}
      {collapsed && (
        <div className="px-2 space-y-0.5 mb-3">
          <Link
            href="#"
            title="Blog"
            className="flex items-center justify-center py-2 rounded-xl text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <FileText className="w-4 h-4" />
          </Link>
          <Link
            href="#"
            title="Suporte"
            className="flex items-center justify-center py-2 rounded-xl text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <Headphones className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* "Need help?" card — expandido */}
      {!collapsed && (
        <div className="px-3 pb-5">
          <div className="sidebar-help-card rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center mb-3">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-bold text-white mb-0.5">Precisa de ajuda?</p>
            <p className="text-xs text-white/70">Nosso suporte funciona 24/7</p>
          </div>
        </div>
      )}

      {/* "Need help?" card — colapsado (só ícone) */}
      {collapsed && (
        <div className="px-2 pb-5">
          <button
            type="button"
            title="Precisa de ajuda?"
            className="sidebar-help-card w-full rounded-2xl p-2.5 flex items-center justify-center"
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
      </aside>
    </div>
  )
}
