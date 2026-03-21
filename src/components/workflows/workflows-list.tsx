// @ts-nocheck — Workflow tables not yet in database types
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  listWorkflows, 
  toggleWorkflowStatus, 
  executeWorkflow,
  deleteWorkflow 
} from '@/actions/workflow-engine';
import { Play, Pause, Trash2, Clock, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger_type: string;
  is_active: boolean;
  execution_count: number;
  created_at: string;
  updated_at: string;
}

export function WorkflowsList({ workspaceId }: { workspaceId?: string }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, [workspaceId]);

  async function loadWorkflows() {
    setLoading(true);
    const result = await listWorkflows(workspaceId);
    if (result.success && result.data) {
      setWorkflows(result.data as Workflow[]);
    }
    setLoading(false);
  }

  async function handleToggleStatus(workflowId: string, currentStatus: boolean) {
    const result = await toggleWorkflowStatus(workflowId, !currentStatus);
    if (result.success) {
      loadWorkflows();
    }
  }

  async function handleExecute(workflowId: string) {
    setExecutingId(workflowId);
    const result = await executeWorkflow({ workflow_id: workflowId });
    if (result.success) {
      loadWorkflows();
    }
    setExecutingId(null);
  }

  async function handleDelete(workflowId: string) {
    if (!confirm('Tem certeza que deseja deletar este workflow?')) return;
    
    const result = await deleteWorkflow(workflowId);
    if (result.success) {
      loadWorkflows();
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando workflows...</div>;
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum workflow encontrado</CardTitle>
          <CardDescription>
            Crie seu primeiro workflow para automatizar processos
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {workflows.map((workflow) => (
        <Card key={workflow.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{workflow.name}</CardTitle>
                {workflow.description && (
                  <CardDescription>{workflow.description}</CardDescription>
                )}
              </div>
              <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                {workflow.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Trigger: {workflow.trigger_type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  <span>{workflow.execution_count} execuções</span>
                </div>
                <span>
                  Criado {formatDistanceToNow(new Date(workflow.created_at), { 
                    locale: ptBR,
                    addSuffix: true 
                  })}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExecute(workflow.id)}
                  disabled={executingId === workflow.id || !workflow.is_active}
                >
                  {executingId === workflow.id ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Executar
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleStatus(workflow.id, workflow.is_active)}
                >
                  {workflow.is_active ? (
                    <>
                      <Pause className="w-4 h-4 mr-1" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      Ativar
                    </>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(workflow.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
