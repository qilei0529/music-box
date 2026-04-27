'use client'

import { FocusEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'

import { attackNote, releaseNote } from '@/lib/audio'

const WHITE_KEYS = [
  { note: 'C4', solfege: 'Do', label: 'C' },
  { note: 'D4', solfege: 'Re', label: 'D' },
  { note: 'E4', solfege: 'Mi', label: 'E' },
  { note: 'F4', solfege: 'Fa', label: 'F' },
  { note: 'G4', solfege: 'Sol', label: 'G' },
  { note: 'A4', solfege: 'La', label: 'A' },
  { note: 'B4', solfege: 'Si', label: 'B' },
]

// afterWhite = index of the white key to the left of the black key
const BLACK_KEYS = [
  { note: 'C#4', afterWhite: 0 },
  { note: 'D#4', afterWhite: 1 },
  { note: 'F#4', afterWhite: 3 },
  { note: 'G#4', afterWhite: 4 },
  { note: 'A#4', afterWhite: 5 },
]

const WHITE_W = 52
const WHITE_H = 150
const BLACK_W = 36
const BLACK_H = 94

const KEYBOARD_BINDINGS = [
  { code: 'KeyF', keyLabel: 'F', note: 'C4' },
  { code: 'KeyT', keyLabel: 'T', note: 'C#4' },
  { code: 'KeyG', keyLabel: 'G', note: 'D4' },
  { code: 'KeyY', keyLabel: 'Y', note: 'D#4' },
  { code: 'KeyH', keyLabel: 'H', note: 'E4' },
  { code: 'KeyJ', keyLabel: 'J', note: 'F4' },
  { code: 'KeyI', keyLabel: 'I', note: 'F#4' },
  { code: 'KeyK', keyLabel: 'K', note: 'G4' },
  { code: 'KeyO', keyLabel: 'O', note: 'G#4' },
  { code: 'KeyL', keyLabel: 'L', note: 'A4' },
  { code: 'KeyP', keyLabel: 'P', note: 'A#4' },
  { code: 'Semicolon', keyLabel: ';', note: 'B4' },
] as const

const KEYBOARD_NOTE_MAP: Record<string, string> = Object.fromEntries(
  KEYBOARD_BINDINGS.map((binding) => [binding.code, binding.note]),
)

const NOTE_SHORTCUT_LABEL_MAP: Record<string, string> = Object.fromEntries(
  KEYBOARD_BINDINGS.map((binding) => [binding.note, binding.keyLabel]),
)

interface PianoKeysProps {
  onNotePress?: (note: string) => void
  autoFocus?: boolean
}

export default function PianoKeys({ onNotePress, autoFocus }: PianoKeysProps = {}) {
  const [pressedNotes, setPressedNotes] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoFocus) containerRef.current?.focus()
  }, [autoFocus])

  const handleKeyboardPlay = (event: KeyboardEvent<HTMLDivElement>) => {
    const note = KEYBOARD_NOTE_MAP[event.code]
    if (!note) return

    event.preventDefault()
    setPressedNotes((prev) => {
      const next = new Set(prev)
      next.add(note)
      return next
    })
    if (event.repeat) return

    void attackNote(note)
    onNotePress?.(note)
  }

  const handleKeyboardRelease = (event: KeyboardEvent<HTMLDivElement>) => {
    const note = KEYBOARD_NOTE_MAP[event.code]
    if (!note) return

    void releaseNote(note)
    setPressedNotes((prev) => {
      if (!prev.has(note)) return prev
      const next = new Set(prev)
      next.delete(note)
      return next
    })
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    setPressedNotes(new Set())
  }

  return (
    <div className="my-8">
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyboardPlay}
        onKeyUp={handleKeyboardRelease}
        onBlur={handleBlur}
        className="group inline-block rounded-xl p-3 transition-colors focus-within:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 mb-4"
      >
        <div className="inline-flex items-stretch gap-2">
          <div className="relative inline-flex select-none rounded-b-lg overflow-visible" style={{ height: WHITE_H }}>
            {/*
            MARK: White keys 
            */}
            {WHITE_KEYS.map((key) => (
              <button
                key={key.note}
                onMouseDown={(event) => {
                  event.preventDefault()
                  setPressedNotes((prev) => new Set(prev).add(key.note))
                  void attackNote(key.note)
                  onNotePress?.(key.note)
                }}
                onMouseUp={() => {
                  setPressedNotes((prev) => { const n = new Set(prev); n.delete(key.note); return n })
                  void releaseNote(key.note)
                }}
                onMouseLeave={() => {
                  setPressedNotes((prev) => { const n = new Set(prev); n.delete(key.note); return n })
                  void releaseNote(key.note)
                }}
                style={{ width: WHITE_W, height: WHITE_H }}
                className={`relative border-2 border-zinc-300 rounded-b-xl flex flex-col items-center justify-end pb-2 gap-0.5 transition-colors duration-75 focus:outline-none z-0 -ml-0.5 ${
                  pressedNotes.has(key.note)
                    ? 'bg-green-200'
                    : 'bg-white hover:bg-green-100 active:bg-green-200'
                }`}
              >
                <span className="text-sm font-semibold text-amber-500">{key.solfege}</span>
                <span className="text-xs text-gray-500">{key.label}</span>
                <span className="pointer-events-none absolute left-1/2 -bottom-6 -translate-x-1/2 rounded border border-zinc-300 bg-white px-1 text-[10px] font-semibold leading-4 text-zinc-700 shadow-sm opacity-0 transition-opacity group-focus-within:opacity-100">
                  {NOTE_SHORTCUT_LABEL_MAP[key.note]}
                </span>
              </button>
            ))}

            {/*
            MARK: Black keys
            */}
            {BLACK_KEYS.map((key) => (
              <button
                key={key.note}
                onMouseDown={(event) => {
                  event.preventDefault()
                  setPressedNotes((prev) => new Set(prev).add(key.note))
                  void attackNote(key.note)
                  onNotePress?.(key.note)
                }}
                onMouseUp={() => {
                  setPressedNotes((prev) => { const n = new Set(prev); n.delete(key.note); return n })
                  void releaseNote(key.note)
                }}
                onMouseLeave={() => {
                  setPressedNotes((prev) => { const n = new Set(prev); n.delete(key.note); return n })
                  void releaseNote(key.note)
                }}
                style={{
                  position: 'absolute',
                  left: key.afterWhite * (WHITE_W - 2) + WHITE_W - BLACK_W / 2 - 2,
                  width: BLACK_W,
                  height: BLACK_H,
                  top: 0,
                }}
                className={`rounded-b-xl z-10 transition-colors duration-75 focus:outline-none ${
                  pressedNotes.has(key.note)
                    ? 'bg-green-700'
                    : 'bg-zinc-900 hover:bg-green-900 active:bg-green-900'
                }`}
              >
                <span className="pointer-events-none absolute left-1/2 -top-6 -translate-x-1/2 rounded border border-zinc-300 bg-white px-1 text-[10px] font-semibold leading-4 text-zinc-700 shadow-sm opacity-0 transition-opacity group-focus-within:opacity-100">
                  {NOTE_SHORTCUT_LABEL_MAP[key.note]}
                </span>
              </button>
            ))}
          </div>
          <div
            aria-hidden
            style={{ width: 40, height: WHITE_H }}
            className="rounded-md border border-dashed border-zinc-300 bg-zinc-100/70 cursor-pointer transition-colors hover:bg-zinc-200/80"
            onMouseDown={(event) => {
              event.preventDefault()
              containerRef.current?.focus()
            }}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        点击琴键试听 · Click keys to play 
      </p>
    </div>
  )
}
