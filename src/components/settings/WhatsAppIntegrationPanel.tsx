'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveWhatsAppIntegration, sendWhatsAppTestMessage } from '@/actions/whatsapp'

export function WhatsAppIntegrationPanel({
  connected,
  baseUrl,
  instance,
  defaultNumber,
}: {
  connected: boolean
  baseUrl?: string | null
  instance?: string | null
  defaultNumber?: string | null
}) {
  const [apiBaseUrl, setApiBaseUrl] = useState(baseUrl ?? '')
  const [apiInstance, setApiInstance] = useState(instance ?? '')
  const [apiKey, setApiKey] = useState('')
  const [phone, setPhone] = useState(defaultNumber ?? '')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await saveWhatsAppIntegration({
        baseUrl: apiBaseUrl,
        instance: apiInstance,
        apiKey,
        defaultNumber: phone,
      })
      if (result.error) {
        setMessage(`Erro: ${result.error}`)
      } else {
        setMessage('Integracao WhatsApp salva com sucesso.')
      }
    })
  }

  function handleTest() {
    startTransition(async () => {
      const result = await sendWhatsAppTestMessage(phone)
      if (result.error) {
        setMessage(`Erro no teste: ${result.error}`)
      } else {
        setMessage('Mensagem de teste enviada no WhatsApp.')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Business (Evolution API)</CardTitle>
        <CardDescription>
          Configure sua instancia da Evolution API para envio real de notificacoes no WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wa-base-url">Base URL da Evolution API</Label>
          <Input
            id="wa-base-url"
            value={apiBaseUrl}
            onChange={(event) => setApiBaseUrl(event.target.value)}
            placeholder="https://evolution.seudominio.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wa-instance">Instancia</Label>
          <Input
            id="wa-instance"
            value={apiInstance}
            onChange={(event) => setApiInstance(event.target.value)}
            placeholder="reobotlabs"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wa-api-key">API Key</Label>
          <Input
            id="wa-api-key"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sua-api-key"
            type="password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wa-number">Numero padrao para alertas/testes</Label>
          <Input
            id="wa-number"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="5511999999999"
          />
          <p className="text-xs text-muted-foreground">Use DDI + DDD + numero, apenas digitos.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || !apiBaseUrl.trim() || !apiInstance.trim() || !apiKey.trim()}
          >
            {isPending ? 'Salvando...' : connected ? 'Atualizar integracao' : 'Salvar integracao'}
          </Button>
          <Button type="button" variant="outline" onClick={handleTest} disabled={isPending || !phone.trim()}>
            Enviar teste
          </Button>
        </div>

        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  )
}
