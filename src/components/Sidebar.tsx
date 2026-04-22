'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { lessons } from '@/lib/lessons'

export default function Sidebar() {
  const pathname = usePathname()
  const appVersion = 'beta 0.1.0'

  return (
    <aside className="w-56 shrink-0 border-r border-gray-100 h-screen sticky top-0 overflow-y-auto py-8 px-4 bg-white">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-amber-600 hover:text-amber-700"
        >
          <span>🎹 Music Box</span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-[11px] font-semibold leading-none text-zinc-700 -mb-0.5">
            {appVersion}
          </span>
        </Link>
        <p className="text-xs text-gray-400 mt-1">钢琴入门</p>
      </div>

      <nav>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-300 mb-3">
          课程
        </p>
        <ul className="space-y-1">
          <li>
            <Link
              href="/lessons"
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                pathname === '/lessons'
                  ? 'bg-amber-50 text-amber-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              课程目录
            </Link>
          </li>
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
