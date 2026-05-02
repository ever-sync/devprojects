import * as Sentry from '@sentry/nextjs'

type Level = 'error' | 'warn' | 'info'

function isSentryEnabled() {
  return !!(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN)
}

export function logError(message: string, error?: unknown, context?: Record<string, unknown>) {
  console.error(message, error)

  if (!isSentryEnabled()) return

  if (error instanceof Error) {
    Sentry.withScope((scope) => {
      scope.setExtra('message', message)
      if (context) scope.setExtras(context)
      Sentry.captureException(error)
    })
  } else {
    Sentry.captureMessage(message, {
      level: 'error',
      extra: { error, ...context },
    })
  }
}

export function logWarn(message: string, context?: Record<string, unknown>) {
  console.warn(message)
  if (!isSentryEnabled()) return
  Sentry.captureMessage(message, { level: 'warning', extra: context })
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  console.error(error)
  if (!isSentryEnabled()) return
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context)
    Sentry.captureException(error)
  })
}
