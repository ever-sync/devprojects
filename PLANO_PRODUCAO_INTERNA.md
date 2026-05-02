# Plano de Produção Interna — ReobotLabs Portal

**Objetivo:** colocar o app em produção para uso interno da equipe (devs, automação, IA de atendimento) e clientes.

**Premissas:**
- Time pequeno-médio (até 30 pessoas)
- Multi-tenant com clientes acessando portal
- 3 tipos de produto: SaaS, N8N, IA de Atendimento
- Hospedagem: Vercel + Supabase (já configurado)

**Legenda de esforço:**
- 🟢 **S** — até 4h
- 🟡 **M** — 1-2 dias
- 🟠 **L** — 3-5 dias
- 🔴 **XL** — 1-2 semanas

---

## FASE 0 — Pré-Lançamento (BLOQUEADORES)

> **Sem isso o app quebra em uso real. Resolver antes de qualquer deploy.**

### 0.1 Corrigir placeholders dos painéis de IA 🟡 M
**Por quê:** Task Generator, Contract Generator, Process Analyzer e GitHub Analyzer têm `clientId`/`projectId` hardcoded como `'placeholder'`. Nada salva corretamente.

**Arquivos:**
- `src/components/ai/task-generator.tsx` — implementar `handleSaveTasks()` real
- `src/components/contracts/contract-generator.tsx`
- `src/components/ai/process-analyzer.tsx`
- `src/components/github/github-analyzer.tsx`

**Aceite:** botões "Salvar" persistem dados vinculados ao projeto correto e aparecem nas listas relevantes.

### 0.2 Embeddings reais no AI Chat 🟡 M
**Por quê:** `Math.random()` em vez de embeddings reais quebra busca semântica.

**Arquivo:** `src/actions/ai-chat.ts` linhas 33 e 222

**Aceite:** chamada `openai.embeddings.create({ model: 'text-embedding-3-small', input })` real, vetor armazenado e busca por similaridade funcional via pgvector.

### 0.3 Email transacional real 🟡 M
**Por quê:** Hoje "marcar como enviado" é só registro no banco. Cliente nunca recebe relatório.

**Solução:** integrar Resend ou SendGrid.
- Criar `src/lib/email.ts` com `sendEmail({ to, subject, html, attachments })`
- Atualizar `markReportSent()` para enviar de fato
- Templates simples em React Email
- ENV: `RESEND_API_KEY`

**Aceite:** botão "Enviar para Cliente" dispara email real e marca como enviado.

### 0.4 Mobile responsive básico 🟠 L
**Por quê:** sidebar tem `hidden md:block` — em celular, navegação inacessível.

**Solução:**
- Drawer/Sheet com hamburger no mobile
- Tabela de tasks vira lista vertical no mobile
- ProjectTabs com scroll horizontal (já tem)
- Forms compactos

**Aceite:** todas as rotas funcionais em viewport ≤ 480px.

### 0.5 Rate limiting nos webhooks 🟢 S
**Por quê:** `/api/webhooks/n8n` e `/api/webhooks/github` aceitam qualquer volume com token válido.

**Solução:** middleware com `@upstash/ratelimit` ou contador in-memory, 60 req/min por IP.

### 0.6 Tratamento de erros + Sentry 🟢 S
**Por quê:** erros somem em produção sem visibilidade.

**Solução:**
- Instalar `@sentry/nextjs`
- Substituir `console.error` por `captureException`
- Boundary de erro em `app/error.tsx` global e por rota

---

## FASE 1 — Pronto para Produção (Semana 1-2)

> **Mínimo para deploy estável e auditável.**

### 1.1 SSO Google Workspace 🟡 M
**Por quê:** Funcionários não devem criar senha manual. Provisionamento e desativação via Google.

**Solução:** Supabase Auth → Provider Google ativado. Restringir domínio (`@suaempresa.com`) via trigger.

### 1.2 MFA opcional para admins 🟢 S
Supabase já suporta TOTP. Forçar para `role='admin'`.

### 1.3 Permissões granulares por papel 🟠 L
**Hoje:** só `admin` e `client`.

**Adicionar:**
- `manager` (gerente de projeto — vê todos, edita os seus)
- `developer` (vê seus projetos e tasks)
- `designer` (similar)
- `finance` (acesso ao financeiro de todos)

