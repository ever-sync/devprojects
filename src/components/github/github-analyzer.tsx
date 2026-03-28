'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { analyzeGitHubRepo } from '@/actions/ai-features';
import { toast } from 'sonner';
import { Github, Loader2, GitBranch, GitCommit, GitPullRequest, Code, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface GitHubAnalysis {
  repoName: string;
  totalCommits: number;
  totalPRs: number;
  contributors: number;
  codeQuality: {
    score: number;
    issues: any[];
    suggestions: string[];
  };
  activity: {
    recentCommits: any[];
    activeBranches: string[];
    openPRs: number;
  };
  health: {
    score: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    recommendations: string[];
  };
}

export function GitHubAnalyzer() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<GitHubAnalysis | null>(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [projectId, setProjectId] = useState('');

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) {
      toast.error('Por favor, informe a URL do repositório GitHub');
      return;
    }

    // Extract repo name from URL
    const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
    if (!match) {
      toast.error('URL do GitHub inválida. Use o formato: https://github.com/user/repo');
      return;
    }

    const repoName = match[1];
    setLoading(true);

    try {
      const result = await analyzeGitHubRepo({
        repoName,
        projectId: projectId || 'project-id-placeholder', // TODO: Get from context
      });

      if (result.success && result.data) {
        setAnalysis(result.data);
        toast.success('Repositório analisado com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao analisar repositório');
      }
    } catch (error) {
      toast.error('Erro ao analisar repositório GitHub');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-blue-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-6 w-6" />
          Analisador de Repositório GitHub com IA
        </CardTitle>
        <CardDescription>
          Conecte seu repositório GitHub e receba insights sobre qualidade de código, atividade e saúde do projeto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="repoUrl">URL do Repositório GitHub</Label>
            <Input
              id="repoUrl"
              placeholder="https://github.com/usuario/repositorio"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectId">ID do Projeto (Opcional)</Label>
            <Input
              id="projectId"
              placeholder="project-id"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleAnalyze} disabled={loading || !repoUrl.trim()} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando repositório...
            </>
          ) : (
            <>
              <Github className="mr-2 h-4 w-4" />
              Analisar Repositório com IA
            </>
          )}
        </Button>

        {/* Resultados */}
        {analysis && (
          <div className="space-y-6 border-t pt-6">
            {/* Header do Repo */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  {analysis.repoName}
                </h3>
                <p className="text-sm text-muted-foreground">Análise realizada em {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              <Badge className={getStatusColor(analysis.health.status)} variant="outline">
                Saúde: {analysis.health.status.toUpperCase()}
              </Badge>
            </div>

            {/* Métricas Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <GitCommit className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{analysis.totalCommits}</p>
                  <p className="text-xs text-muted-foreground">Total de Commits</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <GitPullRequest className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold">{analysis.totalPRs}</p>
                  <p className="text-xs text-muted-foreground">Pull Requests</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <GitBranch className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{analysis.contributors}</p>
                  <p className="text-xs text-muted-foreground">Contribuidores</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <Code className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <p className="text-2xl font-bold">{analysis.activity.activeBranches.length}</p>
                  <p className="text-xs text-muted-foreground">Branches Ativos</p>
                </CardContent>
              </Card>
            </div>

            {/* Score de Qualidade de Código */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Qualidade de Código
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Score Geral</span>
                      <span className="text-sm font-bold">{analysis.codeQuality.score}/100</span>
                    </div>
                    <Progress value={analysis.codeQuality.score} className="h-3" />
                  </div>
                  <div className={`text-3xl font-bold ${analysis.codeQuality.score >= 80 ? 'text-green-500' : analysis.codeQuality.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {analysis.codeQuality.score >= 80 ? 'A' : analysis.codeQuality.score >= 60 ? 'B' : 'C'}
                  </div>
                </div>

                {analysis.codeQuality.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sugestões de Melhoria:</p>
                    <ul className="space-y-1">
                      {analysis.codeQuality.suggestions.slice(0, 3).map((suggestion, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saúde do Projeto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Saúde do Projeto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Score de Saúde</span>
                      <span className="text-sm font-bold">{analysis.health.score}/100</span>
                    </div>
                    <Progress value={analysis.health.score} className="h-3" />
                  </div>
                </div>

                {analysis.health.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recomendações:</p>
                    <ul className="space-y-1">
                      {analysis.health.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Atividades Recentes */}
            {analysis.activity.recentCommits && analysis.activity.recentCommits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitCommit className="h-5 w-5" />
                    Commits Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.activity.recentCommits.slice(0, 5).map((commit: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-sm p-2 bg-muted rounded">
                        <Code className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{commit.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {commit.author} • {new Date(commit.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {commit.hash?.substring(0, 7)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
