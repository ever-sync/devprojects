# Plano de Implementação: Recursos IA, Contratos e GitHub

## 📋 Visão Geral

Este documento descreve a implementação completa dos novos recursos de IA, geração de contratos/PDFs e integração avançada com GitHub.

---

## ✅ O que foi implementado

### 1. **Schema do Banco de Dados** (Migrations 037 & 038)

#### Tabelas Criadas:

| Tabela | Descrição |
|--------|-----------|
| `contract_templates` | Templates de contratos com variáveis dinâmicas |
| `contracts` | Contratos gerados com status e assinaturas |
| `contract_signatures` | Assinaturas digitais de contratos |
| `generated_documents` | Documentos PDF gerados (escopos, propostas) |
| `process_analyses` | Análises de processos com IA |
| `ai_generated_tasks` | Tarefas sugeridas por IA aguardando aprovação |
| `github_ai_analyses` | Análises de repositórios GitHub com IA |
| `workspace_ai_settings` | Configurações de IA por workspace |
| `ai_usage_logs` | Log de uso e custos de IA |

#### Políticas RLS:
- Todas as tabelas possuem políticas de segurança configuradas
- Acesso baseado em workspace e roles (owner, admin, manager, member)

---

### 2. **Server Actions** 

#### `src/actions/contracts.ts`
```typescript
- createContractTemplate()      // Criar template de contrato
- updateContractTemplate()      // Atualizar template
- listContractTemplates()       // Listar templates
- generateContract()            // Gerar contrato do template
- listProjectContracts()        // Listar contratos do projeto
- updateContractStatus()        // Atualizar status
- addContractSigner()           // Adicionar signatário
- signContract()                // Assinar contrato
```

#### `src/actions/ai-features.ts`
```typescript
- generatePdfDocument()         // Gerar PDF (escopo, proposta)
- analyzeProjectProcess()       // Analisar processo com IA
- generateTasksWithAI()         // Gerar tarefas com IA
- acceptAITasks()               // Aceitar tarefas geradas
- analyzeGitHubWithAI()         // Analisar GitHub com IA
- getGitHubAnalysisResults()    // Obter resultados
- configureWorkspaceAI()        // Configurar IA do workspace
- getWorkspaceAISettings()      // Obter configurações
```

---

### 3. **Webhook do GitHub**

#### `src/app/api/webhooks/github/route.ts`

Eventos suportados:
- ✅ **push** - Registra commits automaticamente
- ✅ **pull_request** - Vincula PRs a tarefas
- ✅ **deployment_status** - Atualiza status de deploy

