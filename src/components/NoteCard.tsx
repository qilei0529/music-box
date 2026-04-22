'use client'

import { playNote } from '@/lib/audio'

interface NoteCardProps {
  note: string
  solfege: string
  description?: string
}

export default function NoteCard({ note, solfege, description }: NoteCardProps) {
  return (
    <button
      onClick={() => playNote(note)}
      className="inline-flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
    >
      <span className="text-2xl font-bold text-amber-700">{solfege}</span>
      <span className="text-sm text-gray-500">{note}</span>
      {description && <span className="text-xs text-gray-400">{description}</span>}
    </button>
  )
}
