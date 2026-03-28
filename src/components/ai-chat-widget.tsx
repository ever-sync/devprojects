'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  FileText,
  Lightbulb,
  ExternalLink,
  History,
} from 'lucide-react';
import { askProjectQuestion, listProjectConversations, loadConversation } from '@/actions/ai-chat';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ id: string; title: string; source_type: string }>;
  createdAt?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface AIChatWidgetProps {
  projectId: string;
}

export function AIChatWidget({ projectId }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && conversations.length === 0) {
      loadConversations();
    }
  }, [isOpen]);

  async function loadConversations() {
    const result = await listProjectConversations(projectId);
    if (result.success && result.conversations) {
      setConversations(result.conversations);
    }
  }

  async function selectConversation(conversationId: string) {
    const result = await loadConversation(conversationId);
    if (result.success && result.messages) {
      setMessages(result.messages);
      setCurrentConversationId(conversationId);
      setShowHistory(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('query', userMessage.content);
    formData.append('projectId', projectId);
    if (currentConversationId) {
      // Em uma implementação completa, enviaríamos o conversationId
    }

    const result = await askProjectQuestion(formData);

    setIsLoading(false);

    if (result.success && result.answer) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      if (result.conversationId) {
        setCurrentConversationId(result.conversationId);
        loadConversations();
      }
    } else {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.error || 'Desculpe, ocorreu um erro. Tente novamente.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  }

  const suggestedQuestions = [
    "Quais são as tarefas pendentes deste projeto?",
    "Quando foi a última reunião e quais foram as decisões?",
    "Existe algum risco identificado no projeto?",
    "Qual é o status do orçamento atual?",
    "Quais documentos estão disponíveis?",
  ];

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Widget */}
      {isOpen && (
        <Card
          className={`fixed z-50 shadow-2xl flex flex-col transition-all duration-300 ${
            isMinimized
              ? 'bottom-6 right-6 w-80 h-16'
              : 'bottom-6 right-6 w-[450px] h-[650px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/ai-avatar.png" />
                <AvatarFallback className="bg-white/20">AI</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-sm">Assistente do Projeto</h3>
                <p className="text-xs text-primary-foreground/80">
                  {messages.length > 0 ? `${messages.length} mensagens` : 'Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Histórico de conversas */}
              {showHistory && (
                <div className="absolute inset-0 bg-background z-10 rounded-lg">
                  <div className="p-4 border-b">
                    <h4 className="font-semibold">Conversas Anteriores</h4>
                  </div>
                  <ScrollArea className="h-[calc(100%-60px)]">
                    {conversations.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Nenhuma conversa anterior
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => selectConversation(conv.id)}
                          className="w-full p-3 text-left hover:bg-muted border-b transition-colors"
                        >
                          <p className="font-medium text-sm truncate">{conv.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </button>
                      ))
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Área de mensagens */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                        <MessageSquare className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="font-semibold mb-2">Olá! Como posso ajudar?</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Faça perguntas sobre o projeto e eu buscarei respostas nos documentos, reuniões e tarefas.
                      </p>
                      <div className="space-y-2">
                        {suggestedQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => setInput(question)}
                            className="w-full p-2 text-left text-xs bg-muted hover:bg-muted/80 rounded-lg transition-colors flex items-start gap-2"
                          >
                            <Lightbulb className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                            <span>{question}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        {message.role === 'assistant' ? (
                          <>
                            <AvatarImage src="/ai-avatar.png" />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              AI
                            </AvatarFallback>
                          </>
                        ) : (
                          <>
                            <AvatarFallback className="bg-muted text-xs">Você</AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs font-medium mb-1 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Fontes:
                            </p>
                            <div className="space-y-1">
                              {message.sources.map((source, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs bg-background/50 rounded px-2 py-1 flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span className="truncate">{source.title}</span>
                                  <Badge variant="secondary" className="text-[10px] h-4">
                                    {source.source_type}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          AI
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Faça uma pergunta sobre o projeto..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  A IA pode cometer erros. Verifique informações importantes.
                </p>
              </form>
            </>
          )}
        </Card>
      )}
    </>
  );
}
