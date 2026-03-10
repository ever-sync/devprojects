'use client'

import { useState } from 'react'
import { CheckSquare2, CalendarPlus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateTaskDialog } from './CreateTaskDialog'
import { CreateMeetingDialog } from './CreateMeetingDialog'
import { AITaskDialog } from './AITaskDialog'

type Client = { id: string; name: string }
type Project = { id: string; name: string; client_id: string }
type TeamMember = { id: string; full_name: string; email: string; avatar_url: string | null }
type ClientUser = { id: string; full_name: string; email: string; avatar_url: string | null; client_id: string }

interface DashboardActionsProps {
  clients: Client[]
  projects: Project[]
  teamMembers: TeamMember[]
  clientUsers: ClientUser[]
}

export function DashboardActions({
  clients,
  projects,
  teamMembers,
  clientUsers,
}: DashboardActionsProps) {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [aiTaskDialogOpen, setAiTaskDialogOpen] = useState(false)
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="rounded-full border-violet-500/30 bg-violet-500/5 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
        onClick={() => setAiTaskDialogOpen(true)}
      >
        <Sparkles className="w-4 h-4 mr-1" />
        IA · Tarefas
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
        onClick={() => setTaskDialogOpen(true)}
      >
        <CheckSquare2 className="w-4 h-4 mr-1" />
        Criar Tarefa
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="rounded-full border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
        onClick={() => setMeetingDialogOpen(true)}
      >
        <CalendarPlus className="w-4 h-4 mr-1" />
        Criar Reunião
      </Button>

      <AITaskDialog
        open={aiTaskDialogOpen}
        onOpenChange={setAiTaskDialogOpen}
        clients={clients}
        projects={projects}
      />

      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        clients={clients}
        projects={projects}
        teamMembers={teamMembers}
        clientUsers={clientUsers}
      />

      <CreateMeetingDialog
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
        clients={clients}
        projects={projects}
        teamMembers={teamMembers}
        clientUsers={clientUsers}
      />
    </>
  )
}
