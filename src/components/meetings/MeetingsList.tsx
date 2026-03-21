'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarDays, Clock, Video, MapPin, Users, FileText,
  Sparkles, ChevronRight, X, Save, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { updateMeetingMinutes, analyzeMeetingMinutes } from '@/actions/meetings'
import type { Meeting } from '@/types'

type Invitee = { id: string | null; name: string; email: string; type: 'team' | 'client' }

interface MeetingsListProps {
  meetings: Meeting[]
  isAdmin: boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatDate(date: string) {
  return format(parseISO(date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

function parseInvitees(raw: unknown): Invitee[] {
  if (!Array.isArray(raw)) return []
  return raw as Invitee[]
}

/* ------------------------------------------------------------------ */
/*  MeetingCard                                                         */
/* ------------------------------------------------------------------ */
function MeetingCard({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  const invitees = parseInvitees(meeting.invitees)
  const hasMinutes = !!meeting.minutes?.trim()

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all p-4 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {meeting.location_type === 'meet' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 text-[10px] font-semibold">
                <Video className="w-2.5 h-2.5" /> Meet
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 text-[10px] font-semibold">
                <MapPin className="w-2.5 h-2.5" /> Presencial
              </span>
            )}
            {hasMinutes && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 text-[10px] font-semibold">
                <FileText className="w-2.5 h-2.5" /> Ata registrada
              </span>
            )}
            {meeting.minutes_summary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-semibold">
                <Sparkles className="w-2.5 h-2.5" /> Resumo IA
              </span>
            )}
          </div>

          <h4 className="text-sm font-semibold text-foreground truncate">{meeting.title}</h4>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {formatDate(meeting.scheduled_date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(meeting.scheduled_time)}
            </span>
            {invitees.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {invitees.length} {invitees.length === 1 ? 'participante' : 'participantes'}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
      </div>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  MeetingDetailSheet                                                  */
/* ------------------------------------------------------------------ */
function MeetingDetailSheet({
  meeting,
  isAdmin,
  onClose,
}: {
  meeting: Meeting | null
  isAdmin: boolean
  onClose: () => void
}) {
  const [minutes, setMinutes] = useState(meeting?.minutes ?? '')
  const [summary, setSummary] = useState(meeting?.minutes_summary ?? '')
  const [isPendingSave, startSave] = useTransition()
  const [isPendingAI, startAI] = useTransition()

  // Sync when meeting changes
  if (meeting && minutes !== (meeting.minutes ?? '') && !isPendingSave) {
    setMinutes(meeting.minutes ?? '')
  }
  if (meeting && summary !== (meeting.minutes_summary ?? '') && !isPendingAI) {
    setSummary(meeting.minutes_summary ?? '')
  }

  if (!meeting) return null

  const invitees = parseInvitees(meeting.invitees)
  const teamInvitees = invitees.filter((i) => i.type === 'team')
  const clientInvitees = invitees.filter((i) => i.type === 'client')

  function handleSave() {
    if (!meeting) return
    startSave(async () => {
      const result = await updateMeetingMinutes(meeting.id, minutes)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Ata salva com sucesso!')
      }
    })
  }

  function handleAnalyze() {
    if (!meeting || !minutes.trim()) {
      toast.error('Escreva a ata antes de analisar')
      return
    }
    startAI(async () => {
      const result = await analyzeMeetingMinutes(meeting.id, minutes, meeting.title)
      if (result.error) {
        toast.error(result.error)
      } else {
        setSummary(result.summary ?? '')
        toast.success('Resumo gerado com sucesso!')
      }
    })
  }

  return (
    <Sheet open={!!meeting} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="dashboard-surface w-full sm:max-w-xl overflow-y-auto flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold text-foreground leading-snug">
                {meeting.title}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Detalhes da reunião</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Data</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                {formatDate(meeting.scheduled_date)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Horário</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                {formatTime(meeting.scheduled_time)}
              </p>
            </div>
            <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Local</p>
              {meeting.location_type === 'meet' ? (
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <a
                    href={meeting.location_url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    {meeting.location_url ?? 'Google Meet'}
                  </a>
                </p>
              ) : (
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  {meeting.location_address ?? 'Local não informado'}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {meeting.description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Descrição / Pauta
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{meeting.description}</p>
            </div>
          )}

          {/* Participants */}
          {invitees.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Participantes ({invitees.length})
              </p>
              <div className="space-y-3">
                {teamInvitees.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase mb-1.5">Equipe</p>
                    <div className="space-y-1.5">
                      {teamInvitees.map((inv, i) => (
                        <div key={inv.id ?? i} className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-primary">
                              {inv.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{inv.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{inv.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {clientInvitees.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase mb-1.5">Cliente</p>
                    <div className="space-y-1.5">
                      {clientInvitees.map((inv, i) => (
                        <div key={inv.id ?? i} className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-blue-500">
                              {inv.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{inv.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{inv.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Minutes (Ata) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ata da Reunião
              </p>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSave}
                  disabled={isPendingSave}
                  className="h-7 text-xs px-3"
                >
                  {isPendingSave
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Save className="w-3 h-3 mr-1" />}
                  Salvar
                </Button>
              )}
            </div>
            {isAdmin ? (
              <textarea
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="Registre aqui os pontos discutidos, decisões tomadas e próximos passos..."
                rows={8}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition resize-none text-foreground"
              />
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 min-h-[120px] text-sm text-foreground whitespace-pre-wrap">
                {minutes || <span className="text-muted-foreground italic">Ata ainda não registrada.</span>}
              </div>
            )}
          </div>

          {/* AI Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Resumo por IA
              </p>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={isPendingAI || !minutes.trim()}
                  className="h-7 text-xs px-3 gap-1.5"
                >
                  {isPendingAI
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Sparkles className="w-3 h-3" />}
                  {isPendingAI ? 'Analisando...' : 'Analisar com IA'}
                </Button>
              )}
            </div>

            {summary ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-semibold text-primary">Gerado por IA</span>
                </div>
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{summary}</div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                <Sparkles className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {isAdmin
                    ? 'Salve a ata e clique em "Analisar com IA" para gerar um resumo automático.'
                    : 'Resumo ainda não gerado.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/*  MeetingsList (main export)                                          */
/* ------------------------------------------------------------------ */
export function MeetingsList({ meetings, isAdmin }: MeetingsListProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  // Sort: most recent first
  const sorted = [...meetings].sort((a, b) =>
    b.scheduled_date.localeCompare(a.scheduled_date)
  )

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          Reuniões ({meetings.length})
        </h3>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-10 h-10" />}
          title="Nenhuma reunião registrada"
          description="As reuniões agendadas para este projeto aparecerão aqui."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onClick={() => setSelectedMeeting(meeting)}
            />
          ))}
        </div>
      )}

      <MeetingDetailSheet
        meeting={selectedMeeting}
        isAdmin={isAdmin}
        onClose={() => setSelectedMeeting(null)}
      />
    </div>
  )
}
