'use client'

import Link from 'next/link'
import { Sparkles, X } from 'lucide-react'
import { useState } from 'react'

export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="mx-4 md:mx-6 mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
      <Sparkles className="w-4 h-4 text-primary shrink-0" />
      <p className="text-sm flex-1">
        <span className="font-medium text-foreground">Complete seu perfil</span>{' '}
        <span className="text-muted-foreground">para ativar notificações e personalizar sua experiência.</span>
      </p>
      <Link
        href="/onboarding"
        className="text-xs font-semibold text-primary hover:underline shrink-0"
      >
        Configurar agora
      </Link>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
