'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: 'sans-serif', background: '#fff', padding: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Erro crítico</h1>
        <p style={{ color: '#64748b', maxWidth: '400px' }}>
          Ocorreu um erro crítico na aplicação. Por favor, recarregue a página.
        </p>
        <Button onClick={reset}>Recarregar</Button>
      </body>
    </html>
  )
}
