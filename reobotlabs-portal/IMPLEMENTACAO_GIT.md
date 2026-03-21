# Fase 1: Integração Git - Implementação Completa

## Visão Geral
Implementação de integração com provedores Git (GitHub, GitLab, Bitbucket) para rastreamento de commits, branches, PRs e deployments diretamente no ReobotLabs Portal.

## Arquivos Criados/Modificados

### 1. Banco de Dados (Supabase Migrations)

#### `supabase/migrations/035_git_integrations.sql`
Cria as tabelas principais:
- `git_integrations`: Armazena credenciais OAuth dos provedores
- `project_repositories`: Repositórios vinculados a projetos
- `task_branches`: Branches e PRs vinculados a tarefas
- `task_commits`: Commits relacionados a tarefas/projetos
- `project_deployments`: Histórico de deploys
- `git_activities`: Feed de atividades Git

#### `supabase/migrations/036_git_rls_policies.sql`
Políticas Row Level Security para controle de acesso.

### 2. Server Actions (`src/actions/git-integrations.ts`)
Funções server-side para:
- `createGitIntegration()`: Criar integração OAuth
- `updateGitIntegration()`: Atualizar integração
- `deleteGitIntegration()`: Remover integração
- `listGitIntegrations()`: Listar integrações do workspace
- `addRepositoryToProject()`: Vincular repositório a projeto
- `listProjectRepositories()`: Listar repositórios do projeto
- `removeRepositoryFromProject()`: Remover repositório
- `registerCommit()`: Registrar commit (webhook/API)
- `listCommits()`: Listar commits
- `registerDeployment()`: Registrar deployment
- `listDeployments()`: Listar deployments
- `linkBranchToTask()`: Vincular branch a tarefa
- `updateBranchInfo()`: Atualizar info de PR/Branch
- `listTaskBranches()`: Listar branches de tarefa

### 3. Componentes React (`src/components/git/`)

#### `project-repositories.tsx`
Gerencia repositórios vinculados ao projeto com UI para adicionar/remover.

#### `recent-commits.tsx`
Exibe lista de commits recentes com autor, mensagem, stats de mudanças.

#### `deployments-list.tsx`
Mostra histórico de deployments com status, ambiente, duração.

#### `index.ts`
Exporta todos os componentes.

### 4. Validações Zod (`src/lib/validations.ts`)
Schemas adicionados:
- `gitIntegrationSchema`
- `repositorySchema`
- `commitSchema`
- `deploymentSchema`
- `branchLinkSchema`

Types exportados:
- `GitIntegrationInput`
- `RepositoryInput`
- `CommitInput`
- `DeploymentInput`
- `BranchLinkInput`

## Próximos Passos

### Para usar as funcionalidades:

1. **Aplicar migrations no Supabase:**
```bash
# Via Supabase CLI
supabase db push

# Ou copiar SQL para o dashboard do Supabase
```

2. **Integrar na página do projeto:**
Adicionar os componentes em `/src/app/(dashboard)/projects/[id]/page.tsx`:
```tsx
import { ProjectRepositories, RecentCommits, DeploymentsList } from '@/components/git'

// Na página do projeto
<ProjectRepositories projectId={project.id} />
<RecentCommits projectId={project.id} limit={5} />
<DeploymentsList projectId={project.id} limit={5} />
```

3. **Configurar OAuth no GitHub/GitLab:**
- Criar OAuth App no provedor
- Configurar callback URL: `https://seu-app.com/api/auth/callback`
- Armazenar client_id e client_secret nas variáveis de ambiente

4. **Implementar webhook receiver:**
Criar endpoint `/api/webhooks/github` para receber eventos:
- push
- pull_request
- deployment
- deployment_status

## Funcionalidades Habilitadas

✅ Tabelas de banco de dados para Git tracking
✅ Políticas RLS configuradas
✅ Server Actions completas
✅ Componentes UI reutilizáveis
✅ Validações com Zod
✅ Types TypeScript

## Pendente (Fases Seguintes)

- [ ] OAuth flow completo com refresh token
- [ ] Webhook receiver para sync automático
- [ ] Vinculação automática de branches por nome de tarefa
- [ ] Editor de código com syntax highlighting
- [ ] Visualização de diffs inline
- [ ] CI/CD status badges
- [ ] Preview environments links
