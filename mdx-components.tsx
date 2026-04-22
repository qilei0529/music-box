import PianoKeys from '@/components/PianoKeys'
import NoteCard from '@/components/NoteCard'
import ScrollingScore from '@/components/ScrollingScore'

export function useMDXComponents(components: Record<string, unknown>) {
  return {
    ...components,
    PianoKeys,
    NoteCard,
    ScrollingScore,
  }
}
