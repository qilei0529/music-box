'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Settings } from 'lucide-react'

import { AudioInstrument, playNote } from '@/lib/audio'
import PianoKeys from '@/components/PianoKeys'

export interface ScrollingScoreNote {
  note?: string
  notes?: string[]
  atBeat?: number
  durationBeats?: number
  beats?: number
  label?: string
  isRest?: boolean
}

export interface ScrollingScoreLane {
  id: string
  label?: string
  instrument?: AudioInstrument
  notes: ScrollingScoreNote[]
}

interface ScrollingScoreProps {
  notes?: ScrollingScoreNote[]
  lanes?: ScrollingScoreLane[]
  bpm: number
  beatsPerBar?: number
  pixelsPerBeat?: number
  lookAheadBeats?: number
  loop?: boolean
}

const END_PADDING_BEATS = 1.5
const LANE_HEIGHT = 52
const LANE_GAP = 10
const LANE_PADDING_Y = 8
const NOTE_HEIGHT = 36

function beatsToSeconds(beats: number, effectiveBpm: number) {
  return (beats * 60) / effectiveBpm
}

function formatDuration(beats: number) {
  if (Number.isInteger(beats)) return `${beats} beat${beats > 1 ? 's' : ''}`
  return `${beats.toFixed(2)} beats`
}

