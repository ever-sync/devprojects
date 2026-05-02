'use client'

import { useEffect } from 'react'

export function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // Registro best-effort: não interrompe UX se falhar.
      })
  }, [])

  return null
}
