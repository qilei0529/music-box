'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { playNote } from '@/lib/audio'

export interface ScrollingScoreNote {
  note: string
  atBeat?: number
  durationBeats?: number
  beats?: number
  label?: string
}

interface ScrollingScoreProps {
  notes: ScrollingScoreNote[]
  bpm: number
  beatsPerBar?: number
  pixelsPerBeat?: number
  lookAheadBeats?: number
  loop?: boolean
}

const END_PADDING_BEATS = 1.5

function beatsToSeconds(beats: number, effectiveBpm: number) {
  return (beats * 60) / effectiveBpm
}

function formatDuration(beats: number) {
  if (Number.isInteger(beats)) return `${beats} beat${beats > 1 ? 's' : ''}`
  return `${beats.toFixed(2)} beats`
}

export default function ScrollingScore({
  notes,
  bpm,
  beatsPerBar = 4,
  pixelsPerBeat = 72,
  lookAheadBeats = 2,
  loop = false,
}: ScrollingScoreProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [transportBeats, setTransportBeats] = useState(0)
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [speed, setSpeed] = useState(1)

  const viewportRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const baseBeatsRef = useRef(0)
  const transportBeatsRef = useRef(0)
  const toneRef = useRef<typeof import('tone') | null>(null)
  const scheduledEventIdsRef = useRef<number[]>([])
  const runTokenRef = useRef(0)

  const effectiveBpm = bpm * speed
  const playheadX = viewportWidth / 3

  // MARK: Normalize note 
  // input and build render metrics.
  const processedNotes = useMemo(() => {
    const normalized = notes.reduce<{
      items: Array<ScrollingScoreNote & { durationBeats: number; atBeat: number; originalIndex: number }>
      nextBeat: number
    }>(
      (acc, note, originalIndex) => {
        const durationBeats = note.durationBeats ?? note.beats ?? 1
        const atBeat = note.atBeat ?? acc.nextBeat
        return {
          items: [...acc.items, { ...note, durationBeats, atBeat, originalIndex }],
          nextBeat: note.atBeat === undefined ? acc.nextBeat + durationBeats : acc.nextBeat,
        }
      },
      { items: [], nextBeat: 0 },
    ).items

    return normalized
      .sort((a, b) =>
        a.atBeat === b.atBeat ? a.originalIndex - b.originalIndex : a.atBeat - b.atBeat,
      )
      .map((note, index) => {
        const triggerBeat = lookAheadBeats + note.atBeat
        return {
          ...note,
          index,
          triggerBeat,
          startPx: triggerBeat * pixelsPerBeat,
          widthPx: Math.max(note.durationBeats * pixelsPerBeat - 8, 28),
        }
      })
  }, [lookAheadBeats, notes, pixelsPerBeat])

  const songTotalBeats = useMemo(() => {
    return processedNotes.reduce((max, note) => {
      return Math.max(max, note.atBeat + note.durationBeats)
    }, 0)
  }, [processedNotes])

  const totalTrackBeats = lookAheadBeats + songTotalBeats + END_PADDING_BEATS
  const totalTrackWidth = totalTrackBeats * pixelsPerBeat
  const finishBeat = lookAheadBeats + songTotalBeats + END_PADDING_BEATS / 2
  const trackOffsetPx = playheadX - transportBeats * pixelsPerBeat

  // MARK: Find the last note
  // that already crossed the playhead.
  const lastCrossedNoteIndex = useMemo(() => {
    if (!processedNotes.length) return null
    for (let i = processedNotes.length - 1; i >= 0; i -= 1) {
      if (processedNotes[i].triggerBeat <= transportBeats) return processedNotes[i].index
    }
    return null
  }, [processedNotes, transportBeats])

  const clearScheduledEvents = useCallback(() => {
    const Tone = toneRef.current
    if (!Tone) return
    scheduledEventIdsRef.current.forEach((eventId) => {
      Tone.Transport.clear(eventId)
    })
    scheduledEventIdsRef.current = []
  }, [])

  const stopTransport = useCallback(() => {
    const Tone = toneRef.current
    if (!Tone) return
    Tone.Transport.stop()
    clearScheduledEvents()
  }, [clearScheduledEvents])

  // MARK: Schedule note playback 
  // with Tone transport for tighter timing.
  const beginPlayback = useCallback(
    async (fromBeat: number) => {
      const token = ++runTokenRef.current
      const Tone = await import('tone')
      await Tone.start()
      if (token !== runTokenRef.current) return

      toneRef.current = Tone
      Tone.Transport.stop()
      Tone.Transport.cancel(0)
      scheduledEventIdsRef.current = []
      Tone.Transport.bpm.value = effectiveBpm

      processedNotes.forEach((note) => {
        if (note.triggerBeat < fromBeat) return

        const delaySec = beatsToSeconds(note.triggerBeat - fromBeat, effectiveBpm)
        const eventId = Tone.Transport.scheduleOnce((time) => {
          void playNote(
            note.note,
            beatsToSeconds(note.durationBeats, effectiveBpm),
            time,
          )
          setActiveNoteIndex(note.index)
        }, `+${delaySec}`)

        scheduledEventIdsRef.current.push(eventId)
      })

      baseBeatsRef.current = fromBeat
      transportBeatsRef.current = fromBeat
      setTransportBeats(fromBeat)
      Tone.Transport.start('+0')
      setIsPlaying(true)
    },
    [effectiveBpm, processedNotes],
  )

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      setViewportWidth(entry.contentRect.width)
    })

    observer.observe(viewport)
    setViewportWidth(viewport.clientWidth)

    return () => observer.disconnect()
  }, [])

  // MARK: Keep visual 
  // scroll position in sync with audio transport.
  useEffect(() => {
    if (!isPlaying) return

    const tick = () => {
      const Tone = toneRef.current
      if (!Tone) return

      const currentBeats = baseBeatsRef.current + (Tone.Transport.seconds * effectiveBpm) / 60
      transportBeatsRef.current = currentBeats
      setTransportBeats(currentBeats)

      if (currentBeats >= finishBeat) {
        stopTransport()

        if (loop) {
          transportBeatsRef.current = 0
          setTransportBeats(0)
          setActiveNoteIndex(null)
          setIsPlaying(false)
          void beginPlayback(0)
          return
        }

        setIsPlaying(false)
        transportBeatsRef.current = finishBeat
        setTransportBeats(finishBeat)
        return
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [beginPlayback, effectiveBpm, finishBeat, isPlaying, loop, stopTransport])

  // MARK: Speed change 
  // while playing requires re-scheduling future events.
  const handleSpeedChange = (nextSpeed: number) => {
    setSpeed(nextSpeed)
    if (!isPlaying) return

    stopTransport()
    setIsPlaying(false)
    void beginPlayback(transportBeatsRef.current)
  }

  const handlePlayPause = () => {
    if (!notes.length) return

    if (isPlaying) {
      stopTransport()
      setIsPlaying(false)
      return
    }

    const resumeBeat = transportBeats >= finishBeat ? 0 : transportBeats
    if (resumeBeat === 0) {
      setActiveNoteIndex(null)
    }
    void beginPlayback(resumeBeat)
  }

  const handleReset = () => {
    stopTransport()
    setIsPlaying(false)
    setTransportBeats(0)
    transportBeatsRef.current = 0
    setActiveNoteIndex(null)
    baseBeatsRef.current = 0
  }

  const barLineCount = Math.floor(songTotalBeats / beatsPerBar) + 1

  return (
    <section className="my-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePlayPause}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
          disabled={!notes.length}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          Reset
        </button>
        <label className="ml-1 inline-flex items-center gap-2 text-sm text-zinc-600">
          Speed
          <select
            value={speed}
            onChange={(event) => handleSpeedChange(Number(event.target.value))}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
          </select>
        </label>
      </div>

      <div
        ref={viewportRef}
        className="relative h-28 overflow-hidden rounded-lg border border-zinc-200 bg-white"
      >
        <div
          aria-hidden
          className="absolute bottom-0 top-0 w-0.5 bg-red-500"
          style={{ left: '33.333%' }}
        />

        <div
          className="relative h-full"
          style={{
            width: totalTrackWidth,
            transform: `translateX(${trackOffsetPx}px)`,
            willChange: 'transform',
          }}
        >
          {/* MARK: Bar guides
           */}
          {Array.from({ length: barLineCount }, (_, index) => {
            const x = (lookAheadBeats + index * beatsPerBar) * pixelsPerBeat
            return (
              <div
                key={`bar-${index}`}
                aria-hidden
                className="absolute bottom-0 top-0 border-l border-dashed border-zinc-200"
                style={{ left: x }}
              />
            )
          })}

          {/* MARK: Note blocks
           */}
          {processedNotes.map((note) => {
            const isCurrent =
              activeNoteIndex === note.index ||
              (!isPlaying && lastCrossedNoteIndex !== null && note.index === lastCrossedNoteIndex)

            return (
              <div
                key={`${note.note}-${note.index}`}
                className={`absolute top-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-center text-xs font-semibold transition-colors ${
                  isCurrent
                    ? 'border-amber-400 bg-amber-100 text-amber-800'
                    : 'border-zinc-300 bg-zinc-100 text-zinc-700'
                }`}
                style={{
                  left: note.startPx,
                  width: note.widthPx,
                }}
                title={`${note.note} (${formatDuration(note.durationBeats)})`}
              >
                <div>{note.label ?? note.note}</div>
                <div className="text-[10px] font-normal text-zinc-500">{note.note}</div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Red line is the playhead. Notes play when the note start crosses the line.
        Tempo: {Math.round(effectiveBpm)} BPM.
      </p>
    </section>
  )
}
