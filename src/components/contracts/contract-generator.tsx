'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateContractWithDescription, saveGeneratedContract } from '@/actions/ai-contracts';
import { toast } from 'sonner';
import { FileText, Download, Sparkles, Loader2 } from 'lucide-react';

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
}

interface ContractGeneratorProps {
  projectId?: string;
  clientId?: string;
}

export function ContractGenerator({ projectId, clientId }: ContractGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);

  const [formData, setFormData] = useState({
    templateId: '',
    clientName: '',
    companyName: '',
    projectDescription: '',
    startDate: '',
    endDate: '',
    value: '',
    paymentTerms: '',
    additionalInfo: '',
  });

  const handleGenerateWithAI = async () => {
    if (!formData.projectDescription) {
      toast.error('Por favor, descreva o projeto para gerar o contrato com IA');
      return;
    }

    setGenerating(true);
    try {
      const result = await generateContractWithDescription({
        description: formData.projectDescription,
        clientName: formData.clientName,
        companyName: formData.companyName,
        additionalInfo: formData.additionalInfo,
      });

      if (result.success && result.data) {
        setGeneratedData(result.data);
        toast.success('Contrato gerado com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao gerar contrato');
      }
    } catch (error) {
      toast.error('Erro ao gerar contrato com IA');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveContract = async () => {
    if (!generatedData) {
      toast.error('Gere um contrato primeiro');
      return;
    }

    setLoading(true);
    try {
      const result = await saveGeneratedContract({
        clientId: clientId,
        projectId: projectId,
        title: generatedData.title || 'Contrato Gerado',
        contractNumber: `CTR-${Date.now()}`,
        startDate: formData.startDate,
        endDate: formData.endDate,
        value: formData.value,
        status: 'draft',
        metadata: generatedData,
      });

      if (result.success) {
        toast.success('Contrato salvo com sucesso!');
        setGeneratedData(null);
        setFormData({
          templateId: '',
          clientName: '',
          companyName: '',
          projectDescription: '',
          startDate: '',
          endDate: '',
          value: '',
          paymentTerms: '',
          additionalInfo: '',
        });
      } else {
        toast.error(result.error || 'Erro ao salvar contrato');
      }
    } catch (error) {
      toast.error('Erro ao salvar contrato');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadContract = () => {
    if (!generatedData) return
    const lines = [
      `Contrato: ${generatedData.title || 'Contrato'}`,
      `Numero: CTR-${Date.now()}`,
      `Cliente: ${formData.clientName || 'Cliente'}`,
      `Empresa: ${formData.companyName || 'Empresa'}`,
      `Inicio: ${formData.startDate || '--/--/----'}`,
      `Termino: ${formData.endDate || '--/--/----'}`,
      `Valor: ${formData.value || 'R$ 0,00'}`,
      '',
      'Escopo:',
      ...(generatedData.scopeItems || []).map((item: string) => `- ${item}`),
      '',
      'Termos:',
      ...(generatedData.terms || []).map((item: string) => `- ${item}`),
      '',
      `Pagamento: ${formData.paymentTerms || 'A combinar'}`,
    ]
    const content = lines.join('\n')
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `contrato-${Date.now()}.md`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Gerador de Contratos com IA
        </CardTitle>
        <CardDescription>
          Crie contratos profissionais automaticamente usando inteligência artificial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informações Básicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nome do Cliente</Label>
            <Input
              id="clientName"
              placeholder="Empresa do Cliente Ltda"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Sua Empresa</Label>
            <Input
              id="companyName"
              placeholder="Sua Empresa S.A."
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>
        </div>

        {/* Descrição do Projeto */}
        <div className="space-y-2">
          <Label htmlFor="projectDescription">Descrição do Projeto</Label>
          <Textarea
            id="projectDescription"
            placeholder="Descreva detalhadamente o projeto, serviços a serem prestados, objetivos, etc. A IA usará estas informações para gerar o contrato completo."
            className="min-h-[120px]"
            value={formData.projectDescription}
            onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
          />
        </div>

        {/* Informações Adicionais */}
        <div className="space-y-2">
          <Label htmlFor="additionalInfo">Informações Adicionais (Opcional)</Label>
          <Textarea
            id="additionalInfo"
            placeholder="Cláusulas específicas, condições especiais, requisitos legais, etc."
            className="min-h-[80px]"
            value={formData.additionalInfo}
            onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
          />
        </div>

        {/* Botão Gerar com IA */}
        <Button
          onClick={handleGenerateWithAI}
          disabled={generating || !formData.projectDescription}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando contrato com IA...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Contrato com Inteligência Artificial
            </>
          )}
        </Button>

        {/* Resultado Gerado */}
        {generatedData && (
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Contrato Gerado</h3>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Título</p>
                  <p className="font-medium">{generatedData.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium">{generatedData.value || 'A definir'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Escopo</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {generatedData.scopeItems?.slice(0, 5).map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                  {generatedData.scopeItems?.length > 5 && (
                    <li className="text-muted-foreground">+{generatedData.scopeItems.length - 5} mais itens</li>
                  )}
                </ul>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Termos Principais</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {generatedData.terms?.slice(0, 3).map((term: string, i: number) => (
                    <li key={i}>{term}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Campos para preenchimento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data de Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data de Término</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Valor do Contrato</Label>
                <Input
                  id="value"
                  placeholder="R$ 0,00"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Condições de Pagamento</Label>
              <Input
                id="paymentTerms"
                placeholder="Ex: 50% na assinatura, 50% na entrega"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
              />
            </div>

            {/* Ações */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveContract}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Contrato'
                )}
              </Button>

              <Button variant="outline" className="flex-1" onClick={handleDownloadContract}>
                <Download className="mr-2 h-4 w-4" />
                Baixar Contrato
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
