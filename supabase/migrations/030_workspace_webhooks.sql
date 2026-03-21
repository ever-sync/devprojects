ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS n8n_webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS n8n_webhook_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.workspaces.n8n_webhook_url IS 'Webhook outbound do workspace para automacoes n8n.';
COMMENT ON COLUMN public.workspaces.n8n_webhook_secret IS 'Secret opcional enviado no header Authorization para o n8n.';
COMMENT ON COLUMN public.workspaces.n8n_webhook_enabled IS 'Ativa o disparo de eventos outbound para o n8n neste workspace.';
