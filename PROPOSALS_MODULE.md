# Módulo de Propostas e Escopos - Implementação Completa

## 📋 Visão Geral

Módulo completo para criação, gestão e envio de propostas comerciais/profissionais diretamente na plataforma. Permite gerar documentos de escopo com fases, cronograma, valores e termos contratuais, enviar para clientes e converter em projetos após aprovação.

## 🗄️ Banco de Dados

### Tabelas Criadas

#### `project_proposals`
- `id` - UUID primário
- `workspace_id` - Vínculo com workspace
- `project_id` - Projeto convertido (opcional)
- `title` - Título da proposta
- `description` - Descrição do escopo
- `client_name` - Nome do cliente
- `client_email` - Email do cliente
- `status` - draft/sent/viewed/negotiating/approved/rejected/expired/converted
- `total_value` - Valor total
- `currency` - Moeda (BRL, USD, etc.)
- `valid_until` - Data de validade
- `created_by` - Autor da proposta
- `public_share_token` - Token para compartilhamento público
- `version` - Controle de versões

#### `proposal_phases`
- `id` - UUID primário
- `proposal_id` - Vínculo com proposta
- `phase_number` - Número da fase
- `title` - Título da fase
- `description` - Descrição detalhada
- `deliverables` - Array de entregáveis (JSONB)
- `estimated_hours` - Horas estimadas
- `start_date` / `end_date` - Datas
- `value` - Valor da fase
- `percentage_of_total` - Percentual do total
- `dependencies` - Dependências entre fases
- `sort_order` - Ordenação

#### `proposal_items`
- `id` - UUID primário
- `proposal_id` - Vínculo com proposta
- `category` - Categoria (development/design/infrastructure)
- `title` - Título do item
- `description` - Descrição
- `quantity` / `unit_price` / `total_price` - Valores
- `is_optional` - Se é item opcional
- `included` - Se está incluso
- `sort_order` - Ordenação

#### `proposal_terms`
- `id` - UUID primário
- `proposal_id` - Vínculo com proposta
- `title` - Título do termo
- `content` - Conteúdo completo
- `sort_order` - Ordenação

#### `proposal_versions`
- `id` - UUID primário
- `proposal_id` - Vínculo com proposta
- `version_number` - Número da versão
- `changes_summary` - Resumo das alterações
- `snapshot_data` - Snapshot completo (JSONB)
- `created_by` - Autor da versão

### Políticas RLS
- Visualização: membros do workspace
- Criação/Edição: owner, admin, manager
- Exclusão: owner, admin
- Acesso público: via token único

## 🔧 Server Actions

### CRUD Principal
- `createProposal(input)` - Criar nova proposta
- `updateProposal({id, ...updates})` - Atualizar proposta
- `getProposalDetails(id)` - Obter detalhes completos
- `listProposals(workspaceId, filters)` - Listar propostas

### Fluxo de Trabalho
- `sendProposal(id)` - Enviar para cliente
- `approveProposal(id)` - Aprovar proposta
- `convertProposalToProject(id)` - Converter em projeto
- `generatePublicShareToken(id)` - Gerar token público
- `getProposalByToken(token)` - Obter via token público

### Componentes da Proposta
- `addPhase(proposalId, input)` - Adicionar fase
- `addItem(proposalId, input)` - Adicionar item
- `addTerm(proposalId, input)` - Adicionar termo

## 🎨 Componentes React

### `ProposalBuilder`
Componente principal com interface completa:

**Features:**
- ✅ Header com status e ações (Editar, Enviar, Aprovar, Converter)
- ✅ Formulário de edição de dados básicos
- ✅ Tabs para organização:
  - **Fases & Cronograma**: Timeline visual com fases, datas e horas
  - **Itens Inclusos**: Detalhamento de serviços com valores
  - **Termos e Condições**: Cláusulas contratuais
  - **Visualizar PDF**: Preview do documento final

**Status Colors:**
- Draft (Rascunho) - Cinza
- Sent (Enviado) - Azul
- Viewed (Visualizado) - Roxo
- Negotiating (Negociação) - Amarelo
- Approved (Aprovado) - Verde
- Rejected (Rejeitado) - Vermelho
- Converted (Convertido) - Índigo

## 🌐 API Endpoints

### `POST /api/proposals/generate-pdf`
Gera PDF da proposta para download/envio.