export default function ScrollingScore({
  notes,
  lanes,
  bpm,
  beatsPerBar = 4,
  pixelsPerBeat = 72,
  lookAheadBeats = 2,
  loop = false,
}: ScrollingScoreProps) {
  // MARK: Transport and UI state.
  const [isPlaying, setIsPlaying] = useState(false)
  const [transportBeats, setTransportBeats] = useState(0)
  const [activeEventByLane, setActiveEventByLane] = useState<Record<string, string>>({})
  const [viewportWidth, setViewportWidth] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mutedLanes, setMutedLanes] = useState<Set<string>>(new Set())
  const [soloLanes, setSoloLanes] = useState<Set<string>>(new Set())
  const [isPracticeMode, setIsPracticeMode] = useState(false)
  const [practiceResults, setPracticeResults] = useState<Map<string, 'correct' | 'incorrect'>>(new Map())

  const viewportRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const baseBeatsRef = useRef(0)
  const transportBeatsRef = useRef(0)
  const toneRef = useRef<typeof import('tone') | null>(null)
  const scheduledEventIdsRef = useRef<number[]>([])
  const runTokenRef = useRef(0)
  const mutedLanesRef = useRef<Set<string>>(new Set())
  const soloLanesRef = useRef<Set<string>>(new Set())
  const isPracticeModeRef = useRef(false)

  const effectiveBpm = bpm * speed
  const playheadX = viewportWidth / 3

  // MARK: Normalize lanes and default instrument metadata.
  const normalizedLanes = useMemo<ScrollingScoreLane[]>(() => {
    if (lanes && lanes.length > 0) {
      return lanes.map((lane) => ({
        ...lane,
        label: lane.label ?? lane.id,
        instrument: lane.instrument ?? 'piano',
      }))
    }

    return [
      {
        id: 'main',
        label: 'Main',
        instrument: 'piano',
        notes: notes ?? [],
      },
    ]
  }, [lanes, notes])

  const laneIndexMap = useMemo(
    () =>
      normalizedLanes.reduce<Record<string, number>>(
        (acc, lane, index) => ({ ...acc, [lane.id]: index }),
        {},
      ),
    [normalizedLanes],
  )

  // MARK: Normalize lane events (single note / chord / rest) and render metrics.
  const processedEvents = useMemo(() => {
    const normalized = normalizedLanes.flatMap((lane, laneIndex) =>
      lane.notes.reduce<{
        items: Array<
          ScrollingScoreNote & {
            id: string
            laneId: string
            laneLabel: string
            laneInstrument: AudioInstrument
            laneIndex: number
            durationBeats: number
            atBeat: number
            pitches: string[]
            isRest: boolean
          }
        >
        nextBeat: number
      }>(
        (acc, note, originalIndex) => {
          const durationBeats = note.durationBeats ?? note.beats ?? 1
          const atBeat = note.atBeat ?? acc.nextBeat
          const pitches = note.notes?.length ? note.notes : note.note ? [note.note] : []
          const isRest = note.isRest ?? pitches.length === 0

          return {
            items: [
              ...acc.items,
              {
                ...note,
                id: `${lane.id}-${originalIndex}-${atBeat}`,
                laneId: lane.id,
                laneLabel: lane.label ?? lane.id,
                laneInstrument: lane.instrument ?? 'piano',
                laneIndex,
                durationBeats,
                atBeat,
                pitches,
                isRest,
              },
            ],
            nextBeat: note.atBeat === undefined ? acc.nextBeat + durationBeats : acc.nextBeat,
          }
        },
        { items: [], nextBeat: 0 },
      ).items,
    )

    return normalized
      .sort((a, b) =>
        a.atBeat === b.atBeat ? a.laneIndex - b.laneIndex : a.atBeat - b.atBeat,
      )
      .map((event, index) => {
        const triggerBeat = lookAheadBeats + event.atBeat
        return {
          ...event,
          index,
          triggerBeat,
          startPx: triggerBeat * pixelsPerBeat,
          widthPx: Math.max(event.durationBeats * pixelsPerBeat - 8, 28),
        }
      })
  }, [lookAheadBeats, normalizedLanes, pixelsPerBeat])

  const songTotalBeats = useMemo(() => {
    return processedEvents.reduce((max, event) => {
      return Math.max(max, event.atBeat + event.durationBeats)
    }, 0)
  }, [processedEvents])

  const laneTrackHeight = Math.max(
    normalizedLanes.length * LANE_HEIGHT + Math.max(normalizedLanes.length - 1, 0) * LANE_GAP,
    LANE_HEIGHT,
  )
  const innerTrackHeight = laneTrackHeight + LANE_PADDING_Y * 2

  const totalTrackBeats = lookAheadBeats + songTotalBeats + END_PADDING_BEATS
  const totalTrackWidth = totalTrackBeats * pixelsPerBeat
  const finishBeat = lookAheadBeats + songTotalBeats + END_PADDING_BEATS / 2
  const trackOffsetPx = playheadX - transportBeats * pixelsPerBeat

  // MARK: Find the last crossed event for each lane.
  const lastCrossedByLane = useMemo(() => {
    return processedEvents.reduce<Record<string, string>>((acc, event) => {
      if (event.triggerBeat <= transportBeats) {
        return { ...acc, [event.laneId]: event.id }
      }
      return acc
    }, {})
  }, [processedEvents, transportBeats])

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

  const isLaneAudible = useCallback((laneId: string) => {
    const soloSet = soloLanesRef.current
    const mutedSet = mutedLanesRef.current

    if (soloSet.size > 0) {
      return soloSet.has(laneId) && !mutedSet.has(laneId)
    }

    return !mutedSet.has(laneId)
  }, [])

  // MARK: Schedule lane events with Tone transport for tighter timing.
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

      processedEvents.forEach((event) => {
        if (event.triggerBeat < fromBeat) return

        const delaySec = beatsToSeconds(event.triggerBeat - fromBeat, effectiveBpm)
        const eventId = Tone.Transport.scheduleOnce((time) => {
          if (!event.isRest && isLaneAudible(event.laneId) && !isPracticeModeRef.current) {
            const durationSec = beatsToSeconds(event.durationBeats, effectiveBpm)
            event.pitches.forEach((pitch) => {
              void playNote(pitch, durationSec, time, {
                voiceKey: `${event.laneId}:${event.laneInstrument}`,
                instrument: event.laneInstrument,
              })
            })
          }

          setActiveEventByLane((prev) => ({ ...prev, [event.laneId]: event.id }))
        }, `+${delaySec}`)

        scheduledEventIdsRef.current.push(eventId)
      })

      baseBeatsRef.current = fromBeat
      transportBeatsRef.current = fromBeat
      setTransportBeats(fromBeat)
      Tone.Transport.start('+0')
      setIsPlaying(true)
    },
    [effectiveBpm, isLaneAudible, processedEvents],
  )

  useEffect(() => {
    mutedLanesRef.current = mutedLanes
  }, [mutedLanes])

  useEffect(() => {
    soloLanesRef.current = soloLanes
  }, [soloLanes])

  useEffect(() => {
    isPracticeModeRef.current = isPracticeMode
  }, [isPracticeMode])

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

  // MARK: Keep visual scroll position in sync with audio transport.
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
          setActiveEventByLane({})
          setPracticeResults(new Map())
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
    if (!processedEvents.length) return

    if (isPlaying) {
      stopTransport()
      setIsPlaying(false)
      return
    }

    const resumeBeat = transportBeats >= finishBeat ? 0 : transportBeats
    if (resumeBeat === 0) {
      setActiveEventByLane({})
      setPracticeResults(new Map())
    }
    void beginPlayback(resumeBeat)
  }

  const handleReset = () => {
    stopTransport()
    setIsPlaying(false)
    setTransportBeats(0)
    transportBeatsRef.current = 0
    setActiveEventByLane({})
    baseBeatsRef.current = 0
    setPracticeResults(new Map())
  }

  const toggleMuteLane = (laneId: string) => {
    setMutedLanes((prev) => {
      const next = new Set(prev)
      if (next.has(laneId)) {
        next.delete(laneId)
      } else {
        next.add(laneId)
      }
      return next
    })
  }

  const handlePracticeNotePress = useCallback((pressedNote: string) => {
    const currentActiveIds = new Set(Object.values(activeEventByLane))
    const currentEvents = processedEvents.filter(
      (e) => currentActiveIds.has(e.id) && !e.isRest,
    )
    if (currentEvents.length === 0) return

    setPracticeResults((prev) => {
      const next = new Map(prev)
      currentEvents.forEach((event) => {
        if (event.pitches.includes(pressedNote)) {
          next.set(event.id, 'correct')
        } else if (!next.has(event.id)) {
          next.set(event.id, 'incorrect')
        }
      })
      return next
    })
  }, [activeEventByLane, processedEvents])

  const handleTogglePracticeMode = () => {
    if (isPlaying) {
      stopTransport()
      setIsPlaying(false)
    }
    setPracticeResults(new Map())
    setIsPracticeMode((prev) => !prev)
  }

  const toggleSoloLane = (laneId: string) => {
    setSoloLanes((prev) => {
      const next = new Set(prev)
      if (next.has(laneId)) {
        next.delete(laneId)
      } else {
        next.add(laneId)
      }
      return next
    })
  }

  const barLineCount = Math.floor(songTotalBeats / beatsPerBar) + 1

  return (
    <section
      className="my-6 rounded-xl border-2 border-zinc-200 bg-zinc-50 p-4"
      onKeyDown={(e) => {
        if (isPracticeMode && e.code === 'Space') {
          e.preventDefault()
          handlePlayPause()
        }
        if (isPracticeMode && e.code === 'Escape') {
          handleTogglePracticeMode()
        }
        if (!isPlaying && e.code === 'KeyR') {
          handleReset()
        }
      }}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause' : 'Play'}
          className="rounded-md bg-amber-500 px-4 py-1 text-sm font-semibold text-white transition-colors border-2 border-amber-600 h-8 hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
          disabled={!processedEvents.length}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border-2 border-zinc-300 bg-white px-4 py-1 text-sm font-semibold h-8 text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          Reset
        </button>
        <label className="ml-1 inline-flex items-center gap-2 text-sm text-zinc-600">
          Speed
          <select
            value={speed}
            onChange={(event) => handleSpeedChange(Number(event.target.value))}
            className="rounded-md border-2 font-bold border-zinc-300 bg-white px-2 py-1 text-sm"
          >
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-label={showAdvanced ? 'Hide advanced controls' : 'Show advanced controls'}
          title={showAdvanced ? 'Hide advanced controls' : 'Show advanced controls'}
          className={`ml-1 h-8 rounded-md border-2 border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 transition-colors  ${showAdvanced ? 'text-zinc-600 bg-zinc-200' : 'hover:bg-zinc-100'}`}
        >
          <Settings className={`h-4.5 w-4.5 transition-transform ${showAdvanced ? 'text-zinc-600 rotate-90' : ''}`} />
        </button>
        <button
          type="button"
          onClick={handleTogglePracticeMode}
          className={`ml-auto h-8 rounded-md border-2 px-3 py-1 text-xs font-semibold transition-colors ${
            isPracticeMode
              ? 'border-green-400 bg-green-100 text-green-700 hover:bg-green-200'
              : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          {isPracticeMode ? '退出练习' : '🎹 练习'}
        </button>
      </div>

      {/* MARK: Lane controls */}
      {showAdvanced && (
        <div className="mb-3 flex flex-wrap gap-2">
          {normalizedLanes.map((lane) => (
            <div
              key={lane.id}
              className="inline-flex items-center gap-2 rounded-md border-2 border-zinc-300 bg-white px-2 py-1 h-8"
            >
              <span className="text-xs font-semibold text-zinc-700">{lane.label}</span>
              <span className="rounded bg-zinc-100 px-1 py-0.5 text-[10px] text-zinc-500">
                {lane.instrument}
              </span>
              <button
                type="button"
                onClick={() => toggleMuteLane(lane.id)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  mutedLanes.has(lane.id)
                    ? 'bg-red-100 text-red-700'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                M
              </button>
              <button
                type="button"
                onClick={() => toggleSoloLane(lane.id)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  soloLanes.has(lane.id)
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                S
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        ref={viewportRef}
        className="relative overflow-hidden rounded-lg border-2 border-zinc-200 bg-white"
        style={{ height: innerTrackHeight }}
      >
        {/* MARK: Fixed lane labels (left side) */}
        {normalizedLanes.map((lane, laneIndex) => {
          const top =
            LANE_PADDING_Y + laneIndex * (LANE_HEIGHT + LANE_GAP) + (LANE_HEIGHT - 20) / 2
          return (
            <div
              key={`lane-label-${lane.id}`}
              className="pointer-events-none absolute left-2 z-20 rounded-lg border-2 border-zinc-300 bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600"
              style={{ top }}
            >
              {lane.label}
            </div>
          )
        })}

        <div
          aria-hidden
          className="absolute bottom-0 top-0 w-1 z-10 bg-red-500"
          style={{ left: '33.333%' }}
        />

        <div
          className="relative"
          style={{
            width: totalTrackWidth,
            height: innerTrackHeight,
            transform: `translateX(${trackOffsetPx}px)`,
            willChange: 'transform',
          }}
        >
          {normalizedLanes.map((lane, laneIndex) => {
            const top = LANE_PADDING_Y + laneIndex * (LANE_HEIGHT + LANE_GAP)
            return (
              <div
                key={`lane-bg-${lane.id}`}
                aria-hidden
                className="absolute left-0 right-0 rounded-sm bg-zinc-50/70"
                style={{ top, height: LANE_HEIGHT }}
              />
            )
          })}

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
          {processedEvents.map((event) => {
            const laneIndex = laneIndexMap[event.laneId] ?? 0
            const top =
              LANE_PADDING_Y + laneIndex * (LANE_HEIGHT + LANE_GAP) + (LANE_HEIGHT - NOTE_HEIGHT) / 2
            const isCurrent =
              activeEventByLane[event.laneId] === event.id ||
              (!isPlaying && lastCrossedByLane[event.laneId] === event.id)
            const practiceResult = practiceResults.get(event.id)
            const displayLabel = event.isRest
              ? 'Rest'
              : event.label ?? (event.pitches.length > 1 ? event.pitches.join(' · ') : event.pitches[0])

            return (
              <div
                key={event.id}
                className={`absolute rounded-xl border-2 px-2 py-1 text-center text-xs font-semibold transition-colors ${
                  event.isRest
                    ? 'border-zinc-200 bg-zinc-100 text-zinc-400'
                    : practiceResult === 'correct'
                    ? 'border-green-400 bg-green-100 text-green-800'
                    : practiceResult === 'incorrect'
                    ? 'border-red-400 bg-red-100 text-red-800'
                    : isCurrent
                    ? 'border-amber-400 bg-amber-100 text-amber-800'
                    : 'border-zinc-300 bg-zinc-100 text-zinc-700'
                }`}
                style={{
                  left: event.startPx,
                  top,
                  width: event.widthPx,
                  height: NOTE_HEIGHT,
                }}
                title={`${displayLabel} (${formatDuration(event.durationBeats)})`}
              >
                <div className="truncate">{displayLabel}</div>
                {event.isRest ? (
                  <div className="text-[10px] font-normal text-zinc-500">Rest</div>
                ) : event.pitches.length > 1 ? (
                  <div className="text-[10px] font-normal text-zinc-500">
                    Chord ({event.pitches.length})
                  </div>
                ) : (
                  <div className="text-[10px] font-normal text-zinc-500">{event.pitches[0]}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {isPracticeMode && (
        <div className="mt-4 border-t-2 border-zinc-200 pt-2">
          <PianoKeys onNotePress={handlePracticeNotePress} autoFocus />
        </div>
      )}

      <p className="mt-3 text-xs text-zinc-500">
        {isPracticeMode
          ? '练习模式：按下正确的琴键，绿色 = 正确，红色 = 错误。'
          : `Red line is the playhead. Notes trigger when note start crosses the line.${showAdvanced ? ' Use lane M/S buttons for mute/solo.' : ''}`}
      </p>
    </section>
  )
}
