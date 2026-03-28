'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { generateTasksFromText } from '@/actions/ai-features';
import { toast } from 'sonner';
import { Sparkles, PlusCircle, Loader2, Calendar, User, Tag, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GeneratedTask {
  title: string;
  description: string;
  estimatedHours: number;
  priority: 'low' | 'medium' | 'high';
  assigneeRole?: string;
  tags: string[];
  phase?: string;
}

export function TaskGenerator() {
  const [loading, setLoading] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [taskDescription, setTaskDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [phaseId, setPhaseId] = useState('');

  const handleGenerateTasks = async () => {
    if (!taskDescription.trim()) {
      toast.error('Por favor, descreva as tarefas ou o escopo do projeto');
      return;
    }

    setLoading(true);
    try {
      const result = await generateTasksFromText({
        text: taskDescription,
        projectId: projectId || 'project-id-placeholder', // TODO: Get from context
        phaseId: phaseId || undefined,
      });

      if (result.success && result.data) {
        setGeneratedTasks(result.data.tasks || []);
        toast.success(`${result.data.tasks?.length || 0} tarefas geradas com sucesso!`);
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
    // TODO: Implement save to database
    toast.info('Funcionalidade de salvar tarefas será implementada em breve');
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
        {/* Seleção de Projeto/Fase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="projectId">Projeto</Label>
            <Input
              id="projectId"
              placeholder="ID do Projeto (opcional)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phaseId">Fase (Opcional)</Label>
            <Select value={phaseId} onValueChange={setPhaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planejamento</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="development">Desenvolvimento</SelectItem>
                <SelectItem value="testing">Testes</SelectItem>
                <SelectItem value="deployment">Deploy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
              <Button onClick={handleSaveTasks} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Salvar Todas
              </Button>
            </div>

            <div className="space-y-3">
              {generatedTasks.map((task, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {/* Header da Tarefa */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                            <h4 className="font-semibold text-base">{task.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          #{index + 1}
                        </Badge>
                      </div>

                      {/* Metadados */}
                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{task.estimatedHours}h estimadas</span>
                        </div>

                        {task.assigneeRole && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{task.assigneeRole}</span>
                          </div>
                        )}

                        {task.phase && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Fase: {task.phase}</span>
                          </div>
                        )}

                        {task.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {task.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Resumo */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{generatedTasks.length}</p>
                    <p className="text-xs text-muted-foreground">Total de Tarefas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {generatedTasks.reduce((acc, task) => acc + task.estimatedHours, 0)}h
                    </p>
                    <p className="text-xs text-muted-foreground">Horas Estimadas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {generatedTasks.filter(t => t.priority === 'high').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Alta Prioridade</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {new Set(generatedTasks.flatMap(t => t.tags)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Tags Únicas</p>
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
