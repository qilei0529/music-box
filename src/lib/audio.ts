// eslint-disable-next-line @typescript-eslint/no-explicit-any
let synthInstance: any = null

export async function playNote(note: string, duration = '8n') {
  if (typeof window === 'undefined') return

  const Tone = await import('tone')
  await Tone.start()

  if (!synthInstance) {
    synthInstance = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' as const },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.5 },
    }).toDestination()
    synthInstance.volume.value = -8
  }

  synthInstance.triggerAttackRelease(note, duration)
}
