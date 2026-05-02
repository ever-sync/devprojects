'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    function onInstalled() {
      setDeferredPrompt(null)
      setIsHidden(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!deferredPrompt || isHidden) return null

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
      <p className="text-sm font-medium text-foreground">Instalar app</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Instale o portal para abrir mais rapido e usar em tela cheia.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          onClick={async () => {
            await deferredPrompt.prompt()
            await deferredPrompt.userChoice
            setDeferredPrompt(null)
          }}
        >
          Instalar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsHidden(true)}>
          Agora nao
        </Button>
      </div>
    </div>
  )
}
