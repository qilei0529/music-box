'use client'

import { useEffect, useId, useMemo, useState } from 'react'

interface AbcStaffProps {
  notation: string
  title?: string
  className?: string
  options?: Record<string, unknown>
}

export default function AbcStaff({ notation, title, className, options }: AbcStaffProps) {
  const [error, setError] = useState<string | null>(null)
  const chartId = useId()
  const targetId = useMemo(() => `abc-staff-${chartId.replace(/:/g, '-')}`, [chartId])

  useEffect(() => {
    let mounted = true

    async function renderNotation() {
      const safeNotation = notation.trim()

      if (!safeNotation) {
        setError('No notation provided.')
        return
      }

      try {
        setError(null)
        const abcjs = await import('abcjs')

        if (!mounted) return

        abcjs.renderAbc(targetId, safeNotation, {
          responsive: 'resize',
          add_classes: true,
          ...options,
        })
      } catch (renderError) {
        if (!mounted) return

        const message =
          renderError instanceof Error ? renderError.message : 'Failed to render notation.'
        setError(message)
      }
    }

    void renderNotation()

    return () => {
      mounted = false
    }
  }, [notation, options, targetId])

  return (
    <div className={`${className} rounded-xl mb-4`}>
      {title ? <p className="mb-2 text-sm font-medium">{title}</p> : null}
      <div id={targetId} className='bg-zinc-50' />
      {error ? <p className="mt-2 text-sm text-red-600">ABC render error: {error}</p> : null}
    </div>
  )
}
