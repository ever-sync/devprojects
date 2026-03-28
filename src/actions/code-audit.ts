'use server';

import { createClient } from '@/lib/supabase/server';
import { OpenAI } from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema de validação
const auditRequestSchema = z.object({
  projectId: z.string().uuid(),
  pullRequestId: z.string().optional(),
  commitSha: z.string().optional(),
  repositoryUrl: z.string().url().optional(),
  codeSnippet: z.string().max(50000).optional(),
  language: z.string().default('typescript'),
});

const auditCriteriaSchema = z.object({
  codeQuality: z.boolean().default(true),
  security: z.boolean().default(true),
  performance: z.boolean().default(true),
  architecture: z.boolean().default(true),
  documentation: z.boolean().default(true),
  testing: z.boolean().default(true),
});

/**
 * Analisa código com IA e retorna score detalhado
 */
export async function analyzeCodeWithAI(formData: FormData) {
  try {
    const validated = auditRequestSchema.parse({
      projectId: formData.get('projectId'),
      pullRequestId: formData.get('pullRequestId'),
      commitSha: formData.get('commitSha'),
      repositoryUrl: formData.get('repositoryUrl'),
      codeSnippet: formData.get('codeSnippet'),
      language: formData.get('language') || 'typescript',
    });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Usuário não autenticado' };
    }

    let codeToAnalyze = validated.codeSnippet;

    // Se tiver PR ou commit, buscar código do GitHub
    if (validated.pullRequestId || validated.commitSha) {
      // Em produção, chamaria API do GitHub para obter diff
      codeToAnalyze = codeToAnalyze || '// Código obtido do PR/commit seria inserido aqui';
    }

    if (!codeToAnalyze) {
      return { error: 'Nenhum código fornecido para análise' };
    }

    // Prompt especializado para auditoria de código
    const systemPrompt = `Você é um engenheiro de software sênior especialista em revisão de código.
Sua tarefa é analisar o código fornecido e gerar um relatório detalhado com scores de 0-100.

Avalie os seguintes critérios:
1. **Qualidade do Código**: legibilidade, convenções, DRY, KISS, SOLID
2. **Segurança**: vulnerabilidades comuns (OWASP), validações, sanitização
3. **Performance**: complexidade algorítmica, otimizações possíveis, memory leaks
4. **Arquitetura**: separação de concerns, acoplamento, coesão, padrões de design
5. **Documentação**: comentários, JSDoc/TSDoc, clareza
6. **Testabilidade**: facilidade de escrever testes, mocks necessários

Forneça a resposta EXATAMENTE neste formato JSON:
{
  "overallScore": number (0-100),
  "criteria": {
    "codeQuality": { "score": number, "strengths": string[], "issues": string[], "suggestions": string[] },
    "security": { "score": number, "strengths": string[], "issues": string[], "suggestions": string[] },
    "performance": { "score": number, "strengths": string[], "issues": string[], "suggestions": string[] },
    "architecture": { "score": number, "strengths": string[], "issues": string[], "suggestions": string[] },
    "documentation": { "score": number, "strengths": string[], "issues": string[], "suggestions": string[] },
    "testing": { "score": number, "strengths": string[], "issues": string[], "suggestions": string[] }
  },
  "criticalIssues": [{ "line": number, "severity": "high"|"medium"|"low", "description": string, "fix": string }],
  "refactoringSuggestions": string[],
  "positiveHighlights": string[],
  "estimatedTechnicalDebt": "low"|"medium"|"high",
  "summary": string
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Analise este código em ${validated.language}:\n\n\`\`\`${validated.language}\n${codeToAnalyze}\n\`\`\`` 
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const analysisResult = completion.choices[0]?.message?.content;
    
    if (!analysisResult) {
      return { error: 'Falha ao analisar código' };
    }

    const analysis = JSON.parse(analysisResult);

    // Salvar análise no banco
    const { data: auditRecord, error: saveError } = await supabase
      .from('code_audits')
      .insert({
        project_id: validated.projectId,
        user_id: user.id,
        pull_request_id: validated.pullRequestId,
        commit_sha: validated.commitSha,
        repository_url: validated.repositoryUrl,
        language: validated.language,
        overall_score: analysis.overallScore,
        criteria_scores: analysis.criteria,
        critical_issues: analysis.criticalIssues,
        refactoring_suggestions: analysis.refactoringSuggestions,
        positive_highlights: analysis.positiveHighlights,
        technical_debt_level: analysis.estimatedTechnicalDebt,
        summary: analysis.summary,
        raw_analysis: analysis,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Erro ao salvar auditoria:', saveError);
    }

    return {
      success: true,
      analysis,
      auditId: auditRecord?.id,
    };
  } catch (error) {
    console.error('Erro na auditoria de código:', error);
    if (error instanceof z.ZodError) {
      return { error: 'Dados inválidos', details: error.errors };
    }
    if (error instanceof SyntaxError) {
      return { error: 'Falha ao processar resposta da IA' };
    }
    return { error: 'Falha ao analisar código. Tente novamente.' };
  }
}

/**
 * Gera sugestões de refatoração automática
 */
