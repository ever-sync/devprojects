'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Send, CheckCircle, XCircle, ArrowRight, Download, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  createProposal,
  updateProposalStatus,
  generateScopeDocument,
  convertProposalToProject,
  deleteProposal,
  getProposalTemplates,
} from '@/actions/proposals';

interface Proposal {
  id: string;
  title: string;
  description?: string;
  status: string;
  total_value: number;
  currency: string;
  created_at: string;
  valid_until?: string;
  client?: { name: string } | null;
  converted_project?: { id: string; name: string } | null;
}

interface ProposalsListProps {
  proposals: Proposal[];
  workspaceId: string;
}

export function ProposalsList({ proposals, workspaceId }: ProposalsListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      converted: 'bg-indigo-100 text-indigo-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      sent: 'Enviada',
      viewed: 'Visualizada',
      accepted: 'Aceita',
      rejected: 'Rejeitada',
      converted: 'Convertida',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Propostas e Escopos</h2>
          <p className="text-muted-foreground">
            Gerencie propostas, gere escopos e converta em projetos
          </p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Proposta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CreateProposalForm
              workspaceId={workspaceId}
              onSuccess={() => setIsCreating(false)}
              onCancel={() => setIsCreating(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma proposta criada</h3>
              <p className="mt-2 text-muted-foreground">
                Crie sua primeira proposta para começar a gerenciar escopos de projetos
              </p>
              <Button className="mt-4" onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Proposta
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <Badge className={getStatusColor(proposal.status)}>
                    {getStatusLabel(proposal.status)}
                  </Badge>
                  {proposal.converted_project && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Projeto Criado
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-2 line-clamp-1">{proposal.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {proposal.description || 'Sem descrição'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {proposal.client && (
                    <p className="text-muted-foreground">
                      <strong>Cliente:</strong> {proposal.client.name}
                    </p>
                  )}
                  <p className="text-lg font-semibold text-primary">
                    {formatCurrency(proposal.total_value, proposal.currency)}
                  </p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Criada: {formatDate(proposal.created_at)}</span>
                    {proposal.valid_until && (
                      <span>Vence: {formatDate(proposal.valid_until)}</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedProposal(proposal)}
                  >
                    Ver Detalhes
                  </Button>
                  {proposal.status === 'accepted' && !proposal.converted_project && (
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleConvert(proposal.id)}
                    >
                      <ArrowRight className="mr-1 h-3 w-3" />
                      Converter
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedProposal && (
        <ProposalDetailsDialog
          proposal={selectedProposal}
          open={!!selectedProposal}
          onOpenChange={(open) => !open && setSelectedProposal(null)}
        />
      )}
    </div>
  );

  async function handleConvert(proposalId: string) {
    if (!confirm('Tem certeza que deseja converter esta proposta em projeto?')) return;
    
    const result = await convertProposalToProject(proposalId);
    if (result.success) {
      alert('Proposta convertida com sucesso!');
      window.location.href = `/projects/${result.projectId}`;
    } else {
      alert('Erro ao converter: ' + result.error);
    }
  }
}

function CreateProposalForm({
  workspaceId,
  onSuccess,
  onCancel,
}: {
  workspaceId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: '',
    totalValue: '',
    currency: 'BRL',
    validUntil: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createProposal({
        title: formData.title,
        description: formData.description || undefined,
        clientId: formData.clientId || undefined,
        totalValue: formData.totalValue ? parseFloat(formData.totalValue) : undefined,
        currency: formData.currency,
        validUntil: formData.validUntil || undefined,
      });

      if (result.success) {
        onSuccess();
      } else {
        alert('Erro ao criar proposta: ' + result.error);
      }
    } catch (error) {
      alert('Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Criar Nova Proposta</DialogTitle>
        <DialogDescription>
          Preencha os dados da proposta. Você pode usar um template para agilizar.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useTemplate"
            checked={useTemplate}
            onChange={(e) => setUseTemplate(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="useTemplate">Usar template pré-definido</Label>
        </div>

        {useTemplate && (
          <div className="grid gap-2">
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website-basic">Site Institucional Básico</SelectItem>
                <SelectItem value="automation-zapier">Automação com Zapier/n8n</SelectItem>
                <SelectItem value="ecommerce-complete">E-commerce Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="title">Título do Projeto</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Site Institucional - Empresa XYZ"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descreva o projeto..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="totalValue">Valor Total (R$)</Label>
            <Input
              id="totalValue"
              type="number"
              value={formData.totalValue}
              onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="currency">Moeda</Label>
            <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL - Real Brasileiro</SelectItem>
                <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="validUntil">Válido Até (opcional)</Label>
          <Input
            id="validUntil"
            type="date"
            value={formData.validUntil}
            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Proposta'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ProposalDetailsDialog({
  proposal,
  open,
  onOpenChange,
}: {
  proposal: Proposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  const handleGenerateScope = async () => {
    setGenerating(true);
    try {
      const result = await generateScopeDocument(proposal.id);
      if (result.success && result.html) {
        setGeneratedHtml(result.html);
      } else {
        alert('Erro ao gerar escopo: ' + result.error);
      }
    } catch (error) {
      alert('Erro inesperado');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `escopo-${proposal.title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToClient = async () => {
    const result = await updateProposalStatus(proposal.id, 'sent');
    if (result.success) {
      alert('Proposta enviada ao cliente!');
      onOpenChange(false);
    } else {
      alert('Erro ao enviar: ' + result.error);
    }
  };

  const handleAccept = async () => {
    const result = await updateProposalStatus(proposal.id, 'accepted');
    if (result.success) {
      alert('Proposta aceita! Agora você pode convertê-la em projeto.');
      onOpenChange(false);
    } else {
      alert('Erro: ' + result.error);
    }
  };

  const handleReject = async () => {
    if (!confirm('Tem certeza que deseja rejeitar esta proposta?')) return;
    const result = await updateProposalStatus(proposal.id, 'rejected');
    if (result.success) {
      alert('Proposta rejeitada.');
      onOpenChange(false);
    } else {
      alert('Erro: ' + result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposal.title}</DialogTitle>
          <DialogDescription>
            {proposal.description || 'Sem descrição'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="phases">Fases</TabsTrigger>
            <TabsTrigger value="timeline">Cronograma</TabsTrigger>
            <TabsTrigger value="resources">Recursos</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{proposal.client?.name || 'Não definido'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="font-medium text-lg text-primary">
                  {formatCurrency(proposal.total_value, proposal.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={getStatusColor(proposal.status)}>
                  {getStatusLabel(proposal.status)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Criada em</p>
                <p className="font-medium">{formatDate(proposal.created_at)}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {proposal.status === 'draft' && (
                <>
                  <Button onClick={handleSendToClient}>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar ao Cliente
                  </Button>
                  <Button variant="outline" onClick={handleGenerateScope} disabled={generating}>
                    <FileText className="mr-2 h-4 w-4" />
                    {generating ? 'Gerando...' : 'Gerar Escopo'}
                  </Button>
                </>
              )}
              {proposal.status === 'sent' && (
                <>
                  <Button variant="destructive" onClick={handleReject}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                  <Button onClick={handleAccept}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aceitar
                  </Button>
                </>
              )}
              {generatedHtml && (
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Escopo
                </Button>
              )}
            </div>

            {generatedHtml && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Escopo Gerado</h4>
                <div className="text-sm text-muted-foreground">
                  Documento HTML pronto para download. Clique em "Baixar Escopo" acima.
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="phases" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>Fases serão exibidas aqui após adicionadas</p>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>Cronograma será exibido aqui após adicionado</p>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>Recursos serão exibidos aqui após adicionados</p>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>Documentos anexados aparecerão aqui</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      converted: 'bg-indigo-100 text-indigo-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      sent: 'Enviada',
      viewed: 'Visualizada',
      accepted: 'Aceita',
      rejected: 'Rejeitada',
      converted: 'Convertida',
    };
    return labels[status] || status;
  }
}
