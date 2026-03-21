'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfile, updateNotificationSettings } from '@/actions/profile'
import { toast } from 'sonner'
import { Check, ChevronRight, Loader2, Bell, User, Rocket } from 'lucide-react'
import type { Profile, NotificationSettings } from '@/types'

interface OnboardingWizardProps {
  profile: Profile
  clientId: string | null
  initialSettings: NotificationSettings
}

const STEPS = [
  { id: 1, label: 'Perfil', icon: User },
  { id: 2, label: 'Notificações', icon: Bell },
  { id: 3, label: 'Pronto!', icon: Rocket },
]

export function OnboardingWizard({ profile, clientId, initialSettings }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 state
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')

  // Step 2 state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(initialSettings)

  function toggleNotif(field: keyof NotificationSettings) {
    setNotifSettings((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  async function handleStep1() {
    if (!fullName.trim()) {
      toast.error('Informe seu nome')
      return
    }
    setLoading(true)
    const result = await updateProfile({ full_name: fullName, phone })
    setLoading(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setStep(2)
  }

  async function handleStep2() {
    if (clientId) {
      setLoading(true)
      await updateNotificationSettings(clientId, notifSettings)
      setLoading(false)
    }
    setStep(3)
  }

  function handleFinish() {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Brand */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Bem-vindo ao Portal</h1>
          <p className="text-sm text-muted-foreground">
            Vamos configurar sua conta em alguns passos rápidos
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step > s.id
                    ? 'bg-primary text-primary-foreground'
                    : step === s.id
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-8 transition-colors ${
                    step > s.id ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Seu perfil
                </h2>
                <p className="text-sm text-muted-foreground">
                  Como devemos te chamar?
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Nome completo</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    WhatsApp{' '}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    type="tel"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usado para notificações de prazo e atualizações do projeto
                  </p>
                </div>
              </div>

              <Button className="w-full" onClick={handleStep1} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Continuar
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Notificações
                </h2>
                <p className="text-sm text-muted-foreground">
                  Como quer ser avisado sobre o andamento do projeto?
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    field: 'delivery_date_email' as const,
                    channel: 'Email',
                    event: 'Prazo de entrega',
                  },
                  {
                    field: 'delivery_date_whatsapp' as const,
                    channel: 'WhatsApp',
                    event: 'Prazo de entrega',
                  },
                  {
                    field: 'status_change_email' as const,
                    channel: 'Email',
                    event: 'Atualização de status',
                  },
                  {
                    field: 'status_change_whatsapp' as const,
                    channel: 'WhatsApp',
                    event: 'Atualização de status',
                  },
                ].map(({ field, channel, event }) => (
                  <label
                    key={field}
                    className="flex items-center justify-between p-3 rounded-xl border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{event}</p>
                      <p className="text-xs text-muted-foreground">via {channel}</p>
                    </div>
                    <div
                      onClick={() => toggleNotif(field)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        notifSettings[field] ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition duration-200 ${
                          notifSettings[field] ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button className="flex-1" onClick={handleStep2} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Continuar
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Rocket className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Tudo pronto, {fullName.split(' ')[0]}!</h2>
                <p className="text-sm text-muted-foreground">
                  Sua conta está configurada. Agora você pode acompanhar o andamento do projeto.
                </p>
              </div>
              <Button className="w-full" onClick={handleFinish}>
                Ir para o Dashboard
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
