'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateWorkspaceWebhookSettings } from '@/actions/workspace-webhooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface WorkspaceWebhookPanelProps {
  workspaces: Array<{
    id: string
    name: string
    slug: string
    n8n_webhook_enabled: boolean
    n8n_webhook_url: string | null
    n8n_webhook_secret: string | null
  }>
}

type WorkspaceWebhookForm = {
  enabled: boolean
  webhookUrl: string
  webhookSecret: string
}

export function WorkspaceWebhookPanel({ workspaces }: WorkspaceWebhookPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [forms, setForms] = useState<Record<string, WorkspaceWebhookForm>>(
    Object.fromEntries(
      workspaces.map((workspace) => [
        workspace.id,
        {
          enabled: workspace.n8n_webhook_enabled,
          webhookUrl: workspace.n8n_webhook_url ?? '',
          webhookSecret: workspace.n8n_webhook_secret ?? '',
        },
      ]),
    ),
  )

  return (
    <div className="grid gap-4">
      {workspaces.map((workspace) => {
        const form = forms[workspace.id]

        return (
          <Card key={workspace.id}>
            <CardHeader>
              <CardTitle>{workspace.name}</CardTitle>
              <CardDescription>{workspace.slug}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Webhook do n8n</p>
                  <p className="text-xs text-muted-foreground">
                    Dispara eventos de tarefas, aprovacoes, reunioes e outras automacoes deste workspace.
                  </p>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(checked) =>
                    setForms((prev) => ({
                      ...prev,
                      [workspace.id]: { ...prev[workspace.id], enabled: checked },
                    }))
                  }
                />
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>URL do webhook</Label>
                  <Input
                    placeholder="https://seu-n8n.com/webhook/reobotlabs"
                    value={form.webhookUrl}
                    onChange={(event) =>
                      setForms((prev) => ({
                        ...prev,
                        [workspace.id]: { ...prev[workspace.id], webhookUrl: event.target.value },
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Secret do webhook</Label>
                  <Input
                    placeholder="Bearer token ou secret compartilhado"
                    value={form.webhookSecret}
                    onChange={(event) =>
                      setForms((prev) => ({
                        ...prev,
                        [workspace.id]: { ...prev[workspace.id], webhookSecret: event.target.value },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Se preenchido, sera enviado no header `Authorization: Bearer ...`.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await updateWorkspaceWebhookSettings({
                        workspaceId: workspace.id,
                        enabled: form.enabled,
                        webhookUrl: form.webhookUrl || null,
                        webhookSecret: form.webhookSecret || null,
                      })

                      if (result.error) {
                        toast.error(result.error)
                        return
                      }

                      toast.success('Webhook atualizado')
                    })
                  }
                >
                  Salvar webhook
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
