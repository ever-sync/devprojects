'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveDiscordWebhook, sendDiscordTestMessage } from '@/actions/discord'

export function DiscordIntegrationPanel({
  connected,
  webhookUrl,
  channelName,
}: {
  connected: boolean
  webhookUrl?: string | null
  channelName?: string | null
}) {
  const [url, setUrl] = useState(webhookUrl ?? '')
  const [channel, setChannel] = useState(channelName ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await saveDiscordWebhook(url, channel)
      if (result.error) {
        setMessage(`Erro: ${result.error}`)
      } else {
        setMessage('Webhook do Discord salva com sucesso.')
      }
    })
  }

  function handleTest() {
    startTransition(async () => {
      const result = await sendDiscordTestMessage()
      if (result.error) {
        setMessage(`Erro no teste: ${result.error}`)
      } else {
        setMessage('Mensagem de teste enviada para o Discord.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Notifications</CardTitle>
        <CardDescription>
          Configure um webhook do Discord para receber alertas e mensagens de automação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="discord-webhook">Webhook URL</Label>
          <Input
            id="discord-webhook"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discord-channel">Canal (opcional)</Label>
          <Input
            id="discord-channel"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            placeholder="#projetos"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={isPending || !url.trim()}>
            {isPending ? 'Salvando...' : connected ? 'Atualizar webhook' : 'Salvar webhook'}
          </Button>
          <Button type="button" variant="outline" onClick={handleTest} disabled={isPending || !url.trim()}>
            Enviar teste
          </Button>
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  )
}
