'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Dumbbell,
  Library,
  TrendingUp,
  MessageCircle,
  Calendar,
  Settings,
  LogOut,
  User as UserIcon,
} from 'lucide-react'
import { User } from '@/types'
import { signOut } from '@/app/actions/auth'

interface SidebarProps {
  user: User | null
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Meu Treino', href: '/dashboard/treino', icon: Dumbbell },
  { name: 'Exercícios', href: '/dashboard/exercicios', icon: Library },
  { name: 'Progresso', href: '/dashboard/progresso', icon: TrendingUp },
  { name: 'Chat', href: '/dashboard/chat', icon: MessageCircle },
  { name: 'Consultorias', href: '/dashboard/consultorias', icon: Calendar },
  { name: 'Perfil', href: '/dashboard/perfil', icon: Settings },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  async function handleSignOut() {
    await signOut()
  }

  return (
    <>
      {/* Mobile sidebar backdrop */}
      <div className="lg:hidden fixed inset-0 z-40 bg-gray-600 bg-opacity-75 hidden" />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform lg:translate-x-0 lg:static lg:inset-0 hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-6 bg-td-blue-dark">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Dumbbell className="w-8 h-8 text-td-cta-orange" />
              <span className="text-xl font-headings font-bold text-white">
                TD FITNESS
              </span>
            </Link>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-td-blue-display flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-td-text-primary truncate">
                  {user?.nome || 'Usuário'}
                </p>
                <p className="text-xs text-td-text-secondary truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-td-blue-display text-white'
                      : 'text-td-text-secondary hover:bg-td-bg-secondary hover:text-td-text-primary'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Sign out button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-td-error-red hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
