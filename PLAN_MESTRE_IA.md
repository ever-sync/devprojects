# 🚀 Plano Mestre: Automação Inteligente com IA para ReobotLabs

## Visão Geral
Transformar o ReobotLabs em uma plataforma **AI-Native**, onde a Inteligência Artificial não é apenas um recurso, mas o motor central de geração de contratos, escopos, tarefas e análise de código.

---

## 📋 Módulo 1: Geração Inteligente de Contratos e Escopos (PDF)

### Objetivo
Criar documentos jurídicos e técnicos personalizados automaticamente a partir dos dados do projeto, com validade visual e estrutura profissional.

### Funcionalidades
1. **Motor de Templates Dinâmicos**
   - Templates modulares (Cláusulas de LGPD, SLA, Pagamento, Escopo Técnico).
   - Injeção automática de variáveis: Nomes, valores, datas, marcos de faturamento.
   - Suporte a condicionais (ex: se "Fixo" -> mostrar cláusula de valor fixo; se "Hora" -> mostrar taxa horária).

2. **Gerador de Escopo Técnico**
   - Transforma *Phases* e *Tasks* do banco de dados em narrativa técnica.
   - Inclui diagramas (Mermaid.js) gerados automaticamente baseados nas dependências das tarefas.
   - Define "O que está incluso" vs "O que não está incluso" baseado nas tags das tarefas.

3. **Exportação PDF Profissional**
   - Renderização server-side (usando `react-pdf` ou `puppeteer`) para garantir fidelidade.
   - Assinatura digital integrada (link para DocuSign ou assinatura nativa com validade jurídica).
   - Versionamento de documentos (v1.0, v1.1 com controle de mudanças).

### Stack Sugerida
- **PDF:** `@react-pdf/renderer` (para tipagem TS e componentes React) ou `Puppeteer` (para layouts complexos).
- **Armazenamento:** Supabase Storage (bucket `contracts`).
- **IA:** Prompt estruturado para refinar a linguagem jurídica baseada no tom da empresa.

---

## 🧠 Módulo 2: Análise de Processos e Otimização (Process Mining)

### Objetivo
Analisar o fluxo atual do projeto para identificar gargalos, desvios de escopo e riscos de atraso antes que aconteçam.

### Funcionalidades
1. **Detecção de Gargalos**
   - Identificar tarefas que ficam muito tempo em "In Progress" ou "Review".
   - Alertar sobre dependências circulares ou bloqueadas há > 48h.

2. **Análise de Desvio de Escopo (Scope Creep)**
   - Comparar o escopo original (contrato) com as tarefas criadas posteriormente.
   - Alertar: "Foram criadas 5 tarefas fora das fases originais. Risco de estouro de orçamento: 15%".

3. **Previsão de Conclusão**
   - Usar dados históricos de velocidade da equipe para prever a data real de entrega vs. data contratada.

### Implementação
- **Background Jobs:** Cron jobs diários no Supabase/Edge Functions para calcular métricas.
- **Dashboard de Saúde:** Score de 0-100 para a saúde do projeto.

---

## ✨ Módulo 3: Geração de Tarefas com IA (Text-to-Task)

### Objetivo
Transformar descrições vagas, atas de reunião ou e-mails em tarefas estruturadas, estimadas e atribuídas.

### Fluxo de Trabalho
1. **Input:** Usuário cola o texto de uma reunião ou sobe um arquivo de áudio (transcrito).
2. **Processamento IA:**
   - Extrai ações acionáveis.
   - Sugere título, descrição detalhada, critérios de aceitação (Gherkin).
   - Estima esforço (Story Points) baseado em tarefas similares históricas.
   - Sugere a Fase e o Responsável ideal.
3. **Ação:** Usuário revisa e clica em "Criar Tarefas em Lote".

### Prompt Engineering Exemplo
```text
Você é um Gerente de Projetos Sênior. Analise o texto abaixo.
Extraia todas as tarefas técnicas.
Para cada tarefa, retorne JSON: { title, description, acceptance_criteria[], estimated_hours, phase_suggestion }.
Não invente tarefas, foque no que foi discutido.
```

---

## 🔍 Módulo 4: Análise de Repositórios Git com IA (Code Reviewer & Auditor)

### Objetivo
Conectar o GitHub/GitLab ao projeto e usar IA para explicar o impacto técnico dos commits, detectar dívidas técnicas e vincular código a requisitos.

### Funcionalidades
1. **Smart Commit Analysis**
   - Ao receber um webhook de push, a IA analisa o diff.
   - Gera um resumo em linguagem natural: "Este commit altera a lógica de pagamento, impactando 3 arquivos críticos."
   - Detecta se o commit resolve realmente a tarefa vinculada.

2. **Detecção de Dívida Técnica**
   - Identifica padrões de código ruim (hardcodes, funções gigantes, falta de testes) nos PRs.
   - Cria automaticamente uma "Tech Debt Task" no backlog se o limite for excedido.

3. **Rastreabilidade Requisito <-> Código**
   - Mapeia qual parte do código implementa qual cláusula do contrato/fase do projeto.
   - Permite responder: "Onde no código está implementada a regra de desconto do contrato?"

### Arquitetura de Integração
- **Webhooks:** GitHub App instalada no repositório do cliente.
- **Edge Function:** Recebe o evento `push` ou `pull_request`.
- **LLM Context:** Envia o `diff` + `Descrição da Tarefa` para a IA avaliar conformidade.

---

## 💡 Módulo 5: "Outras" Funcionalidades de Alto Valor

### 1. Assistente de Reunião (Meeting Copilot)
- Gravação e transcrição automática (Whisper API).
- Gera ata, extrai decisões e cria as tarefas correspondentes automaticamente.
- Envia resumo por e-mail para todos os participantes.

### 2. Chat com o Projeto (RAG - Retrieval Augmented Generation)
- Um chatbot onde o usuário pergunta: "Qual o status financeiro do projeto?" ou "O que foi acordado sobre a API de pagamentos?".
- A IA busca nos contratos, comentários, tasks e commits para responder com fontes citadas.

### 3. Gerador de Propostas Comerciais
- Input: "Cliente precisa de um app de delivery com integração PIX".
- Output: Proposta completa com escopo estimado, timeline, investimento e termos contratuais prontos para envio.

---

## 🏗️ Roadmap de Implementação

### Fase 1: Fundação (Semanas 1-2)
- [ ] Configurar Supabase Edge Functions para integração com OpenAI/Anthropic.
- [ ] Criar schema de banco para `documents`, `contract_versions`, `ai_logs`.
- [ ] Implementar gerador básico de PDF (Contrato Padrão).

### Fase 2: Integração Git & Tarefas (Semanas 3-4)
- [ ] Criar GitHub App e webhooks.
- [ ] Implementar endpoint de análise de Diff com IA.
- [ ] Criar UI de "Gerador de Tarefas" (Input de texto -> Lista de Tasks).

### Fase 3: Inteligência Avançada (Semanas 5-6)
- [ ] Implementar análise de desvio de escopo.
- [ ] Criar o Chatbot RAG (Chat com dados do projeto).
- [ ] Refinar templates de PDF com designer.

---

## ⚠️ Considerações de Segurança e Custo
- **Privacidade:** Dados de código e contratos são sensíveis. Usar modelos com garantia de não-treinamento (Enterprise API) ou rodar modelos locais (Llama 3) se necessário.
- **Custos:** Implementar limites de uso de tokens por projeto/cliente.
- **Validação Humana:** Nunca criar tarefas ou aceitar commits automaticamente sem aprovação humana (Human-in-the-loop).