Funcionalidades:
- Verificação de assinatura HMAC
- Auto-vinculação de commits a tarefas (#123)
- Sincronização de status de PR (open, merged, closed)
- Registro automático de deployments

---

## 🚀 Próximos Passos (Implementação Frontend)

### Fase 1: Configuração de IA (1 semana)

#### 1.1 Página de Configurações `/settings/ai`
- [ ] Formulário de configuração da API (OpenAI, Anthropic, etc)
- [ ] Seleção de modelo preferido
- [ ] Configuração de limites de uso
- [ ] Toggle para habilitar/desabilitar features
- [ ] Visualização de uso mensal (tokens/custos)

#### 1.2 Componente `WorkspaceAISettingsForm`
```tsx
// Campos necessários:
- aiProvider (select)
- apiKey (encrypted input)
- modelPreference (select)
- maxTokens (number)
- temperature (slider)
- enableAutoTaskGeneration (switch)
- enableCodeAnalysis (switch)
- enableProcessAnalysis (switch)
- enableContractGeneration (switch)
- customInstructions (textarea)
- usageLimitMonthly (number)
```

---

### Fase 2: Gestão de Contratos (1-2 semanas)

#### 2.1 Página `/settings/contracts/templates`
- [ ] Lista de templates existentes
- [ ] Botão "Novo Template"
- [ ] Editor WYSIWYG para conteúdo HTML
- [ ] Definição de variáveis dinâmicas
- [ ] Preview do template

#### 2.2 Página `/projects/[id]/contracts`
- [ ] Lista de contratos do projeto
- [ ] Status badges (draft, pending, signed)
- [ ] Botão "Gerar Contrato"
- [ ] Modal de seleção de template + preenchimento de variáveis
- [ ] Timeline de assinaturas
- [ ] Download do PDF

#### 2.3 Página Pública `/p/contracts/[id]/sign`
- [ ] Página de assinatura sem login
- [ ] Validação de email do signatário
- [ ] Canvas para assinatura digital
- [ ] Upload de documento assinado
- [ ] Confirmação de assinatura

---

### Fase 3: Geração de PDFs (1 semana)

#### 3.1 Integração com Biblioteca PDF
Opções recomendadas:
```bash
# Opção 1: Puppeteer (HTML -> PDF)
npm install puppeteer-core

# Opção 2: React PDF
npm install @react-pdf/renderer

# Opção 3: Serviço externo (Documint, PDFShift)
```

#### 3.2 Componente `PDFGenerator`
- [ ] Função para converter HTML -> PDF
- [ ] Upload para Supabase Storage
- [ ] Geração de URL pública
- [ ] Atualização do registro em `generated_documents`

#### 3.3 Página `/projects/[id]/scope/export`
- [ ] Preview do escopo em HTML
- [ ] Botão "Exportar PDF"
- [ ] Seleção de template visual
- [ ] Download automático

---

### Fase 4: Análise de Processos com IA (1 semana)

#### 4.1 Componente `ProcessAnalysisDashboard`
- [ ] Card com score de risco (0-100)
- [ ] Card com score de eficiência
- [ ] Gráfico de gargalos detectados
- [ ] Lista de recomendações
- [ ] Previsão de atraso (dias)

#### 4.2 Botão "Analisar Processo" 
- [ ] Modal de confirmação
- [ ] Seleção de tipo de análise
- [ ] Input de instruções customizadas
- [ ] Loading state com progresso
- [ ] Exibição de resultados

#### 4.3 Integração com IA Backend
```typescript
// Exemplo de chamada OpenAI
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content: "Você é um especialista em gestão de projetos..."
    },
    {
      role: "user",
      content: prompt
    }
  ],
  response_format: { type: "json_object" }
})
```

---

### Fase 5: Geração de Tarefas com IA (1 semana)

#### 5.1 Componente `AITaskGenerator`
- [ ] Textarea para input (transcrição, descrição, etc)
- [ ] Select de tipo de fonte (meeting, document, github, prompt)
- [ ] Campo de instruções customizadas
- [ ] Botão "Gerar Tarefas"

#### 5.2 Componente `TaskSuggestionsList`
- [ ] Cards com tarefas sugeridas
- [ ] Score de confiança (%)
- [ ] Checkbox para selecionar quais aceitar
- [ ] Preview de detalhes (título, descrição, prioridade, horas)
- [ ] Botão "Aceitar Selecionadas"

#### 5.3 Integração com Tarefas Existentes
- [ ] Conversão de tarefas aceitas em tasks reais
- [ ] Atribuição automática de fase
- [ ] Notificação para responsáveis

---

### Fase 6: Análise de GitHub com IA (1-2 semanas)

#### 6.1 Componente `GitHubAnalysisPanel`
- [ ] Seleção de repositório
- [ ] Tipo de análise (code quality, security, tech debt, etc)
- [ ] Botão "Analisar Agora"
- [ ] Loading com estimated time

#### 6.2 Dashboard de Resultados
- [ ] Score de qualidade de código
- [ ] Lista de issues de segurança
- [ ] Itens de tech debt priorizados
- [ ] Sugestões de refactoring
- [ ] Padrões de commit
- [ ] Health de branches
- [ ] Insights de PRs

#### 6.3 Integração com API do GitHub
```typescript
// Endpoints úteis:
GET /repos/{owner}/{repo}/stats/code_frequency
GET /repos/{owner}/{repo}/stats/contributors
GET /repos/{owner}/{repo}/pulls
GET /repos/{owner}/{repo}/commits
```

---

## 🔧 Integração com APIs de IA

### OpenAI (Recomendado)

```bash
npm install openai
```

```typescript
// src/lib/ai/openai.ts
import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function generateWithAI(prompt: string, options?: any) {
  const response = await openai.chat.completions.create({
    model: options?.model || 'gpt-4o',
    messages: [
      { role: 'system', content: options?.systemPrompt || 'Você é um assistente útil.' },
      { role: 'user', content: prompt }
    ],
    temperature: options?.temperature || 0.7,
    max_tokens: options?.maxTokens || 4096,
    response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
  })

  return response.choices[0].message.content
}
```

### Anthropic (Claude)

```bash
npm install @anthropic-ai/sdk
```

---

## 📊 Monitoramento e Logs

### Dashboard de Uso de IA
- [ ] Gráfico de tokens usados por dia
- [ ] Custos acumulados no mês
- [ ] Top features mais usadas
- [ ] Alertas de limite próximo

### Logs de Erros
- [ ] Tracking de falhas na geração
- [ ] Retry automático para timeouts
- [ ] Notificação para admins em caso de erro crítico

---

## 🔐 Segurança

### Checklist
- [ ] Criptografar API keys no banco (usar `pgcrypto`)
- [ ] Rate limiting nas rotas de IA
- [ ] Validação de input para prevenir prompt injection
- [ ] Audit log de todas as ações de IA
- [ ] Máscaras de dados sensíveis nos logs

---

## 📦 Dependências Recomendadas

```json
{
  "dependencies": {
    "openai": "^4.0.0",
    "@anthropic-ai/sdk": "^0.27.0",
    "puppeteer-core": "^22.0.0",
    "@react-pdf/renderer": "^3.4.0",
    "tiptap": "^2.0.0",
    "@tiptap/starter-kit": "^2.0.0",
    "react-signature-canvas": "^1.0.6"
  }
}
```

---

## 🎯 Roadmap Resumido

| Semana | Entregável |
|--------|------------|
| 1 | Configurações de IA + Settings Page |
| 2 | Templates de Contrato + Editor |
| 3 | Geração de Contratos + Assinaturas |
| 4 | Export PDF + Storage Integration |
| 5 | Análise de Processos com IA |
| 6 | Geração de Tarefas com IA |
| 7 | Análise de GitHub com IA |
| 8 | Dashboard de Monitoramento + Polishing |

---

## 📝 Notas Importantes

1. **Ambiente**: Configure as variáveis de ambiente no `.env.local`:
   ```env
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=...
   GITHUB_WEBHOOK_SECRET=...
   ```

2. **Storage**: Crie buckets no Supabase:
   - `contracts` (privado)
   - `documents` (privado com URLs assinadas)

3. **Background Jobs**: Para análises longas, considere usar:
   - Supabase Edge Functions
   - Inngest ou Trigger.dev
   - Filas com Redis/Bull

4. **Testes**: Implemente testes E2E para:
   - Fluxo completo de geração de contrato
   - Webhook do GitHub
   - Geração de tarefas com IA

---

## ✨ Funcionalidades Futuras (Backlog)

- [ ] Integração com DocuSign/Adobe Sign
- [ ] Templates multi-idioma
- [ ] Versionamento de contratos
- [ ] Aprovação workflow (multi-step)
- [ ] Chat com IA sobre o projeto
- [ ] Resumo automático de reuniões
- [ ] Detecção de scope creep
- [ ] Benchmarking com outros projetos

---

**Status**: ✅ Schema pronto, ✅ Actions prontas, ✅ Webhook pronto  
**Próximo**: Implementar frontend das features
