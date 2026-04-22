import Link from 'next/link'
import { lessons } from '@/lib/lessons'

export default function LessonsCatalogPage() {
  return (
    <section className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">课程目录</h1>
      <p className="mt-3 text-sm leading-7 text-gray-600">
        从基础音符开始，逐步进入看谱与弹奏。建议按顺序学习，也可以按兴趣跳转。
      </p>

      <ul className="mt-8 space-y-4">
        {lessons.map((lesson, index) => (
          <li key={lesson.slug}>
            <Link
              href={`/lessons/${lesson.slug}`}
              className="block rounded-xl border border-gray-200 bg-white px-5 py-4 transition hover:border-amber-300 hover:bg-amber-50/40"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
                Lesson {String(index + 1).padStart(2, '0')}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">{lesson.title}</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">{lesson.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