**Solução:** enum `team_role`, atualizar RLS policies, helpers em `lib/permissions.ts`.

### 1.4 Backup automatizado 🟢 S
**Solução:** Supabase Backups (pago) OU script GitHub Actions diário rodando `pg_dump` para S3.

### 1.5 Variáveis de ambiente / staging 🟡 M
- Branch `staging` no Vercel apontando para projeto Supabase staging
- Documentar `.env.example` completo
- Migrations rodam automaticamente via Supabase CLI no CI

### 1.6 Health check + status page 🟢 S
- `/api/health` retorna 200 se DB e OpenAI respondem
- Uptime Robot ou BetterStack monitorando

### 1.7 Logs de auditoria visíveis 🟡 M
**Por quê:** tabela `audit_logs` existe mas não tem UI dedicada.

**Solução:** página `/settings/audit-log` com filtros por usuário, ação, período.

### 1.8 Disparo real de notificações in-app 🟡 M
**Hoje:** tabela `notifications` existe, mas sem badge/sininho no header.

**Solução:**
- Componente `NotificationBell` com Supabase Realtime
- Badge com contador não lidos
- Drawer com lista, marcar como lido

---

## FASE 2 — Operação Diária (Semana 3-4)

> **O que vai fazer o time usar o app todo dia em vez de planilhas.**

### 2.1 Timer de tempo start/stop 🟡 M
**Hoje:** time entries são manuais via formulário.

**Solução:**
- Botão flutuante "▶ Iniciar timer" em cada task
- Timer ativo persistente (uma task por vez)
- Para automaticamente após 8h ou na meia-noite
- Salva entry com hora real ao parar

### 2.2 Dashboard "Meu Dia" 🟡 M
Página `/my-day` que cada funcionário vê ao logar:
- Tasks atribuídas a ele agrupadas por projeto
- Tasks que chegaram nas últimas 24h (destaque)
- Reuniões do dia
- Aprovações pendentes nele
- Botão "Iniciar timer" em cada task

### 2.3 Busca global (cmd+k) 🟡 M
**Por quê:** sem isso, achar tarefa em 50 projetos é impossível.

**Solução:** já existe `cmdk` no package.json. Implementar `CommandPalette` que busca tasks, projetos, clientes, scripts e workflows.

### 2.4 Daily Standup automático 🟡 M
- Bot envia no Slack/email todo dia 9h: "O que você fez ontem? O que vai fazer hoje? Bloqueios?"
- Respostas viram cards na página `/team/standup`
- Resumo automático com IA para o gerente

### 2.5 Checklist dentro de tasks 🟢 S
**Por quê:** tarefa "Implementar feature X" precisa ter sub-itens.

**Solução:** campo `checklist JSONB` em `tasks` + UI de checkboxes.

### 2.6 Tasks recorrentes 🟢 S
- Cron field na task ("toda segunda às 9h")
- Worker do Supabase recria a task quando termina

### 2.7 Templates por tipo de projeto 🟡 M
Hoje tem `phase_template_items` mas precisa:
- Template SaaS (descoberta → MVP → beta → release)
- Template N8N (mapeamento → POC → produção → handoff)
- Template IA Atendimento (escopo → prompt v1 → testes → produção → otimização)
- Cada template inclui tasks + scripts/snapshots iniciais

### 2.8 Templates de proposta 🟢 S
- Biblioteca `proposal_templates` com clausulas pré-prontas
- Variáveis substituíveis: {{cliente}}, {{prazo}}, {{valor}}

### 2.9 Slack notifications real 🟡 M
**Por quê:** time já está no Slack.

**Solução:**
- OAuth Slack na settings/integrations
- Eventos: nova task atribuída, mention em comentário, aprovação pendente, deploy, erro N8N
- DM ou canal configurável por evento

---

## FASE 3 — Gestão e Escala (Semana 5-8)

> **Quando o time cresce e você precisa enxergar o todo.**

### 3.1 Workflow Engine completo 🔴 XL
Hoje tem `@ts-nocheck` indicando schema sem implementação real.

**Entregar:**
- Tabelas migradas e tipadas
- UI visual de workflow builder (nodes + arestas)
- Triggers reais (cron, webhook, evento)
- Executor de steps com retry e dead letter queue
- Logs de execução por step