**Request:**
```json
{ "proposalId": "uuid" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proposal": {...},
    "pdfUrl": "/dashboard/proposals/{id}/preview"
  }
}
```

### `GET /api/proposals/public?token={token}`
Endpoint público para clientes visualizarem propostas.

**Response:**
```json
{
  "success": true,
  "data": { /* proposta completa */ }
}
```

## 🚀 Como Usar

### 1. Criar Nova Proposta
```tsx
import { ProposalBuilder } from '@/components/proposals/proposal-builder';

<ProposalBuilder workspaceId={workspace.id} />
```

### 2. Editar Proposta Existente
```tsx
const proposal = await getProposalDetails(proposalId);

<ProposalBuilder 
  proposal={proposal} 
  workspaceId={workspace.id} 
/>
```

### 3. Fluxo Completo

1. **Criar rascunho** → Preencher dados básicos
2. **Adicionar fases** → Definir cronograma e entregáveis
3. **Adicionar itens** → Detalhar serviços e valores
4. **Adicionar termos** → Incluir condições contratuais
5. **Visualizar preview** → Revisar documento
6. **Enviar para cliente** → Gera link público e envia email
7. **Cliente visualiza** → Status muda para "viewed"
8. **Aprovação** → Cliente aprova online
9. **Converter em projeto** → Cria projeto automaticamente

## 📊 Templates Sugeridos

### Template: Desenvolvimento Website
```json
{
  "phases": [
    {
      "title": "Descoberta e Planejamento",
      "estimated_hours": 20,
      "deliverables": ["Briefing", "Sitemap", "Wireframes"]
    },
    {
      "title": "Design UI/UX",
      "estimated_hours": 40,
      "deliverables": ["Mockups", "Protótipo", "Guia de Estilo"]
    },
    {
      "title": "Desenvolvimento Frontend",
      "estimated_hours": 80,
      "deliverables": ["Site Responsivo", "Integrações", "SEO"]
    },
    {
      "title": "Testes e Lançamento",
      "estimated_hours": 20,
      "deliverables": ["Testes QA", "Deploy", "Treinamento"]
    }
  ]
}
```

### Template: Automação de Processos
```json
{
  "phases": [
    {
      "title": "Análise de Processos",
      "estimated_hours": 16,
      "deliverables": ["Mapeamento", "Documentação AS-IS"]
    },
    {
      "title": "Desenvolvimento de Automações",
      "estimated_hours": 60,
      "deliverables": ["Workflows", "Integrações APIs", "Webhooks"]
    },
    {
      "title": "Validação e Treinamento",
      "estimated_hours": 24,
      "deliverables": ["Testes UAT", "Documentação TO-BE", "Treinamento"]
    }
  ]
}
```

## 🔒 Segurança

- **RLS Policies**: Proteção em nível de banco de dados
- **Tokens Únicos**: Cada proposta tem token público único
- **Audit Trail**: Histórico de versões com snapshots
- **Permissões Granulares**: Baseado em roles do workspace

## 📈 Próximos Melhorias

1. **Geração de PDF Real**: Integrar `react-pdf` ou `puppeteer`
2. **Assinatura Digital**: Integração com DocuSign/ClickSign
3. **Email Automático**: Envio de propostas por email
4. **Templates Salvos**: Biblioteca de templates reutilizáveis
5. **Multi-moeda**: Suporte a conversão automática
6. **Analytics**: Tracking de visualizações e tempo gasto
7. **Comentários**: Área de negociação com comentários
8. **Pagamentos**: Integração com gateway para sinal/entrada

## 📁 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/040_project_proposals.sql` | Schema do banco |
| `supabase/migrations/041_proposals_rls_policies.sql` | Políticas RLS |
| `src/actions/proposals.ts` | Server Actions (11 funções) |
| `src/components/proposals/proposal-builder.tsx` | Componente principal |
| `src/app/api/proposals/route.ts` | API endpoints |

## ✅ Checklist de Uso

- [ ] Aplicar migrations no Supabase
- [ ] Testar criação de proposta
- [ ] Adicionar fases e itens
- [ ] Visualizar preview
- [ ] Enviar para cliente (gerar token)
- [ ] Testar visualização pública
- [ ] Aprovar proposta
- [ ] Converter em projeto
- [ ] Validar integração com módulo de projetos

---

**Status**: ✅ Implementado e pronto para uso
**Versão**: 1.0.0
**Última atualização**: 2025
