'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { listSlackChannels, setSlackDefaultChannel } from '@/actions/slack'

type Channel = { id: string; name: string }

export function SlackIntegrationPanel({
  connected,
  teamName,
  defaultChannelId,
  defaultChannelName,
}: {
  connected: boolean
  teamName?: string | null
  defaultChannelId?: string | null
  defaultChannelName?: string | null
}) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelId, setChannelId] = useState(defaultChannelId ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!connected) return
    listSlackChannels().then((result) => {
      if (result.error) return
      setChannels(result.channels)
    })
  }, [connected])

  function handleSaveChannel() {
    const selected = channels.find((channel) => channel.id === channelId)
    if (!selected) return

    startTransition(async () => {
      const result = await setSlackDefaultChannel(selected.id, selected.name)
      if (result.error) {
        setMessage(`Erro: ${result.error}`)
      } else {
        setMessage(`Canal padrão salvo: #${selected.name}`)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Slack Notifications</CardTitle>
        <CardDescription>
          Conecte seu workspace ao Slack e escolha o canal padrão das notificações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Slack ainda não conectado neste workspace.</p>
            <Button asChild>
              <a href="/api/integrations/slack/connect">Conectar com Slack</a>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Conectado em: <strong>{teamName ?? 'Workspace Slack'}</strong>
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium">Canal padrão</p>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      #{channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Atual: {defaultChannelName ? `#${defaultChannelName}` : 'não configurado'}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={handleSaveChannel} disabled={isPending || !channelId}>
              {isPending ? 'Salvando...' : 'Salvar canal padrão'}
            </Button>
          </div>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  )
}
