'use client';

import { useState, useEffect } from 'react';
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
import {
  Plus, FileText, Send, CheckCircle, XCircle, ArrowRight,
  Download, Trash2, Clock, Calendar, Users, DollarSign,
  Milestone, Package,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  createProposal,
  updateProposalStatus,
  generateScopeDocument,
  convertProposalToProject,
  deleteProposal,
  getProposalTemplates,
  getProposalDetails,
} from '@/actions/proposals';

interface Proposal {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  total_value: number;
  currency: string;
  created_at: string;
  valid_until?: string | null;
  client?: { id: string; name: string } | null;
  converted_to_project_id?: string | null;
  workspace_id?: string;
  created_by?: string;
  updated_at?: string;
  template_data?: unknown;
  custom_fields?: unknown;
  version?: number;
}

interface ProposalsListProps {
  proposals: Proposal[];
  workspaceId: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-purple-100 text-purple-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  converted: 'bg-indigo-100 text-indigo-800',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  viewed: 'Visualizada',
  accepted: 'Aceita',
  rejected: 'Rejeitada',
  converted: 'Convertida',
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  milestone: 'Marco',
  delivery: 'Entrega',
  review: 'Revisao',
  meeting: 'Reuniao',
  deadline: 'Prazo',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  developer: 'Desenvolvedor',
  designer: 'Designer',
  manager: 'Gerente',
  tool: 'Ferramenta',
  service: 'Servico',
  other: 'Outro',
};

