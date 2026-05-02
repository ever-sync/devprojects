import { createAdminClient } from '@/lib/supabase/server'
import { triggerN8nEvent } from '@/lib/n8n'
import { sendSlackNotification } from '@/lib/slack'
import { sendDiscordNotification } from '@/lib/discord'

type Recipient = {
  userId?: string | null
  email: string
  fullName?: string | null
}

type DispatchInput = {
  event: string
  type: string
  title: string
  body: string
  projectId?: string
  payload?: Record<string, unknown>
  recipients: Recipient[]
}

function dedupeRecipients(recipients: Recipient[]) {
  const seen = new Set<string>()

  return recipients.filter((recipient) => {
    const key = recipient.userId ?? recipient.email.toLowerCase()
    if (!recipient.email || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function dispatchNotifications(input: DispatchInput) {
  const recipients = dedupeRecipients(input.recipients)
  if (recipients.length === 0) return

  const adminClient = createAdminClient()
  const inAppRecipients = recipients.filter((recipient) => recipient.userId)

  if (inAppRecipients.length > 0) {
    await adminClient.from('notifications').insert(
      inAppRecipients.map((recipient) => ({
        user_id: recipient.userId!,
        type: input.type,
        title: input.title,
        body: input.body,
        channel: 'in_app',
        payload: {
          projectId: input.projectId ?? null,
          ...(input.payload ?? {}),
        },
      })),
    )
  }

  await triggerN8nEvent({
    event: input.event,
    projectId: input.projectId,
    data: {
      type: input.type,
      title: input.title,
      body: input.body,
      recipients: recipients.map((recipient) => ({
        userId: recipient.userId ?? null,
        email: recipient.email,
        fullName: recipient.fullName ?? null,
      })),
      ...(input.payload ?? {}),
    },
  })

  await sendSlackNotification({
    projectId: input.projectId,
    title: input.title,
    body: input.body,
  })

  await sendDiscordNotification({
    projectId: input.projectId,
    title: input.title,
    body: input.body,
  })
}

export async function getProjectClientRecipients(projectId: string) {
  const adminClient = createAdminClient()
  const { data: project } = await adminClient
    .from('projects')
    .select('id, name, client_id, clients(name, contact_email)')
    .eq('id', projectId)
    .single()

  if (!project?.client_id) {
    return { projectName: null, clientName: null, recipients: [] as Recipient[] }
  }

  const { data: clientLinks } = await adminClient
    .from('client_users')
    .select('user_id')
    .eq('client_id', project.client_id)

  const userIds = (clientLinks ?? []).map((item) => item.user_id)
  const { data: profiles } = userIds.length > 0
    ? await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
    : { data: [] as Array<{ id: string; full_name: string; email: string }> }

  const recipients: Recipient[] = [
    ...(profiles ?? []).map((profile) => ({
      userId: profile.id,
      email: profile.email,
      fullName: profile.full_name,
    })),
  ]

  const fallbackEmail = (project.clients as { contact_email?: string | null; name?: string | null } | null)?.contact_email
  if (fallbackEmail) {
    recipients.push({
      email: fallbackEmail,
      fullName: (project.clients as { name?: string | null } | null)?.name ?? null,
    })
  }

  return {
    projectName: project.name,
    clientName: (project.clients as { name?: string | null } | null)?.name ?? null,
    recipients: dedupeRecipients(recipients),
  }
}

export async function notifyClientPendingTask(input: {
  projectId: string
  taskId: string
  taskTitle: string
  status: string
}) {
  const { projectName, clientName, recipients } = await getProjectClientRecipients(input.projectId)
  if (recipients.length === 0) return

  await dispatchNotifications({
    event: 'notification.task_pending',
    type: 'task_pending',
    title: `Nova pendencia em ${projectName ?? 'projeto'}`,
    body: `A tarefa "${input.taskTitle}" esta aguardando retorno do cliente.`,
    projectId: input.projectId,
    payload: {
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      taskStatus: input.status,
      projectName,
      clientName,
    },
    recipients,
  })
}

export async function notifyTaskStakeholders(input: {
  projectId: string
  taskId: string
  taskTitle: string
  recipients: Recipient[]
}) {
  await dispatchNotifications({
    event: 'notification.task_updated',
    type: 'task_updated',
    title: 'Atualizacao de tarefa',
    body: `A tarefa "${input.taskTitle}" recebeu uma atualizacao importante.`,
    projectId: input.projectId,
    payload: {
      taskId: input.taskId,
      taskTitle: input.taskTitle,
    },
    recipients: input.recipients,
  })
}

export async function notifyApprovalPending(input: {
  projectId: string
  approvalId: string
  title: string
  approvalKind: string
}) {
  const { projectName, clientName, recipients } = await getProjectClientRecipients(input.projectId)
  if (recipients.length === 0) return

  await dispatchNotifications({
    event: 'notification.approval_pending',
    type: 'approval_pending',
    title: `Aprovacao pendente em ${projectName ?? 'projeto'}`,
    body: `Existe uma solicitacao de ${input.approvalKind} aguardando validacao: "${input.title}".`,
    projectId: input.projectId,
    payload: {
      approvalId: input.approvalId,
      approvalTitle: input.title,
      approvalKind: input.approvalKind,
      projectName,
      clientName,
    },
    recipients,
  })
}

export async function notifyMeetingInvitees(input: {
  meetingId: string
  projectId?: string | null
  projectName?: string | null
  title: string
  scheduledDate: string
  scheduledTime: string
  locationType: 'meet' | 'local'
  locationUrl?: string | null
  locationAddress?: string | null
  invitees: Recipient[]
}) {
  await dispatchNotifications({
    event: 'notification.meeting_scheduled',
    type: 'meeting_scheduled',
    title: `Reuniao agendada: ${input.title}`,
    body: `A reuniao foi agendada para ${input.scheduledDate} as ${input.scheduledTime}.`,
    projectId: input.projectId ?? undefined,
    payload: {
      meetingId: input.meetingId,
      meetingTitle: input.title,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime,
      locationType: input.locationType,
      locationUrl: input.locationUrl ?? null,
      locationAddress: input.locationAddress ?? null,
      projectName: input.projectName ?? null,
    },
    recipients: input.invitees,
  })
}

export async function getProfilesByIds(userIds: string[]) {
  if (userIds.length === 0) return [] as Recipient[]

  const adminClient = createAdminClient()
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)

  return (profiles ?? []).map((profile) => ({
    userId: profile.id,
    email: profile.email,
    fullName: profile.full_name,
  }))
}
