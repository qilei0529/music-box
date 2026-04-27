let toneRef: typeof import('tone') | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const synthMap = new Map<string, any>()

export type AudioInstrument = 'piano' | 'triangle' | 'sine' | 'square' | 'sawtooth'

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
  const instrument = options?.instrument ?? 'piano'
  const voiceKey = options?.voiceKey ?? `default:${instrument}`

  const existing = synthMap.get(voiceKey)
  if (existing) return existing

  if (instrument === 'piano') {
    try {
      const sampler = new Tone.Sampler({
        urls: {
          A3: 'A3.mp3',
          C4: 'C4.mp3',
          'D#4': 'Ds4.mp3',
          'F#4': 'Fs4.mp3',
          A4: 'A4.mp3',
        },
        release: 1.3,
        baseUrl: 'https://tonejs.github.io/audio/salamander/',
      }).toDestination()
      sampler.volume.value = options?.volume ?? -6
      await Tone.loaded()
      synthMap.set(voiceKey, sampler)
      return sampler
    } catch {
      // Fall back to synth when sample loading is unavailable.
    }
  }

  const fallbackOscillatorType = instrument === 'piano' ? 'triangle' : instrument

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: fallbackOscillatorType },
    envelope: { attack: 0.008, decay: 0.5, sustain: 0.18, release: 1.8 },
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

export async function attackNote(note: string, options?: PlayNoteOptions) {
  if (typeof window === 'undefined') return
  const Tone = await getTone()
  await Tone.start()
  const synth = await getSynth(options)
  if (options?.volume !== undefined) {
    synth.volume.value = options.volume
  }
  synth.triggerAttack(note, Tone.now())
}

export async function releaseNote(note: string, options?: PlayNoteOptions) {
  if (typeof window === 'undefined') return
  const Tone = await getTone()
  const synth = await getSynth(options)
  synth.triggerRelease(note, Tone.now())
}