export function ProposalsList({ proposals, workspaceId }: ProposalsListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

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
                Crie sua primeira proposta para comecar a gerenciar escopos de projetos
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
                  {proposal.converted_to_project_id && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Projeto Criado
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-2 line-clamp-1">{proposal.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {proposal.description || 'Sem descricao'}
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
                  {proposal.status === 'accepted' && !proposal.converted_to_project_id && (
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

interface Template {
  id: string;
  name: string;
  description: string;
  defaultPhases: Array<{ title: string; duration_days: number; estimated_hours: number }>;
  defaultResources: Array<{ role_name: string; resource_type: string; allocated_hours: number }>;
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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: '',
    totalValue: '',
    currency: 'BRL',
    validUntil: '',
  });

  useEffect(() => {
    if (useTemplate && templates.length === 0) {
      getProposalTemplates().then((result) => {
        if (result.success && result.data) {
          setTemplates(result.data as Template[]);
        }
      });
    }
  }, [useTemplate, templates.length]);

  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template && !formData.title) {
        setFormData((prev) => ({
          ...prev,
          description: template.description,
        }));
      }
    }
  }, [selectedTemplate, templates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const template = templates.find((t) => t.id === selectedTemplate);
      const templateData = useTemplate && template
        ? {
            templateId: template.id,
            defaultPhases: template.defaultPhases,
            defaultResources: template.defaultResources,
          }
        : undefined;

      const result = await createProposal({
        title: formData.title,
        description: formData.description || undefined,
        clientId: formData.clientId || undefined,
        totalValue: formData.totalValue ? parseFloat(formData.totalValue) : undefined,
        currency: formData.currency,
        validUntil: formData.validUntil || undefined,
        templateData,
      });

      if (result.success) {
        onSuccess();
      } else {
        alert('Erro ao criar proposta: ' + result.error);
      }
    } catch {
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
          Preencha os dados da proposta. Voce pode usar um template para agilizar.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useTemplate"
            aria-label="Usar template pre-definido"
            checked={useTemplate}
            onChange={(e) => setUseTemplate(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="useTemplate">Usar template pre-definido</Label>
        </div>

        {useTemplate && (
          <div className="grid gap-2">
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && templates.find((t) => t.id === selectedTemplate) && (
              <p className="text-xs text-muted-foreground">
                {templates.find((t) => t.id === selectedTemplate)?.description}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="title">Titulo do Projeto</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Site Institucional - Empresa XYZ"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Descricao</Label>
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
                <SelectItem value="USD">USD - Dolar Americano</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="validUntil">Valido Ate (opcional)</Label>
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

interface ProposalPhase {
  id: string;
  phase_number: number;
  title: string;
  description?: string | null;
  deliverables: string[];
  estimated_hours: number;
  start_date_offset: number;
  duration_days: number;
  value: number;
  milestone: boolean;
  sort_order: number;
}

interface ProposalTimelineEvent {
  id: string;
  event_name: string;
  event_type: string;
  scheduled_date_offset: number;
  description?: string | null;
  responsible_role?: string | null;
  sort_order: number;
}

interface ProposalResource {
  id: string;
  resource_type: string;
  role_name: string;
  allocated_hours: number;
  hourly_rate?: number | null;
  total_cost?: number | null;
  notes?: string | null;
}

interface ProposalTerm {
  id: string;
  term_type: string;
  title: string;
  content: string;
  sort_order: number;
}

interface ProposalDocument {
  id: string;
  document_name: string;
  document_type: string;
  is_scope_document: boolean;
  uploaded_at: string;
}

interface ProposalDetails {
  phases: ProposalPhase[];
  timeline: ProposalTimelineEvent[];
  resources: ProposalResource[];
  terms: ProposalTerm[];
  documents: ProposalDocument[];
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
  const [details, setDetails] = useState<ProposalDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (open && !details) {
      loadDetails();
    }
  }, [open]);

  async function loadDetails() {
    setLoadingDetails(true);
    try {
      const result = await getProposalDetails(proposal.id);
      if (result.success && result.data) {
        setDetails({
          phases: (result.data.phases || []) as ProposalPhase[],
          timeline: (result.data.timeline || []) as ProposalTimelineEvent[],
          resources: (result.data.resources || []) as ProposalResource[],
          terms: (result.data.terms || []) as ProposalTerm[],
          documents: (result.data.documents || []) as ProposalDocument[],
        });
      }
    } catch {
      // silently fail, tabs will show empty state
    } finally {
      setLoadingDetails(false);
    }
  }

  const handleGenerateScope = async () => {
    setGenerating(true);
    try {
      const result = await generateScopeDocument(proposal.id);
      if (result.success && result.html) {
        setGeneratedHtml(result.html);
        loadDetails(); // reload documents
      } else {
        alert('Erro ao gerar escopo: ' + result.error);
      }
    } catch {
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
      alert('Proposta aceita! Agora voce pode converte-la em projeto.');
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

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta proposta? Esta acao nao pode ser desfeita.')) return;
    const result = await deleteProposal(proposal.id);
    if (result.success) {
      onOpenChange(false);
      window.location.reload();
    } else {
      alert('Erro ao excluir: ' + result.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposal.title}</DialogTitle>
          <DialogDescription>
            {proposal.description || 'Sem descricao'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="overview">Visao Geral</TabsTrigger>
            <TabsTrigger value="phases">Fases</TabsTrigger>
            <TabsTrigger value="timeline">Cronograma</TabsTrigger>
            <TabsTrigger value="resources">Recursos</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{proposal.client?.name || 'Nao definido'}</p>
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

            <div className="flex gap-2 pt-4 flex-wrap">
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
              {proposal.status === 'draft' && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              )}
            </div>

            {generatedHtml && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Escopo Gerado</h4>
                <div className="text-sm text-muted-foreground">
                  Documento HTML pronto para download. Clique em &quot;Baixar Escopo&quot; acima.
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="phases" className="mt-4">
            {loadingDetails ? (
              <LoadingSpinner />
            ) : !details?.phases.length ? (
              <EmptyState icon={<Package className="h-12 w-12" />} message="Nenhuma fase adicionada" />
            ) : (
              <div className="space-y-4">
                {details.phases.map((phase) => (
                  <Card key={phase.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {phase.milestone && <Milestone className="h-4 w-4 text-yellow-500" />}
                          Fase {phase.phase_number}: {phase.title}
                        </CardTitle>
                        {phase.value > 0 && (
                          <Badge variant="secondary">
                            <DollarSign className="h-3 w-3 mr-1" />
                            R$ {phase.value.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      {phase.description && (
                        <CardDescription>{phase.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {phase.estimated_hours}h estimadas
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {phase.duration_days} dias
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <ArrowRight className="h-3 w-3" />
                          Inicio: dia {phase.start_date_offset}
                        </div>
                      </div>
                      {phase.deliverables && phase.deliverables.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Entregaveis:</p>
                          <ul className="text-sm list-disc list-inside space-y-1">
                            {phase.deliverables.map((d, i) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            {loadingDetails ? (
              <LoadingSpinner />
            ) : !details?.timeline.length ? (
              <EmptyState icon={<Calendar className="h-12 w-12" />} message="Nenhum evento no cronograma" />
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                  <span>Evento</span>
                  <span>Tipo</span>
                  <span>Dia Previsto</span>
                  <span>Responsavel</span>
                </div>
                {details.timeline.map((event) => (
                  <div key={event.id} className="grid grid-cols-4 gap-2 px-4 py-3 text-sm border-b last:border-0 hover:bg-muted/50 rounded">
                    <div>
                      <p className="font-medium">{event.event_name}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      )}
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      Dia {event.scheduled_date_offset}
                    </div>
                    <div className="text-muted-foreground">
                      {event.responsible_role || '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="mt-4">
            {loadingDetails ? (
              <LoadingSpinner />
            ) : !details?.resources.length ? (
              <EmptyState icon={<Users className="h-12 w-12" />} message="Nenhum recurso adicionado" />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {details.resources.map((resource) => (
                  <Card key={resource.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{resource.role_name}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {RESOURCE_TYPE_LABELS[resource.resource_type] || resource.resource_type}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {resource.allocated_hours > 0 && (
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {resource.allocated_hours}h alocadas
                          </p>
                        )}
                        {resource.hourly_rate != null && resource.hourly_rate > 0 && (
                          <p className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> R$ {resource.hourly_rate.toFixed(2)}/h
                          </p>
                        )}
                        {resource.total_cost != null && resource.total_cost > 0 && (
                          <p className="font-medium text-primary">
                            Total: R$ {resource.total_cost.toFixed(2)}
                          </p>
                        )}
                      </div>
                      {resource.notes && (
                        <p className="mt-2 text-xs text-muted-foreground">{resource.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {loadingDetails ? (
              <LoadingSpinner />
            ) : !details?.documents.length ? (
              <EmptyState icon={<FileText className="h-12 w-12" />} message="Nenhum documento gerado" />
            ) : (
              <div className="space-y-2">
                {details.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.document_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.is_scope_document ? 'Escopo' : doc.document_type} - {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <div className="mx-auto mb-4 opacity-50 flex justify-center">{icon}</div>
      <p>{message}</p>
    </div>
  );
}