### 3.2 Capacity planning 🟠 L
- Tabela `team_capacity` (já existe)
- View semanal: cada pessoa, % alocação por projeto
- Heatmap "essa semana vs próxima"
- Alerta de overbooking (>100% alocado)

### 3.3 Resource allocation visual 🟠 L
- Drag-drop de pessoas em projetos
- Gantt com swimlane por pessoa
- Calcula automaticamente conflitos

### 3.4 Custo real e lucratividade por projeto 🟠 L
- `hourly_cost` por funcionário (privado, só admin/finance)
- `time_entries` × `hourly_cost` = custo real
- Comparar com `contract_value` → margem real
- Dashboard `/analytics/profitability`

### 3.5 Performance individual 🟠 L
- Tasks concluídas / período
- Tempo médio por tipo de task
- Aprovações no primeiro envio (qualidade)
- Gráfico pessoal `/profile/performance`

### 3.6 Analytics conectada de verdade 🟡 M
Hoje `/analytics` é placeholder. Conectar gráficos reais:
- Receita mensal (faturamento)
- MRR de SaaS por cliente
- Funil de propostas (lead → proposta → contrato)
- Health geral do portfolio

### 3.7 Burndown e Velocity 🟡 M
- Gráfico burndown por projeto/sprint
- Velocity histórica do time
- Forecast estatístico de conclusão

### 3.8 Discord integration 🟡 M
Mesmo padrão do Slack para times que usam Discord.

### 3.9 WhatsApp Business API real 🟠 L
**Por quê:** notificação WhatsApp aparece nas settings mas não dispara.

**Solução:** integrar Z-API, Twilio ou Evolution API. Envio confirmado via webhook.

### 3.10 Diff visual de escopo 🟡 M
- Comparar 2 versões de `project_scope_versions` lado a lado
- Highlight de itens adicionados/removidos/alterados

### 3.11 Portal público enriquecido 🟠 L
Hoje só mostra documentos. Adicionar:
- Status atual do projeto + saúde
- Progresso por fase
- Marcos próximos
- Últimos relatórios enviados
- Tarefas concluídas no período (sem detalhes internos)

---

## FASE 4 — Expansão (Mês 3+)

> **Diferenciais e features avançadas.**

### 4.1 Knowledge Base / Wiki interno 🔴 XL
- `/wiki` com páginas markdown
- Categorias por área (dev, design, processos, onboarding)
- Busca full-text
- Versionamento via Supabase
- Comentários e revisões

### 4.2 Onboarding de novos funcionários 🟠 L
- Workflow automatizado: "Maria entrou hoje"
- Cria checklist (criar conta Slack, acesso GitHub, leitura wiki, 1:1s agendados)
- Mentor designado
- 30/60/90 dias automatizado

### 4.3 1:1s e feedback contínuo 🟠 L
- Agendamento recorrente automático gerente↔liderado
- Template de pauta (going well, struggling, growth)
- Histórico privado entre os dois
- Action items virando tasks

### 4.4 OKRs e Goals 🟠 L
- Tabela `goals` com hierarquia (empresa → time → individual)
- Check-in mensal
- Vinculação a projetos/tasks que avançam o OKR
- Dashboard de progresso

### 4.5 CSAT/NPS de clientes 🟡 M
- Pesquisa automática trimestral via portal público
- Score por cliente, evolução temporal
- Comentários qualitativos com IA categorizando

### 4.6 PWA / Mobile App 🔴 XL
- Service worker + manifest
- Funciona offline com sync ao reconectar
- Notificações push
- Instalável no celular

### 4.7 Auto-detecção de overdue + IA sugerindo replanejamento 🟡 M
- Cron diário detecta tasks atrasadas
- IA sugere: realocar, dividir, ou descartar
- Notifica responsável + gerente

### 4.8 Documentation generator 🟡 M
- A partir do código (GitHub) + tasks + comentários, IA gera documentação técnica
- Salva como wiki da knowledge base

### 4.9 IA copiloto de gestão 🟠 L
- "Como está o projeto X?" → resumo com IA
- "Quem está sobrecarregado?" → análise capacity
- "Crie a proposta para o cliente Y baseada no projeto Z" → gera proposta

