'use server';

import { createClient } from '@/lib/supabase/server';
import { OpenAI } from 'openai';
import { z } from 'zod';
import { logError } from '@/lib/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema de validação
const chatMessageSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

const ragQuerySchema = z.object({
  query: z.string().min(1).max(500),
  projectId: z.string().uuid(),
  topK: z.number().min(1).max(10).default(5),
});

/**
 * Busca documentos relevantes no projeto usando similaridade vetorial
 */
export async function searchRelevantDocuments(query: string, projectId: string, topK: number = 5) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    const mockEmbedding = embeddingResponse.data[0].embedding;
    
    const { data, error } = await db.rpc('match_documents', {
      query_embedding: mockEmbedding,
      match_count: topK,
      filter: { project_id: projectId },
    });

    if (error) {
      logError('Erro na busca vetorial', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logError('Erro ao buscar documentos', error);
    return [];
  }
}

/**
 * Processa pergunta do usuário com contexto RAG
 */
export async function askProjectQuestion(formData: FormData) {
  try {
    const validated = ragQuerySchema.parse({
      query: formData.get('query'),
      projectId: formData.get('projectId'),
      topK: parseInt(formData.get('topK') as string) || 5,
    });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Usuário não autenticado' };
    }

    // 1. Buscar documentos relevantes
    const relevantDocs = await searchRelevantDocuments(
      validated.query,
      validated.projectId,
      validated.topK
    );

    // 2. Construir contexto
    const context = relevantDocs
      .map((doc: any, index: number) => 
        `[Documento ${index + 1}]: ${doc.content || doc.summary}\nFonte: ${doc.source_type} - ${doc.title}`
      )
      .join('\n\n');

    // 3. Montar prompt para IA
    const systemPrompt = `Você é um assistente especializado em gerenciamento de projetos.
Responda perguntas baseando-se APENAS nos documentos fornecidos abaixo.
Se a informação não estiver nos documentos, diga claramente que não tem essa informação.
Sempre cite a fonte quando possível.

Contexto do Projeto:
${context}

Instruções:
- Seja conciso e direto
- Use formatação Markdown quando apropriado
- Se houver informações conflitantes, mencione isso
- Inclua links ou referências aos documentos originais quando relevante`;

    // 4. Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: validated.query },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const answer = completion.choices[0]?.message?.content || 'Não foi possível gerar uma resposta.';

    // 5. Salvar no histórico de conversação
    const db = supabase as any;

    const { data: conversation, error: convError } = await db
      .from('ai_chat_conversations')
      .insert({
        project_id: validated.projectId,
        user_id: user.id,
        title: validated.query.substring(0, 100),
      })
      .select()
      .single();

    if (convError) {
      logError('Erro ao criar conversa', convError);
    }

    // 6. Salvar mensagem
    if (conversation) {
      await db.from('ai_chat_messages').insert({
        conversation_id: conversation.id,
        role: 'user',
        content: validated.query,
      });

      await db.from('ai_chat_messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: answer,
        sources: relevantDocs.map((d: any) => ({ id: d.id, title: d.title, source_type: d.source_type })),
      });
    }

    return {
      success: true,
      answer,
      sources: relevantDocs,
      conversationId: conversation?.id,
    };
  } catch (error) {
    logError('Erro ao processar pergunta', error);
    if (error instanceof z.ZodError) {
      return { error: 'Dados inválidos', details: error.issues };
    }
    return { error: 'Falha ao processar pergunta. Tente novamente.' };
  }
}

/**
 * Carrega histórico de conversação
 */
export async function loadConversation(conversationId: string) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    
    const { data, error } = await db
      .from('ai_chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return { success: true, messages: data || [] };
  } catch (error) {
    logError('Erro ao carregar conversa', error);
    return { error: 'Falha ao carregar histórico' };
  }
}

/**
 * Lista conversas do projeto
 */
export async function listProjectConversations(projectId: string) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    
    const { data, error } = await db
      .from('ai_chat_conversations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return { success: true, conversations: data || [] };
  } catch (error) {
    logError('Erro ao listar conversas', error);
    return { error: 'Falha ao listar conversas' };
  }
}

/**
 * Indexa documento para busca vetorial (chamado automaticamente ao criar docs)
 */
export async function indexDocumentForSearch(documentData: {
  projectId: string;
  content: string;
  title: string;
  sourceType: 'document' | 'meeting' | 'comment' | 'task' | 'proposal';
  sourceId: string;
}) {
  try {
    const supabase = await createClient();
    const db = supabase as any;
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: documentData.content,
    });
    const mockEmbedding = embeddingResponse.data[0].embedding;
    
    const { data, error } = await db
      .from('vector_documents')
      .insert({
        project_id: documentData.projectId,
        content: documentData.content,
        title: documentData.title,
        source_type: documentData.sourceType,
        source_id: documentData.sourceId,
        embedding: mockEmbedding,
      })
      .select()
      .single();

    if (error) {
      logError('Erro ao indexar documento', error);
      return { error: 'Falha ao indexar documento' };
    }

    return { success: true, document: data };
  } catch (error) {
    logError('Erro ao indexar', error);
    return { error: 'Falha ao indexar documento' };
  }
}

/**
 * Resume longo thread de discussão
 */
export async function summarizeDiscussion(messages: string[]) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente que resume discussões de projeto de forma clara e estruturada.',
        },
        {
          role: 'user',
          content: `Resuma esta discussão em tópicos principais, decisões tomadas e ações pendentes:\n\n${messages.join('\n')}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    return {
      success: true,
      summary: completion.choices[0]?.message?.content || '',
    };
  } catch (error) {
    logError('Erro ao resumir', error);
    return { error: 'Falha ao resumir discussão' };
  }
}
