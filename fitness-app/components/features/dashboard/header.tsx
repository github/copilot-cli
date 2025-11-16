'use client'

import { Bell, Menu } from 'lucide-react'
import { User } from '@/types'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  user: User | null
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 lg:hidden">
      <div className="flex items-center justify-between h-16 px-4">
        <Button variant="ghost" size="sm">
          <Menu className="w-6 h-6" />
        </Button>

        <h1 className="text-lg font-headings font-bold text-td-blue-dark">
          TD FITNESS
        </h1>

        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-td-cta-orange rounded-full" />
        </Button>
      </div>
    </header>
  )
}
