import { redirect } from 'next/navigation'
import { lessons } from '@/lib/lessons'

export default function Home() {
  redirect(`/lessons/${lessons[0].slug}`)
}
