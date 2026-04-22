'use client'

import { playNote } from '@/lib/audio'

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
const BLACK_W = 32
const BLACK_H = 94

export default function PianoKeys() {
  return (
    <div className="my-6">
      <div
        className="relative inline-flex select-none rounded-b-lg overflow-visible"
        style={{ height: WHITE_H }}
      >
        {/* White keys */}
        {WHITE_KEYS.map((key) => (
          <button
            key={key.note}
            onClick={() => playNote(key.note)}
            style={{ width: WHITE_W, height: WHITE_H }}
            className="relative border border-gray-300 bg-white hover:bg-amber-50 active:bg-amber-100 rounded-b-md flex flex-col items-center justify-end pb-2 gap-0.5 transition-colors duration-75 focus:outline-none z-0 shadow-sm"
          >
            <span className="text-xs font-semibold text-amber-500">{key.solfege}</span>
            <span className="text-[10px] text-gray-400">{key.label}</span>
          </button>
        ))}

        {/* Black keys */}
        {BLACK_KEYS.map((key) => (
          <button
            key={key.note}
            onClick={() => playNote(key.note)}
            style={{
              position: 'absolute',
              left: key.afterWhite * WHITE_W + WHITE_W - BLACK_W / 2,
              width: BLACK_W,
              height: BLACK_H,
              top: 0,
            }}
            className="bg-gray-900 hover:bg-gray-700 active:bg-gray-600 rounded-b-md z-10 transition-colors duration-75 focus:outline-none shadow-md"
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">点击琴键试听 · Click keys to play</p>
    </div>
  )
}
