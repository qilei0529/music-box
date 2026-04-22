let toneRef: typeof import('tone') | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const synthMap = new Map<string, any>()

export type AudioInstrument = 'triangle' | 'sine' | 'square' | 'sawtooth'

interface PlayNoteOptions {
  voiceKey?: string
  instrument?: AudioInstrument
  volume?: number
}

async function getTone() {
  if (!toneRef) {
    toneRef = await import('tone')
  }
  return toneRef
}

async function getSynth(options?: PlayNoteOptions) {
  const Tone = await getTone()
  const instrument = options?.instrument ?? 'triangle'
  const voiceKey = options?.voiceKey ?? `default:${instrument}`

  const existing = synthMap.get(voiceKey)
  if (existing) return existing

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: instrument },
    envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.5 },
  }).toDestination()
  synth.volume.value = options?.volume ?? -8
  synthMap.set(voiceKey, synth)

  return synth
}

export async function playNote(
  note: string,
  duration: string | number = '8n',
  atTime?: number,
  options?: PlayNoteOptions,
) {
  if (typeof window === 'undefined') return

  const Tone = await getTone()
  await Tone.start()

  const synth = await getSynth(options)

  synth.triggerAttackRelease(note, duration, atTime)
}
