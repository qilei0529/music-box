import PianoKeys from '@/components/PianoKeys'
import NoteCard from '@/components/NoteCard'
import ScrollingScore from '@/components/ScrollingScore'
import AbcStaff from '@/components/AbcStaff'

export function useMDXComponents(components: Record<string, unknown>) {
  return {
    ...components,
    PianoKeys,
    NoteCard,
    ScrollingScore,
    AbcStaff,
  }
}
