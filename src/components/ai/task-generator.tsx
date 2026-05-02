'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { generateTasksFromText, createTasksFromAI } from '@/actions/tasks';
import { toast } from 'sonner';
import { Sparkles, PlusCircle, Loader2, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GeneratedTask {
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_days: number | null;
}

interface TaskGeneratorProps {
  projectId?: string;
}

export function TaskGenerator({ projectId: propProjectId }: TaskGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [taskDescription, setTaskDescription] = useState('');
  const [projectId, setProjectId] = useState(propProjectId || '');

  const handleGenerateTasks = async () => {
    if (!taskDescription.trim()) {
      toast.error('Por favor, descreva as tarefas ou o escopo do projeto');
      return;
    }

    setLoading(true);
    try {
      const result = await generateTasksFromText(taskDescription);

      if (result.success && result.tasks) {
        setGeneratedTasks(result.tasks);
        toast.success(`${result.tasks.length} tarefas geradas com sucesso!`);
      } else {
        toast.error(result.error || 'Erro ao gerar tarefas');
      }
    } catch (error) {
      toast.error('Erro ao gerar tarefas com IA');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTasks = async () => {
    if (!projectId.trim()) {
      toast.error('Informe o ID do projeto para salvar as tarefas');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      toast.error('ID do projeto inválido. Use um UUID válido.');
      return;
    }

    setSaving(true);
    try {
      const tasksToSave = generatedTasks.map((task) => ({
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: task.estimated_days
          ? new Date(Date.now() + task.estimated_days * 86400000).toISOString().split('T')[0]
          : null,
      }));

      const result = await createTasksFromAI(projectId, tasksToSave);

      if (result.success) {
        toast.success(`${result.count} tarefas salvas no projeto!`);
        setGeneratedTasks([]);
        setTaskDescription('');
      } else {
        toast.error(result.error || 'Erro ao salvar tarefas');
      }
    } catch (error) {
      toast.error('Erro ao salvar tarefas');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          Gerador de Tarefas com IA
        </CardTitle>
        <CardDescription>
          Descreva seu projeto ou funcionalidade e a IA criará tarefas detalhadas automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ID do Projeto para salvar */}
        {!propProjectId && (
          <div className="space-y-2">
            <Label htmlFor="projectId">ID do Projeto (para salvar tarefas)</Label>
            <Input
              id="projectId"
              placeholder="UUID do projeto (ex: 550e8400-e29b-41d4-a716-446655440000)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Preencha para poder salvar as tarefas geradas diretamente no projeto.
            </p>
          </div>
        )}

        {/* Descrição */}
        <div className="space-y-2">
          <Label htmlFor="taskDescription">Descrição do Projeto/Funcionalidade</Label>
          <Textarea
            id="taskDescription"
            placeholder="Ex: Preciso criar um sistema de autenticação com login social (Google, Facebook), recuperação de senha por email, e dashboard do usuário com perfil editável. O sistema deve ter validação de dados e proteção contra ataques comuns."
            className="min-h-[150px]"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Quanto mais detalhes você fornecer, mais precisas serão as tarefas geradas.
          </p>
        </div>

        <Button onClick={handleGenerateTasks} disabled={loading || !taskDescription.trim()} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando tarefas...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Tarefas com Inteligência Artificial
            </>
          )}
        </Button>

        {/* Tarefas Geradas */}
        {generatedTasks.length > 0 && (
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {generatedTasks.length} Tarefas Geradas
              </h3>
              <Button onClick={handleSaveTasks} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {saving ? 'Salvando...' : 'Salvar Todas'}
              </Button>
            </div>

            <div className="space-y-3">
              {generatedTasks.map((task, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                            <h4 className="font-semibold text-base">{task.title}</h4>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          #{index + 1}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                        {task.estimated_days && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{task.estimated_days} dias estimados</span>
                          </div>
                        )}
                        {task.estimated_days && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              Entrega até{' '}
                              {new Date(Date.now() + task.estimated_days * 86400000).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                        <Badge
                          variant={task.priority === 'urgent' || task.priority === 'high' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {task.priority === 'urgent' ? 'Urgente' : task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Resumo */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{generatedTasks.length}</p>
                    <p className="text-xs text-muted-foreground">Total de Tarefas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {generatedTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Alta Prioridade</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {generatedTasks.reduce((acc, t) => acc + (t.estimated_days ?? 0), 0)}d
                    </p>
                    <p className="text-xs text-muted-foreground">Dias Estimados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