export async function generateRefactoringSuggestions(code: string, language: string, issues: any[]) {
  try {
    const prompt = `Dado o código abaixo e os problemas identificados, gere versões refatoradas do código.

Código original (${language}):
\`\`\`${language}
${code}
\`\`\`

Problemas identificados:
${issues.map((i: any, idx: number) => `${idx + 1}. ${i.description}`).join('\n')}

Forneça:
1. Código refatorado completo
2. Explicação das mudanças
3. Benefícios esperados

Formato JSON:
{
  "refactoredCode": string,
  "explanation": string,
  "benefits": string[],
  "breakingChanges": string[]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um especialista em refatoração de código.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    });

    const result = completion.choices[0]?.message?.content;
    
    if (!result) {
      return { error: 'Falha ao gerar refatoração' };
    }

    return {
      success: true,
      suggestion: JSON.parse(result),
    };
  } catch (error) {
    console.error('Erro ao gerar refatoração:', error);
    return { error: 'Falha ao gerar sugestões de refatoração' };
  }
}

/**
 * Compara auditorias ao longo do tempo
 */
export async function compareAudits(projectId: string, auditIds: string[]) {
  try {
    const supabase = await createClient();
    
    const { data: audits, error } = await supabase
      .from('code_audits')
      .select('*')
      .in('id', auditIds)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    if (!audits || audits.length === 0) {
      return { error: 'Nenhuma auditoria encontrada' };
    }

    // Gerar comparação com IA
    const comparisonPrompt = `Compare estas ${audits.length} auditorias de código do mesmo projeto ao longo do tempo.

${audits.map((a: any, i: number) => `
Auditoria ${i + 1} (${new Date(a.created_at).toLocaleDateString()}):
- Score Geral: ${a.overall_score}
- Dívida Técnica: ${a.technical_debt_level}
- Resumo: ${a.summary}
`).join('\n')}

Gere uma análise comparativa mostrando:
1. Evolução dos scores
2. Problemas recorrentes
3. Melhorias observadas
4. Tendências
5. Recomendações para o futuro

Formato JSON:
{
  "scoreEvolution": [{ "date": string, "score": number }],
  "recurringIssues": string[],
  "improvements": string[],
  "trends": string[],
  "recommendations": string[],
  "summary": string
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um analista de qualidade de código.' },
        { role: 'user', content: comparisonPrompt },
      ],
      temperature: 0.5,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const result = completion.choices[0]?.message?.content;

    return {
      success: true,
      audits,
      comparison: result ? JSON.parse(result) : null,
    };
  } catch (error) {
    console.error('Erro ao comparar auditorias:', error);
    return { error: 'Falha ao comparar auditorias' };
  }
}

/**
 * Lista auditorias do projeto
 */
export async function listProjectAudits(projectId: string, limit: number = 20) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('code_audits')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return { success: true, audits: data || [] };
  } catch (error) {
    console.error('Erro ao listar auditorias:', error);
    return { error: 'Falha ao listar auditorias' };
  }
}

/**
 * Integração com webhook do GitHub para auto-auditoria
 */
export async function handleGitHubPRAudit(payload: any) {
  try {
    const { action, pull_request } = payload;
    
    // Apenas auditar quando PR é aberto ou atualizado
    if (!['opened', 'synchronize'].includes(action)) {
      return { skipped: true, reason: 'Ação não relevante' };
    }

    // Buscar repositório vinculado no banco
    const supabase = await createClient();
    const { data: repo } = await supabase
      .from('github_repositories')
      .select('*, projects(*)')
      .eq('repository_id', payload.repository.id)
      .single();

    if (!repo || !repo.projects) {
      return { skipped: true, reason: 'Repositório não vinculado a projeto' };
    }

    // Obter código do PR (em produção, chamar API do GitHub)
    const codeSnippet = '// Diff do PR seria obtido aqui via API do GitHub';

    // Executar auditoria
    const result = await analyzeCodeWithAI({
      get: (key: string) => {
        const map: Record<string, any> = {
          projectId: repo.projects.id,
          pullRequestId: String(pull_request.id),
          commitSha: pull_request.head.sha,
          repositoryUrl: pull_request.html_url,
          codeSnippet,
          language: 'typescript',
        };
        return map[key];
      },
    });

    // Comentar no PR com resultado (em produção, usar API do GitHub)
    if (result.success) {
      const comment = `## 🤖 Auditoria Automática de Código

**Score Geral:** ${result.analysis.overallScore}/100

### Destaques Positivos:
${result.analysis.positiveHighlights.map((h: string) => `✅ ${h}`).join('\n')}

### Issues Críticos:
${result.analysis.criticalIssues.slice(0, 3).map((i: any) => `⚠️ ${i.description}`).join('\n')}

### Sugestões de Melhoria:
${result.analysis.refactoringSuggestions.slice(0, 3).map((s: string) => `- ${s}`).join('\n')}

---
*Análise gerada automaticamente por IA*`;

      // Aqui chamaria API do GitHub para criar comment
      console.log('Comment no PR:', comment);
    }

    return result;
  } catch (error) {
    console.error('Erro na auditoria automática do GitHub:', error);
    return { error: 'Falha na auditoria automática' };
  }
}
