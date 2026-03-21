'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  createProposal, 
  addPhase, 
  addItem, 
  addTerm, 
  sendProposal, 
  approveProposal,
  convertProposalToProject 
} from '@/actions/proposals';
import { Plus, Send, Check, FileText, Calendar, DollarSign, Clock, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Proposal {
  id: string;
  title: string;
  client_name: string;
  status: string;
  total_value: number;
  valid_until?: string;
  phases?: any[];
  items?: any[];
  terms?: any[];
}

interface ProposalBuilderProps {
  proposal?: Proposal;
  workspaceId: string;
}

export function ProposalBuilder({ proposal, workspaceId }: ProposalBuilderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: proposal?.title || '',
    description: proposal?.description || '',
    clientName: proposal?.client_name || '',
    clientEmail: '',
    totalValue: proposal?.total_value || 0,
    validUntil: proposal?.valid_until || '',
  });

  const handleSubmit = async () => {
    try {
      if (proposal) {
        // Update existing
      } else {
        await createProposal({
          ...formData,
          currency: 'BRL',
        });
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar proposta:', error);
    }
  };

  const handleSend = async () => {
    if (!proposal?.id) return;
    try {
      await sendProposal(proposal.id);
    } catch (error) {
      console.error('Erro ao enviar proposta:', error);
    }
  };

  const handleApprove = async () => {
    if (!proposal?.id) return;
    try {
      await approveProposal(proposal.id);
    } catch (error) {
      console.error('Erro ao aprovar proposta:', error);
    }
  };

  const handleConvert = async () => {
    if (!proposal?.id) return;
    try {
      const project = await convertProposalToProject(proposal.id);
      window.location.href = `/dashboard/projects/${project.id}`;
    } catch (error) {
      console.error('Erro ao converter proposta:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-purple-100 text-purple-800',
      negotiating: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      converted: 'bg-indigo-100 text-indigo-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const calculateTotalHours = () => {
    return proposal?.phases?.reduce((acc, phase) => acc + (phase.estimated_hours || 0), 0) || 0;
  };

  const calculateTimeline = () => {
    if (!proposal?.phases || proposal.phases.length === 0) return null;
    const start = proposal.phases[0]?.start_date;
    const end = proposal.phases[proposal.phases.length - 1]?.end_date;
    return { start, end };
  };

  const timeline = calculateTimeline();
  const totalHours = calculateTotalHours();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {proposal?.title || 'Nova Proposta'}
              </CardTitle>
              <CardDescription>
                {proposal?.client_name && `Cliente: ${proposal.client_name}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {proposal && (
                <Badge className={getStatusColor(proposal.status)}>
                  {proposal.status === 'draft' && 'Rascunho'}
                  {proposal.status === 'sent' && 'Enviado'}
                  {proposal.status === 'viewed' && 'Visualizado'}
                  {proposal.status === 'approved' && 'Aprovado'}
                  {proposal.status === 'converted' && 'Convertido'}
                  {proposal.status === 'rejected' && 'Rejeitado'}
                  {proposal.status === 'negotiating' && 'Negociação'}
                </Badge>
              )}
              <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                Editar
              </Button>
              {proposal?.status === 'draft' && (
                <Button onClick={handleSend}>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </Button>
              )}
              {proposal?.status === 'sent' && (
                <Button onClick={handleApprove} variant="default">
                  <Check className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
              )}
              {proposal?.status === 'approved' && (
                <Button onClick={handleConvert} variant="secondary">
                  <Plus className="w-4 h-4 mr-2" />
                  Converter em Projeto
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {isEditing && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título do Projeto</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Desenvolvimento de E-commerce"
                />
              </div>
              <div>
                <Label htmlFor="clientName">Nome do Cliente</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Nome da empresa ou pessoa"
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Email do Cliente</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  placeholder="cliente@empresa.com"
                />
              </div>
              <div>
                <Label htmlFor="totalValue">Valor Total (R$)</Label>
                <Input
                  id="totalValue"
                  type="number"
                  value={formData.totalValue}
                  onChange={(e) => setFormData({ ...formData, totalValue: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="validUntil">Válido Até</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o escopo do projeto..."
                rows={4}
              />
            </div>
            <Button onClick={handleSubmit}>Salvar</Button>
          </CardContent>
        )}
      </Card>

      {/* Tabs de Conteúdo */}
      <Tabs defaultValue="phases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="phases">Fases & Cronograma</TabsTrigger>
          <TabsTrigger value="items">Itens Inclusos</TabsTrigger>
          <TabsTrigger value="terms">Termos e Condições</TabsTrigger>
          <TabsTrigger value="preview">Visualizar PDF</TabsTrigger>
        </TabsList>

        {/* Fases e Cronograma */}
        <TabsContent value="phases" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cronograma do Projeto</CardTitle>
                  <CardDescription>
                    {timeline?.start && timeline?.end ? (
                      <>
                        {format(new Date(timeline.start), 'dd MMM yyyy', { locale: ptBR })} -{' '}
                        {format(new Date(timeline.end), 'dd MMM yyyy', { locale: ptBR })}
                      </>
                    ) : (
                      'Defina as datas nas fases'
                    )}
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Fase
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Fase</DialogTitle>
                    </DialogHeader>
                    {/* Form de nova fase aqui */}
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {proposal?.phases && proposal.phases.length > 0 ? (
                <div className="space-y-4">
                  {proposal.phases.map((phase, index) => (
                    <div key={phase.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Fase {phase.phase_number}: {phase.title}</h4>
                        <Badge variant="outline">{phase.estimated_hours}h</Badge>
                      </div>
                      {phase.description && (
                        <p className="text-sm text-gray-600">{phase.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {phase.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(phase.start_date), 'dd MMM', { locale: ptBR })}
                          </span>
                        )}
                        {phase.end_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(phase.end_date), 'dd MMM yyyy', { locale: ptBR })}
                          </span>
                        )}
                        {phase.value > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            R$ {phase.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      {phase.deliverables && phase.deliverables.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium mb-1">Entregáveis:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {phase.deliverables.map((deliverable: string, i: number) => (
                              <li key={i}>{deliverable}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Total: {totalHours} horas</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Valor Total</p>
                      <p className="text-lg font-bold text-green-600">
                        R$ {(proposal.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma fase cadastrada</p>
                  <p className="text-sm">Adicione as fases do projeto para definir o cronograma</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Itens Inclusos */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Itens do Escopo</CardTitle>
                  <CardDescription>Detalhamento dos serviços inclusos</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {proposal?.items && proposal.items.length > 0 ? (
                <div className="space-y-3">
                  {proposal.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.title}</h4>
                          {item.is_optional && (
                            <Badge variant="outline" className="text-xs">Opcional</Badge>
                          )}
                          {!item.included && (
                            <Badge variant="secondary" className="text-xs">Não incluso</Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Categoria: {item.category} • Qtd: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          R$ {item.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">
                          R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / un
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum item cadastrado</p>
                  <p className="text-sm">Adicione itens para detalhar o escopo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Termos e Condições */}
        <TabsContent value="terms" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Termos e Condições</CardTitle>
                  <CardDescription>Cláusulas contratuais da proposta</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Termo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {proposal?.terms && proposal.terms.length > 0 ? (
                <div className="space-y-3">
                  {proposal.terms.map((term, index) => (
                    <div key={term.id} className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">{index + 1}. {term.title}</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{term.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum termo cadastrado</p>
                  <p className="text-sm">Adicione termos e condições contratuais</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview para PDF */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Visualização da Proposta</CardTitle>
                  <CardDescription>Prévia do documento que será enviado ao cliente</CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-8 bg-white max-w-4xl mx-auto">
                {/* Cabeçalho */}
                <div className="border-b pb-6 mb-6">
                  <h1 className="text-2xl font-bold mb-2">{proposal?.title}</h1>
                  <p className="text-gray-600">Preparado para: {proposal?.client_name}</p>
                  {proposal?.valid_until && (
                    <p className="text-sm text-gray-500 mt-2">
                      Válido até: {format(new Date(proposal.valid_until), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>

                {/* Resumo */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Valor Total</p>
                    <p className="text-xl font-bold text-green-600">
                      R$ {(proposal?.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Prazo Estimado</p>
                    <p className="text-xl font-bold">
                      {timeline?.start && timeline?.end ? (
                        <>
                          {format(new Date(timeline.start), 'dd/MM')} -{' '}
                          {format(new Date(timeline.end), 'dd/MM/yyyy')}
                        </>
                      ) : (
                        'A definir'
                      )}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Carga Horária</p>
                    <p className="text-xl font-bold">{totalHours}h</p>
                  </div>
                </div>

                {/* Fases */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-4">Cronograma</h2>
                  {proposal?.phases && proposal.phases.length > 0 ? (
                    <div className="space-y-3">
                      {proposal.phases.map((phase) => (
                        <div key={phase.id} className="border-l-4 border-blue-500 pl-4 py-2">
                          <h3 className="font-medium">Fase {phase.phase_number}: {phase.title}</h3>
                          <p className="text-sm text-gray-600">{phase.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>{phase.estimated_hours}h</span>
                            {phase.start_date && (
                              <span>Início: {format(new Date(phase.start_date), 'dd/MM/yyyy')}</span>
                            )}
                            {phase.end_date && (
                              <span>Término: {format(new Date(phase.end_date), 'dd/MM/yyyy')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Nenhuma fase definida</p>
                  )}
                </div>

                {/* Termos */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-4">Termos e Condições</h2>
                  {proposal?.terms && proposal.terms.length > 0 ? (
                    <div className="space-y-3">
                      {proposal.terms.map((term, index) => (
                        <div key={term.id}>
                          <p className="font-medium text-sm">{index + 1}. {term.title}</p>
                          <p className="text-sm text-gray-700">{term.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Nenhum termo definido</p>
                  )}
                </div>

                {/* Rodapé */}
                <div className="border-t pt-6 mt-6 text-center text-sm text-gray-500">
                  <p>Esta proposta é válida até {proposal?.valid_until ? format(new Date(proposal.valid_until), 'dd/MM/yyyy') : 'data não definida'}.</p>
                  <p className="mt-2">Dúvidas? Entre em contato conosco.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