### 4.10 Contratos eletrônicos com assinatura 🟠 L
- Integrar D4Sign, Clicksign ou DocuSeal
- Envio direto do app
- Status de assinatura sincronizado

### 4.11 Integração financeira (Pix/boleto) 🟠 L
- Asaas, Stripe ou Pagar.me
- Cobrança automatizada por marco
- Conciliação bancária

### 4.12 BI/Data Warehouse 🔴 XL
- Replicação Supabase → BigQuery ou Postgres
- Dashboards Metabase/Superset
- Para análises pesadas que não devem rodar no banco operacional

---

## Cronograma Sugerido

| Semana | Foco | Entregáveis |
|--------|------|-------------|
| 0 | Pré-lançamento | Fase 0 completa |
| 1-2 | Produção segura | Fase 1 (SSO, permissões, backup, Sentry) |
| 3-4 | Equipe usando | Fase 2 (timer, my-day, busca, standup, slack) |
| 5-6 | Gestão | Fase 3 itens 3.1-3.5 (workflow real, capacity, custos) |
| 7-8 | Analytics | Fase 3 itens 3.6-3.11 (analytics, integrações, portal) |
| 9-12 | Expansão | Fase 4 conforme prioridade do negócio |

---

## Decisões Arquiteturais Pendentes

### A. Email Provider
**Opções:** Resend (recomendado, dev-friendly, $20/mo até 50k), SendGrid (legado, $20/mo), Postmark (transacional puro, melhor entregabilidade).
**Decisão:** Resend.

### B. Observabilidade
**Opções:** Sentry (erros), BetterStack (logs+uptime), Vercel Analytics (built-in).
**Decisão:** Sentry para erros + Vercel Analytics para métricas + BetterStack para uptime.

### C. WhatsApp Provider
**Opções:** Z-API (R$ 99/mo, fácil), Twilio (caro mas estável), Evolution API (open source, self-hosted).
**Decisão:** depende do volume — começar Z-API, migrar para Evolution se passar de 10k msg/mês.

### D. Slack vs Discord
**Decisão:** ambos via mesma abstração `external_integrations`, configurável por workspace.

### E. Hospedagem
**Atual:** Vercel + Supabase. Suficiente até ~50 usuários ativos. Acima disso considerar:
- Mover Supabase para self-hosted (Docker em VPS)
- Vercel Pro ou Railway

---

## Custos Estimados (mês, em produção)

| Item | Plano mínimo | Custo |
|------|-------------|-------|
| Vercel | Pro | $20 |
| Supabase | Pro | $25 |
| OpenAI | Uso médio (gpt-4o-mini) | $50-150 |
| Resend | 50k emails | $20 |
| Sentry | Team | $26 |
| BetterStack | Free → Team | $0-29 |
| Z-API WhatsApp | Pessoal | $20 |
| Domínio | .com.br | $4 |
| **Total** | | **~$170-300/mês** |

---

## Métricas de Sucesso (90 dias após lançamento)

- ✅ 80% do time loga 5x/semana
- ✅ 90% das tasks têm responsável e prazo
- ✅ Tempo médio de resposta a aprovação cliente: <48h
- ✅ Margem real medida em todos os projetos ativos
- ✅ 100% dos clientes recebem ao menos 1 status report/mês
- ✅ Zero perda de dados (backup verificado)
- ✅ Uptime > 99.5%

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Time não adota app, volta pra planilha | Fase 2 prioriza UX. Forçar adoção: standup só responde no app. |
| Custos OpenAI explodem | Cache em queries repetidas, modelo mini por padrão, limite por workspace |
| LGPD / dados sensíveis | RLS já existe. Adicionar termos de privacidade, exportar dados pessoais sob demanda. |
| Cliente vê dado interno | Auditoria por papel. Portal público só com dados marcados como `public=true`. |
| Migração de planilhas | Script de import CSV + treinamento. 1 sessão por área. |

---

## Próximos Passos Imediatos

1. **Esta semana:** rodar migrations 045 e 046, executar Fase 0 (placeholders + embeddings + email + mobile básico)
2. **Próxima semana:** Fase 1.1 e 1.3 (SSO + permissões granulares)
3. **Reunião de kickoff com o time** para apresentar ferramenta e coletar feedback antes da Fase 2
4. **Designar um "champion"** por área (dev, automação, atendimento) para dar feedback e propagar uso
