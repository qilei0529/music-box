import { notFound } from 'next/navigation'
import { lessons } from '@/lib/lessons'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return lessons.map((l) => ({ slug: l.slug }))
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params
  const lesson = lessons.find((l) => l.slug === slug)
  if (!lesson) notFound()

  let LessonContent: React.ComponentType
  try {
    const mod = await import(`@/content/lessons/${slug}.mdx`)
    LessonContent = mod.default
  } catch {
    notFound()
  }

  return (
    <article className="lesson-content max-w-2xl">
      <LessonContent />
    </article>
  )
}
