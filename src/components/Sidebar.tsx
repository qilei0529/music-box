'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { lessons } from '@/lib/lessons'

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-gray-100 h-screen sticky top-0 overflow-y-auto py-8 px-4 bg-white">
      <div className="mb-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-amber-600 hover:text-amber-700">
          🎹 Music Box
        </Link>
        <p className="text-xs text-gray-400 mt-1">钢琴入门</p>
      </div>

      <nav>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-300 mb-3">
          课程
        </p>
        <ul className="space-y-1">
          {lessons.map((lesson) => {
            const href = `/lessons/${lesson.slug}`
            const isActive = pathname === href
            return (
              <li key={lesson.slug}>
                <Link
                  href={href}
                  className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-amber-50 text-amber-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {lesson.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
