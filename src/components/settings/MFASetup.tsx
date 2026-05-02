'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface MFASetupProps {
  hasMFA: boolean
  factorId: string | null
}

type Step = 'idle' | 'enrolling' | 'verifying' | 'done' | 'unenrolling'

export function MFASetup({ hasMFA, factorId: initialFactorId }: MFASetupProps) {
  const [step, setStep] = useState<Step>('idle')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [currentFactorId, setCurrentFactorId] = useState(initialFactorId)
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mfaEnabled, setMfaEnabled] = useState(hasMFA)

  async function startEnroll() {
    setError(null)
    setStep('enrolling')
    const supabase = createClient()

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ReobotLabs Portal' })
    if (error || !data) {
      setError('Erro ao iniciar configuração de MFA.')
      setStep('idle')
      return
    }

    setCurrentFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setStep('verifying')
  }

  async function verifyCode() {
    if (!currentFactorId || code.length !== 6) return
    setError(null)
    const supabase = createClient()

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: currentFactorId })
    if (challengeError) {
      setError('Erro ao criar desafio MFA.')
      return
    }
    setChallengeId(challenge.id)

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: currentFactorId,
      challengeId: challenge.id,
      code,
    })

    if (verifyError) {
      setError('Código inválido. Verifique o app e tente novamente.')
      return
    }

    setMfaEnabled(true)
    setStep('done')
  }

  async function unenroll() {
    if (!currentFactorId) return
    setError(null)
    setStep('unenrolling')
    const supabase = createClient()

    const { error } = await supabase.auth.mfa.unenroll({ factorId: currentFactorId })
    if (error) {
      setError('Erro ao remover MFA.')
      setStep('idle')
      return
    }

    setMfaEnabled(false)
    setCurrentFactorId(null)
    setStep('idle')
  }

  if (mfaEnabled && step !== 'unenrolling') {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-md">
        <div className="flex items-center gap-3 text-green-600">
          <ShieldCheck className="h-6 w-6" />
          <div>
            <p className="font-semibold">MFA ativado</p>
            <p className="text-sm text-muted-foreground">Autenticação de dois fatores está ativa na sua conta.</p>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button variant="destructive" size="sm" onClick={unenroll} className="gap-2">
          <ShieldOff className="h-4 w-4" />
          Desativar MFA
        </Button>
      </div>
    )
  }

  if (step === 'verifying' && qrCode) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-5 max-w-md">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <p className="font-semibold">Configurar autenticador</p>
            <p className="text-sm text-muted-foreground">Escaneie o QR code com Google Authenticator ou Authy.</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg border border-border p-2 bg-white">
            <Image src={qrCode} alt="QR Code MFA" width={180} height={180} unoptimized />
          </div>
          {secret && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Ou insira manualmente:</p>
              <code className="text-xs bg-muted px-3 py-1.5 rounded font-mono tracking-widest">{secret}</code>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Código de 6 dígitos</Label>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-lg tracking-widest font-mono"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={verifyCode} disabled={code.length !== 6} className="flex-1">
            Verificar e ativar
          </Button>
          <Button variant="outline" onClick={() => setStep('idle')}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-md">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="font-semibold">MFA desativado</p>
          <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança à sua conta.</p>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={startEnroll} disabled={step === 'enrolling'} className="gap-2">
        {step === 'enrolling' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
        Ativar autenticação de dois fatores
      </Button>
    </div>
  )
}
