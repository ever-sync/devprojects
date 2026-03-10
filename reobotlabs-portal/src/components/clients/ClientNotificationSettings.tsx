'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Bell, Mail, MessageSquare } from 'lucide-react'
import type { NotificationSettings } from '@/types'
import type { Json } from '@/types/database.types'

interface Props {
  clientId: string
  initialSettings: NotificationSettings
}

export function ClientNotificationSettings({ clientId, initialSettings }: Props) {
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({ notification_settings: settings as Json })
        .eq('id', clientId)

      if (error) throw error
      toast.success('Configurações de notificação atualizadas!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Erro ao salvar configurações.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle>Configurações de Notificação</CardTitle>
          </div>
          <CardDescription>
            Defina quais avisos este cliente receberá da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              Notificações por E-mail
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-0.5">
                <Label htmlFor="delivery_date_email">Datas de Entrega</Label>
                <p className="text-xs text-muted-foreground">
                  Enviar e-mail apenas com o assunto sobre prazos e entregas.
                </p>
              </div>
              <Switch
                id="delivery_date_email"
                checked={settings.delivery_date_email}
                onCheckedChange={() => toggleSetting('delivery_date_email')}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-0.5">
                <Label htmlFor="status_change_email">Mudança de Status</Label>
                <p className="text-xs text-muted-foreground">
                  Avisar quando o status de um projeto ou tarefa for alterado.
                </p>
              </div>
              <Switch
                id="status_change_email"
                checked={settings.status_change_email}
                onCheckedChange={() => toggleSetting('status_change_email')}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Notificações por WhatsApp
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-0.5">
                <Label htmlFor="delivery_date_whatsapp">Datas de Entrega</Label>
                <p className="text-xs text-muted-foreground">
                  Enviar aviso via WhatsApp sobre prazos.
                </p>
              </div>
              <Switch
                id="delivery_date_whatsapp"
                checked={settings.delivery_date_whatsapp}
                onCheckedChange={() => toggleSetting('delivery_date_whatsapp')}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-0.5">
                <Label htmlFor="status_change_whatsapp">Mudança de Status</Label>
                <p className="text-xs text-muted-foreground">
                  Arquivar atualizações de status via WhatsApp.
                </p>
              </div>
              <Switch
                id="status_change_whatsapp"
                checked={settings.status_change_whatsapp}
                onCheckedChange={() => toggleSetting('status_change_whatsapp')}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
