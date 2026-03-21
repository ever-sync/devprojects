'use client'

import { useState } from 'react'
import { updateNotificationSettings } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Bell, Mail, MessageCircle, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { NotificationSettings } from '@/types'

interface NotificationFormProps {
  clientId: string
  initialSettings: NotificationSettings
}

const NOTIFICATION_EVENTS = [
  {
    key: 'delivery_date' as const,
    label: 'Prazo de entrega',
    description: 'Notificações 24h antes da data de entrega de uma tarefa',
  },
  {
    key: 'status_change' as const,
    label: 'Atualização de status',
    description: 'Quando o status de uma tarefa ou projeto muda',
  },
]

export function NotificationForm({ clientId, initialSettings }: NotificationFormProps) {
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings)
  const [saving, setSaving] = useState(false)

  function toggle(field: keyof NotificationSettings) {
    setSettings((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  async function handleSave() {
    setSaving(true)
    const result = await updateNotificationSettings(clientId, settings)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Preferências salvas!')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium">Notificações</h3>
      </div>

      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        {/* Header row */}
        <div className="flex items-center px-4 py-2 bg-muted/40">
          <div className="flex-1" />
          <div className="flex items-center gap-6 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1 w-16 justify-center">
              <Mail className="w-3 h-3" /> E-mail
            </span>
            <span className="flex items-center gap-1 w-16 justify-center">
              <MessageCircle className="w-3 h-3" /> WhatsApp
            </span>
          </div>
        </div>

        {NOTIFICATION_EVENTS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-16 flex justify-center">
                <Toggle
                  checked={settings[`${key}_email`]}
                  onChange={() => toggle(`${key}_email`)}
                />
              </div>
              <div className="w-16 flex justify-center">
                <Toggle
                  checked={settings[`${key}_whatsapp`]}
                  onChange={() => toggle(`${key}_whatsapp`)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 mr-1.5" />
          )}
          Salvar preferências
        </Button>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
