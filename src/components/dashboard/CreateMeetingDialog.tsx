'use client'

import { useState, useTransition } from 'react'
import { CalendarPlus, X, User, Users, Video, MapPin, Copy, Check, Mail } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { createMeeting, type MeetingInvitee } from '@/actions/meetings'

type Client = { id: string; name: string }
type Project = { id: string; name: string; client_id: string }
type Person = {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  type: 'team' | 'client'
}

interface CreateMeetingDialogProps {
  clients: Client[]
  projects: Project[]
  teamMembers: { id: string; full_name: string; email: string; avatar_url: string | null }[]
  clientUsers: { id: string; full_name: string; email: string; avatar_url: string | null; client_id: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function generateMeetLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const seg = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `https://meet.google.com/${seg(3)}-${seg(4)}-${seg(3)}`
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

export function CreateMeetingDialog({
  clients,
  projects,
  teamMembers,
  clientUsers,
  open,
  onOpenChange,
}: CreateMeetingDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)
  const [selectedHour, setSelectedHour] = useState('10')
  const [selectedMinute, setSelectedMinute] = useState('00')
  const [locationType, setLocationType] = useState<'meet' | 'local'>('meet')
  const [meetLink, setMeetLink] = useState(() => generateMeetLink())
  const [localAddress, setLocalAddress] = useState('')
  const [selectedInvitees, setSelectedInvitees] = useState<Person[]>([])

  const filteredProjects = selectedClientId
    ? projects.filter((p) => p.client_id === selectedClientId)
    : projects

  const clientPeople: Person[] = selectedClientId
    ? clientUsers
        .filter((u) => u.client_id === selectedClientId)
        .map((u) => ({ ...u, type: 'client' as const }))
    : []

  const teamPeople: Person[] = teamMembers.map((m) => ({ ...m, type: 'team' as const }))

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId)
    setSelectedProjectId('')
    setSelectedInvitees((prev) => prev.filter((p) => p.type === 'team'))
  }

  function toggleInvitee(person: Person) {
    setSelectedInvitees((prev) => {
      const exists = prev.some((p) => p.id === person.id)
      if (exists) return prev.filter((p) => p.id !== person.id)
      return [...prev, person]
    })
  }

  function handleLocationTypeChange(type: 'meet' | 'local') {
    setLocationType(type)
    if (type === 'meet' && !meetLink) {
      setMeetLink(generateMeetLink())
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(meetLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function resetForm() {
    setTitle('')
    setDescription('')
    setSelectedClientId('')
    setSelectedProjectId('')
    setSelectedDate(undefined)
    setSelectedHour('10')
    setSelectedMinute('00')
    setLocationType('meet')
    setMeetLink(generateMeetLink())
    setLocalAddress('')
    setSelectedInvitees([])
    setCopied(false)
  }

  function handleSubmit() {
    if (!title.trim()) { toast.error('Informe o nome da reunião'); return }
    if (!selectedClientId) { toast.error('Selecione um cliente'); return }
    if (!selectedDate) { toast.error('Selecione a data da reunião'); return }
    if (locationType === 'meet' && !meetLink.trim()) { toast.error('Informe o link do Meet'); return }
    if (locationType === 'local' && !localAddress.trim()) { toast.error('Informe o local da reunião'); return }

    const invitees: MeetingInvitee[] = selectedInvitees.map((p) => ({
      id: p.id,
      name: p.full_name,
      email: p.email,
      type: p.type,
    }))

    startTransition(async () => {
      const result = await createMeeting({
        title: title.trim(),
        description: description.trim() || null,
        clientId: selectedClientId,
        projectId: selectedProjectId || null,
        scheduledDate: selectedDate,
        scheduledTime: `${selectedHour}:${selectedMinute}`,
        locationType,
        locationUrl: locationType === 'meet' ? meetLink.trim() : null,
        locationAddress: locationType === 'local' ? localAddress.trim() : null,
        invitees,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Reunião agendada com sucesso!')
        resetForm()
        onOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="dashboard-surface max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            Agendar Reunião
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meeting name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Nome da reunião <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Alinhamento de sprint, Apresentação de proposta..."
              title="Nome da reunião"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
            />
          </div>

          {/* Client + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Cliente <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                title="Selecione um cliente"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
              >
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Projeto</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={!selectedClientId}
                title="Selecione um projeto"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition disabled:opacity-50"
              >
                <option value="">Nenhum</option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Invitees */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Convidados
              <span className="ml-1 text-muted-foreground/60">(receberão o convite por e-mail)</span>
            </label>

            {selectedInvitees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedInvitees.map((person) => (
                  <span
                    key={person.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {person.type === 'client'
                      ? <User className="w-3 h-3" />
                      : <Users className="w-3 h-3" />}
                    <span>{person.full_name.split(' ')[0]}</span>
                    <span className="text-primary/50 text-[10px]">{person.email}</span>
                    <button
                      type="button"
                      title={`Remover ${person.full_name}`}
                      onClick={() => toggleInvitee(person)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-border bg-background overflow-hidden max-h-44 overflow-y-auto">
              {teamPeople.length === 0 && clientPeople.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhum colaborador disponível
                </p>
              ) : (
                <>
                  {teamPeople.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/40">
                        Equipe Reobot
                      </p>
                      {teamPeople.map((person) => {
                        const selected = selectedInvitees.some((p) => p.id === person.id)
                        return (
                          <button
                            key={person.id}
                            type="button"
                            title={person.full_name}
                            onClick={() => toggleInvitee(person)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left ${selected ? 'bg-primary/8' : ''}`}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                              {person.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-primary">
                                  {person.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{person.full_name}</p>
                              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" />{person.email}
                              </p>
                            </div>
                            {selected && (
                              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {clientPeople.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/40">
                        Cliente
                      </p>
                      {clientPeople.map((person) => {
                        const selected = selectedInvitees.some((p) => p.id === person.id)
                        return (
                          <button
                            key={person.id}
                            type="button"
                            title={person.full_name}
                            onClick={() => toggleInvitee(person)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left ${selected ? 'bg-primary/8' : ''}`}
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                              {person.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-blue-500">
                                  {person.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{person.full_name}</p>
                              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" />{person.email}
                              </p>
                            </div>
                            <span className="text-[10px] text-blue-400 shrink-0 mr-1">cliente</span>
                            {selected && (
                              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {!selectedClientId && clientUsers.length > 0 && (
                    <p className="text-[11px] text-muted-foreground text-center py-2 italic">
                      Selecione um cliente para ver seus usuários
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Data <span className="text-red-400">*</span>
              </label>
              <DatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="Selecionar data"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Horário</label>
              <div className="flex gap-1.5 items-center">
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(e.target.value)}
                  title="Hora"
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h}h</option>
                  ))}
                </select>
                <span className="text-muted-foreground text-sm">:</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(e.target.value)}
                  title="Minutos"
                  className="flex-1 rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{m}min</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Location type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Local</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => handleLocationTypeChange('meet')}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-sm font-medium transition-all ${
                  locationType === 'meet'
                    ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Video className="w-4 h-4" />
                Google Meet
              </button>
              <button
                type="button"
                onClick={() => handleLocationTypeChange('local')}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3 text-sm font-medium transition-all ${
                  locationType === 'local'
                    ? 'border-primary/50 bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Presencial
              </button>
            </div>

            {locationType === 'meet' && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">Link da reunião (gerado automaticamente)</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={meetLink}
                    onChange={(e) => setMeetLink(e.target.value)}
                    title="Link do Google Meet"
                    placeholder="https://meet.google.com/..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Copiar link"
                    onClick={handleCopyLink}
                    className="shrink-0 px-3"
                  >
                    {copied
                      ? <Check className="w-3.5 h-3.5 text-green-500" />
                      : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Gerar novo link"
                    onClick={() => setMeetLink(generateMeetLink())}
                    className="shrink-0 px-3"
                  >
                    Novo
                  </Button>
                </div>
              </div>
            )}

            {locationType === 'local' && (
              <input
                type="text"
                value={localAddress}
                onChange={(e) => setLocalAddress(e.target.value)}
                title="Endereço ou local"
                placeholder="Ex: Rua das Flores, 123 – Sala 5 / Escritório..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição / Pauta</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Assuntos a tratar, objetivos da reunião..."
              title="Descrição da reunião"
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { resetForm(); onOpenChange(false) }}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !title.trim() || !selectedClientId || !selectedDate}
          >
            {isPending ? 'Agendando...' : 'Agendar Reunião'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
