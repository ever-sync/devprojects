'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  listWebhooks, 
  createWebhookEndpoint 
} from '@/actions/workflow-engine';
import { Copy, Check, Webhook } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Webhook {
  id: string;
  name: string;
  endpoint_url: string;
  secret_token: string;
  is_active: boolean;
  success_count: number;
  failure_count: number;
  created_at: string;
  workflow?: {
    id: string;
    name: string;
  };
}

type ListWebhooksResult = Awaited<ReturnType<typeof listWebhooks>>

export function WebhooksList({ workspaceId }: { workspaceId?: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    endpoint_url: '',
    workflow_id: ''
  });

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    const result: ListWebhooksResult = await listWebhooks(workspaceId);
    if (result.success && result.data) {
      setWebhooks(result.data as Webhook[]);
    } else {
      setWebhooks([]);
    }
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWebhooks();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadWebhooks]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    
    const result = await createWebhookEndpoint(formData);
    if (result.success) {
      setFormData({ name: '', endpoint_url: '', workflow_id: '' });
      setShowCreateForm(false);
      await loadWebhooks();
    } else {
      alert(result.error);
    }
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando webhooks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Webhooks</h3>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} size="sm">
          <Webhook className="w-4 h-4 mr-2" />
          Novo Webhook
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Webhook</CardTitle>
            <CardDescription>
              Configure um endpoint webhook para receber eventos externos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: GitHub Issues"
                  required
                />
              </div>
              <div>
                <Label htmlFor="endpoint_url">URL do Endpoint</Label>
                <Input
                  id="endpoint_url"
                  type="url"
                  value={formData.endpoint_url}
                  onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
                  placeholder="https://api.exemplo.com/webhook"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Criar</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {webhooks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum webhook encontrado</CardTitle>
            <CardDescription>
              Crie webhooks para integrar com serviços externos
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{webhook.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {webhook.endpoint_url}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(webhook.endpoint_url, `url-${webhook.id}`)}
                      >
                        {copiedId === `url-${webhook.id}` ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </CardDescription>
                  </div>
                  <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                    {webhook.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {webhook.workflow && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Workflow:</span>{' '}
                      <span className="font-medium">{webhook.workflow.name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Token Secreto:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {webhook.secret_token.substring(0, 16)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(webhook.secret_token, `token-${webhook.id}`)}
                        >
                          {copiedId === `token-${webhook.id}` ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="text-green-600 font-medium">{webhook.success_count}</span>
                      <span>sucessos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-red-600 font-medium">{webhook.failure_count}</span>
                      <span>falhas</span>
                    </div>
                    <span>
                      Criado {formatDistanceToNow(new Date(webhook.created_at), { 
                        locale: ptBR,
                        addSuffix: true 
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
