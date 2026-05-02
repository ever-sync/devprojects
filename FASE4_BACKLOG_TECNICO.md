# Fase 4 — Backlog Técnico (Mês 3+)

Contexto: equipe ~30 pessoas, portal interno + clientes, stack Next.js + Supabase + Vercel.
Objetivo: expansão com foco em retenção, eficiência operacional e monetização.

## Ordem recomendada (impacto x risco)
1. PWA
2. CSAT/NPS
3. IA copiloto
4. Wiki interna
5. Onboarding estruturado
6. 1:1
7. OKRs
8. Contratos eletrônicos
9. Pix/boleto
10. BI

## Épico 1 — PWA
Meta: melhorar adoção mobile e recorrência de uso.

Tarefas:
- Registrar `manifest.webmanifest` com ícones e atalhos principais (Dashboard, Projetos, Meu Dia).
- Implementar service worker com estratégia segura (cache de assets estáticos + fallback offline leve).
- Adicionar banner de instalação para mobile/desktop.
- Definir páginas offline/erro de rede.
- Medir Web Vitals por dispositivo.

Critérios de aceite:
- Instalação funciona em Android e iOS (Add to Home Screen).
- Tela principal abre com ícones e nome corretos.
- Em perda de rede, app não quebra e exibe fallback.

## Épico 2 — CSAT/NPS
Meta: criar loop de feedback contínuo por cliente/projeto.

Tarefas:
- Modelar tabelas: `feedback_surveys`, `feedback_responses`, `feedback_events`.
- Disparo automático após marcos (entrega de fase / fechamento de task cliente).
- Formulário público autenticado por token curto.
- Dashboard com tendência por cliente e por tipo de projeto.
- Alertas para notas baixas (Slack + email).

Critérios de aceite:
- Pesquisa enviada automaticamente por regra configurada.
- Taxa de resposta e média exibidas em Analytics.
- Alerta gerado para nota abaixo de limiar.

## Épico 3 — IA Copiloto
Meta: acelerar operação diária com assistência contextual.

Tarefas:
- Comando rápido com intents: resumir projeto, listar bloqueios, sugerir próximos passos.
- Context retrieval por projeto (tarefas, comentários, aprovações, riscos).
- Guardrails: limites de escopo por workspace/role.
- Ações sugeridas com confirmação humana (não executar automaticamente sem consentimento).
- Logs de auditoria das interações com IA.

Critérios de aceite:
- Respostas contextualizadas por projeto/workspace.
- Zero vazamento entre clientes/workspaces.
- Trilhas de auditoria disponíveis para admins.

## Épico 4 — Wiki Interna
Meta: centralizar conhecimento e reduzir dependência de pessoas-chave.

Tarefas:
- Estrutura de páginas por área (Produto, Engenharia, Operação, Comercial).
- Editor com versionamento e histórico de alterações.
- Permissões por papel (admin/editor/viewer).
- Busca full-text com tags.
- Templates de página (runbook, post-mortem, playbook de projeto).

Critérios de aceite:
- Busca retorna artigos relevantes em <2s.
- Histórico mostra autor/data/diff básico.
- Permissões respeitam RBAC atual.

## Épico 5 — Onboarding Estruturado
Meta: reduzir tempo até produtividade de novos membros.

Tarefas:
- Checklist de onboarding por função (dev, PM, suporte, comercial).
- Trilhas com tarefas obrigatórias e prazos.
- Progresso por usuário + lembretes automáticos.
- Materiais vinculados à Wiki.

Critérios de aceite:
- Admin consegue criar/editar trilhas.
- Novo membro visualiza progresso e pendências.

## Épico 6 — Rotina de 1:1
Meta: melhorar acompanhamento de performance e clima.

Tarefas:
- Agenda recorrente de 1:1 por gestor/colaborador.
- Formulário pré-1:1 (bloqueios, conquistas, feedback).
- Registro privado com ações e follow-up.
- Lembretes e próximos passos.

Critérios de aceite:
- Ciclo completo (agendar -> registrar -> acompanhar) funcional.

## Épico 7 — OKRs
Meta: alinhar execução ao plano estratégico.

Tarefas:
- Estruturas: objetivos, key results, iniciativas.
- Vincular KR com métricas existentes (analytics, receita, margem, SLA).
- Atualização semanal de progresso.
- Painel executivo por trimestre.

Critérios de aceite:
- OKR trimestral criado e monitorado com histórico de updates.

## Épico 8 — Contratos Eletrônicos
Meta: reduzir ciclo comercial e risco jurídico operacional.

Tarefas:
- Selecionar provedor de assinatura (DocuSign/Clicksign).
- Gerar contrato por template com variáveis já existentes de propostas.
- Fluxo de assinatura e webhook de status.
- Armazenamento seguro do PDF assinado.

Critérios de aceite:
- Contrato sai da proposta e volta com status de assinatura sincronizado.

## Épico 9 — Pix/Boleto
Meta: acelerar cobrança e reduzir inadimplência.

Tarefas:
- Integração com gateway nacional (ex.: Asaas/Pagar.me/Stripe local features).
- Emissão de cobrança por projeto/parcela.
- Conciliação automática com faturas.
- Alertas de vencimento e atraso.

Critérios de aceite:
- Cobrança emitida e status refletido no módulo financeiro.

## Épico 10 — BI
Meta: visão executiva com métricas de negócio e operação.

Tarefas:
- Camada de métricas padronizadas (MRR, margem, lead time, throughput, NPS).
- Data marts no Supabase (views materializadas quando necessário).
- Painéis executivos (operacional, financeiro, comercial).
- Governança de métricas (owner, definição, periodicidade).

Critérios de aceite:
- Dashboard executivo com fonte única de verdade e atualização estável.

## Dependências críticas
- Migrations pendentes da Fase 2/3 aplicadas no Supabase.
- Revisão de RLS para novos módulos (feedback, wiki, OKR, 1:1).
- Política de auditoria unificada para ações sensíveis.

## Sprints sugeridas (8 semanas)
- Sprint A: PWA + CSAT/NPS
- Sprint B: IA Copiloto + Wiki
- Sprint C: Onboarding + 1:1 + OKRs
- Sprint D: Contratos + Pix/Boleto + BI (MVP)

## KPIs de sucesso da Fase 4
- Adoção semanal ativa (WAU) +20%
- NPS médio >= meta definida
- Tempo de onboarding reduzido em 30%
- Ciclo proposta->assinatura reduzido em 25%
- Inadimplência reduzida mês a mês
