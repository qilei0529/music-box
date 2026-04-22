import PianoKeys from '@/components/PianoKeys'
import NoteCard from '@/components/NoteCard'

export function useMDXComponents(components: Record<string, unknown>) {
  return {
    ...components,
    PianoKeys,
    NoteCard,
  }
}
