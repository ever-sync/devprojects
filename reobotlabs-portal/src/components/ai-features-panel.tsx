'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Sparkles, 
  Github, 
  Workflow, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Plus,
  Download,
  Eye,
  Send,
  Brain,
  GitBranch,
  Clock,
  TrendingUp
} from 'lucide-react';
import { generateContract, createContractTemplate, getContractTemplates } from '@/actions/ai-contracts';
import { analyzeProcessWithAI, generateTasksWithAI, analyzeGitHubWithAI, getAITasks, convertAITaskToRealTask } from '@/actions/ai-contracts';

interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  variables: string[];
}

export function AIFeaturesPanel({ projectId }: { projectId: string }) {
  const [activeTab, setActiveTab] = useState('contracts');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Contract generation state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [contractVariables, setContractVariables] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);

  // Process analysis state
  const [processDescription, setProcessDescription] = useState('');
  const [processGoals, setProcessGoals] = useState('');

  // Task generation state
  const [taskDescription, setTaskDescription] = useState('');
  const [taskContext, setTaskContext] = useState('');

  // GitHub analysis state
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubFocus, setGithubFocus] = useState<'all' | 'code_quality' | 'security' | 'performance' | 'architecture'>('all');

  const handleGenerateContract = async () => {
    if (!selectedTemplate) {
      setError('Selecione um template');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await generateContract({
        templateId: selectedTemplate,
        projectId,
        variables: contractVariables,
        title: '',
      });

      if (response.success) {
        setResult({ type: 'contract', data: response.data });
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Erro ao gerar contrato');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeProcess = async () => {
    if (!processDescription.trim()) {
      setError('Descreva o processo a ser analisado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const goals = processGoals.split('\n').filter(g => g.trim());
      const response = await analyzeProcessWithAI({
        projectId,
        description: processDescription,
        goals: goals.length > 0 ? goals : undefined,
      });

      if (response.success) {
        setResult({ type: 'process', data: response.analysis });
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Erro na análise do processo');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!taskDescription.trim()) {
      setError('Descreva o escopo ou feature');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await generateTasksWithAI({
        projectId,
        description: taskDescription,
        context: taskContext || undefined,
      });

      if (response.success) {
        setResult({ type: 'tasks', data: response.data, count: response.count });
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Erro ao gerar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeGitHub = async () => {
    if (!githubUrl.trim()) {
      setError('Informe a URL do repositório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await analyzeGitHubWithAI({
        repositoryUrl: githubUrl,
        branch: githubBranch,
        focus: githubFocus,
      });

      if (response.success) {
        setResult({ type: 'github', data: response.analysis });
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('Erro na análise do GitHub');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertTask = async (taskId: string) => {
    setLoading(true);
    try {
      const response = await convertAITaskToRealTask(taskId);
      if (response.success) {
        setResult(prev => ({
          ...prev,
          data: prev.data.map((t: any) => 
            t.id === taskId ? { ...t, converted: true, realTask: response.data } : t
          )
        }));
      }
    } catch (err) {
      setError('Erro ao converter tarefa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="process" className="flex items-center gap-2">
            <Workflow className="w-4 h-4" />
            Processos
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Tarefas IA
          </TabsTrigger>
          <TabsTrigger value="github" className="flex items-center gap-2">
            <Github className="w-4 h-4" />
            GitHub IA
          </TabsTrigger>
        </TabsList>

        {/* CONTRATS TAB */}
        <TabsContent value="contracts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Gerar Contrato
              </CardTitle>
              <CardDescription>
                Selecione um template e preencha as variáveis para gerar um contrato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template-1">Contrato de Serviços</SelectItem>
                    <SelectItem value="template-2">NDA (Confidencialidade)</SelectItem>
                    <SelectItem value="template-3">Proposta Comercial</SelectItem>
                    <SelectItem value="template-4">Statement of Work</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <Label>Variáveis do Template</Label>
                  <div className="grid gap-3">
                    <div>
                      <Label className="text-sm">Nome do Cliente</Label>
                      <Input 
                        placeholder="Ex: Empresa XYZ Ltda"
                        onChange={(e) => setContractVariables(prev => ({ ...prev, client_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Valor do Projeto</Label>
                      <Input 
                        placeholder="Ex: R$ 50.000,00"
                        onChange={(e) => setContractVariables(prev => ({ ...prev, project_value: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Prazo de Entrega</Label>
                      <Input 
                        placeholder="Ex: 90 dias úteis"
                        onChange={(e) => setContractVariables(prev => ({ ...prev, delivery_deadline: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result?.type === 'contract' && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Contrato gerado com sucesso! ID: {result.data.id}
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleGenerateContract} disabled={loading || !selectedTemplate} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Contrato
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROCESS ANALYSIS TAB */}
        <TabsContent value="process" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Analisar Processo com IA
              </CardTitle>
              <CardDescription>
                Descreva seu processo e receba insights sobre gargalos e melhorias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="process-desc">Descrição do Processo</Label>
                <Textarea
                  id="process-desc"
                  placeholder="Descreva como o processo funciona atualmente..."
                  value={processDescription}
                  onChange={(e) => setProcessDescription(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="process-goals">Objetivos (opcional, um por linha)</Label>
                <Textarea
                  id="process-goals"
                  placeholder="Reduzir tempo de entrega&#10;Aumentar qualidade&#10;Melhorar comunicação"
                  value={processGoals}
                  onChange={(e) => setProcessGoals(e.target.value)}
                  rows={3}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result?.type === 'process' && (
                <div className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Brain className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      {result.data.summary}
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Gargalos Identificados</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {result.data.bottlenecks?.map((b: string, i: number) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Métricas Recomendadas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {result.data.metrics?.map((m: string, i: number) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {result.data.improvements?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Sugestões de Melhoria</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {result.data.improvements.map((imp: any, i: number) => (
                            <div key={i} className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">{imp.title}</span>
                                <div className="flex gap-2">
                                  <Badge variant={imp.effort === 'low' ? 'default' : 'secondary'}>
                                    Esforço: {imp.effort}
                                  </Badge>
                                  <Badge variant={imp.impact === 'high' ? 'default' : 'secondary'}>
                                    Impacto: {imp.impact}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">{imp.description}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Button onClick={handleAnalyzeProcess} disabled={loading || !processDescription.trim()} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Analisar Processo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TASK GENERATION TAB */}
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Gerar Tarefas com IA
              </CardTitle>
              <CardDescription>
                Descreva uma feature ou escopo e a IA irá decompor em tarefas acionáveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-desc">Descrição do Escopo/Feature</Label>
                <Textarea
                  id="task-desc"
                  placeholder="Ex: Implementar sistema de autenticação com login social (Google, GitHub) e recuperação de senha..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-context">Contexto Adicional (opcional)</Label>
                <Textarea
                  id="task-context"
                  placeholder="Informações adicionais sobre tecnologias, restrições ou preferências..."
                  value={taskContext}
                  onChange={(e) => setTaskContext(e.target.value)}
                  rows={3}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result?.type === 'tasks' && (
                <div className="space-y-3">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {result.count} tarefas geradas com sucesso!
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {result.data.map((task: any) => (
                      <div key={task.id} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={task.priority === 'high' || task.priority === 'critical' ? 'destructive' : 'default'}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline">{task.estimated_hours}h</Badge>
                          </div>
                        </div>
                        
                        {task.acceptance_criteria?.length > 0 && (
                          <div className="text-sm">
                            <strong>Critérios de aceite:</strong>
                            <ul className="list-disc list-inside mt-1 text-muted-foreground">
                              {task.acceptance_criteria.map((c: string, i: number) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {!task.converted && (
                          <Button 
                            size="sm" 
                            onClick={() => handleConvertTask(task.id)}
                            disabled={loading}
                            className="w-full"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Converter em Tarefa Real
                          </Button>
                        )}

                        {task.converted && (
                          <Badge className="w-full justify-center bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Convertida
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleGenerateTasks} disabled={loading || !taskDescription.trim()} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando tarefas...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Tarefas
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GITHUB ANALYSIS TAB */}
        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5" />
                Analisar Repositório com IA
              </CardTitle>
              <CardDescription>
                Cole a URL de um repositório GitHub para receber uma análise completa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-url">URL do Repositório</Label>
                <Input
                  id="github-url"
                  placeholder="https://github.com/usuario/repositorio"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="github-branch">Branch</Label>
                  <Input
                    id="github-branch"
                    placeholder="main"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github-focus">Foco da Análise</Label>
                  <Select value={githubFocus} onValueChange={(v: any) => setGithubFocus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Completa (Todos)</SelectItem>
                      <SelectItem value="code_quality">Qualidade de Código</SelectItem>
                      <SelectItem value="security">Segurança</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="architecture">Arquitetura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result?.type === 'github' && (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium">Score Geral</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{result.data.overall_score}/100</div>
                      </CardContent>
                    </Card>

                    {Object.entries(result.data.categories || {}).map(([key, value]: [string, any]) => (
                      <Card key={key}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs font-medium capitalize">
                            {key.replace('_', ' ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-xl font-bold">{value.score}/100</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {result.data.critical_issues?.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader>
                        <CardTitle className="text-sm text-red-800">Problemas Críticos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                          {result.data.critical_issues.map((issue: string, i: number) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {result.data.recommendations?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">Recomendações</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                          {result.data.recommendations.map((rec: string, i: number) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {result.data.tech_stack_detected?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <Label>Tech Stack Detectada:</Label>
                      {result.data.tech_stack_detected.map((tech: string, i: number) => (
                        <Badge key={i} variant="secondary">{tech}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button onClick={handleAnalyzeGitHub} disabled={loading || !githubUrl.trim()} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analisando repositório...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Analisar GitHub
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
