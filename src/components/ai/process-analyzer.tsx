'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { analyzeProcess, generateTasksFromText } from '@/actions/ai-features';
import { toast } from 'sonner';
import { Brain, Target, AlertTriangle, TrendingUp, Loader2, CheckCircle2, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function ProcessAnalyzer() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [processDescription, setProcessDescription] = useState('');

  const handleAnalyze = async () => {
    if (!processDescription.trim()) {
      toast.error('Por favor, descreva o processo para análise');
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeProcess({
        description: processDescription,
        projectId: 'project-id-placeholder', // TODO: Get from context
      });

      if (result.success && result.data) {
        setAnalysis(result.data);
        toast.success('Processo analisado com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao analisar processo');
      }
    } catch (error) {
      toast.error('Erro ao analisar processo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-6 w-6" />
          Analisador de Processos com IA
        </CardTitle>
        <CardDescription>
          Descreva seu processo e a IA identificará gargalos, riscos e oportunidades de melhoria
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input do Processo */}
        <div className="space-y-2">
          <Label htmlFor="processDescription">Descrição do Processo</Label>
          <Textarea
            id="processDescription"
            placeholder="Descreva detalhadamente o processo atual. Inclua etapas, responsáveis, ferramentas utilizadas, tempo médio de cada etapa, pontos de dor conhecidos, etc."
            className="min-h-[150px]"
            value={processDescription}
            onChange={(e) => setProcessDescription(e.target.value)}
          />
        </div>

        <Button onClick={handleAnalyze} disabled={loading || !processDescription.trim()} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando processo...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Analisar Processo com IA
            </>
          )}
        </Button>

        {/* Resultados da Análise */}
        {analysis && (
          <div className="space-y-6 border-t pt-6">
            {/* Score Geral */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Eficiência</p>
                      <p className="text-2xl font-bold">{analysis.efficiencyScore}%</p>
                    </div>
                    <TrendingUp className={`h-8 w-8 ${analysis.efficiencyScore >= 70 ? 'text-green-500' : analysis.efficiencyScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`} />
                  </div>
                  <Progress value={analysis.efficiencyScore} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Gargalos Identificados</p>
                      <p className="text-2xl font-bold">{analysis.bottlenecks?.length || 0}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Pontos críticos no fluxo</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Riscos</p>
                      <p className="text-2xl font-bold">{analysis.risks?.length || 0}</p>
                    </div>
                    <Target className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Fatores de risco detectados</p>
                </CardContent>
              </Card>
            </div>

            {/* Gargalos */}
            {analysis.bottlenecks && analysis.bottlenecks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Gargalos Identificados
                </h3>
                <div className="space-y-2">
                  {analysis.bottlenecks.map((bottleneck: any, i: number) => (
                    <Card key={i} className="bg-orange-50 border-orange-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Badge variant="destructive" className="mt-1">Alto Impacto</Badge>
                          <div>
                            <p className="font-medium">{bottleneck.description}</p>
                            <p className="text-sm text-muted-foreground mt-1">{bottleneck.impact}</p>
                            {bottleneck.suggestion && (
                              <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {bottleneck.suggestion}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Riscos */}
            {analysis.risks && analysis.risks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Riscos Detectados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.risks.map((risk: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Badge variant={risk.severity === 'high' ? 'destructive' : risk.severity === 'medium' ? 'default' : 'secondary'} className="mt-1">
                            {risk.severity === 'high' ? 'Alto' : risk.severity === 'medium' ? 'Médio' : 'Baixo'}
                          </Badge>
                          <div>
                            <p className="font-medium">{risk.description}</p>
                            <p className="text-sm text-muted-foreground mt-1">{risk.mitigation}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recomendações */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  Recomendações de Melhoria
                </h3>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec: any, i: number) => (
                    <Card key={i} className="bg-green-50 border-green-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium">{rec.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                            {rec.expectedImpact && (
                              <Badge className="mt-2 bg-green-600">{rec.expectedImpact}</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo Executivo */}
            {analysis.executiveSummary && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-5 w-5 text-blue-600" />
                    Resumo Executivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-blue-900">{analysis.executiveSummary}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
