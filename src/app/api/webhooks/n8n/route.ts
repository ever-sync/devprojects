import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed } = checkRateLimit(`n8n:${ip}`, 60)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.N8N_WEBHOOK_SECRET

  if (!expectedToken) {
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const supabase = createAdminClient()

    // Payload de execução N8N: detecta por campo event, n8n_execution_id ou executionId
    if (body.event === 'execution' || body.n8n_execution_id || body.executionId) {
      return await handleExecutionLog(supabase, body)
    }

    // Payload de notificação (comportamento original)
    const { user_id, type, title, body: notificationBody, channel, payload } = body

    if (!user_id || !type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    const { error } = await supabase.from('notifications').insert({
      user_id,
      type,
      title,
      body: notificationBody,
      channel: channel ?? 'in_app',
      payload,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleExecutionLog(
  supabase: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
) {
  // Aceita camelCase (n8n padrão) e snake_case
  const projectId = (body.project_id ?? body.projectId) as string | undefined
  const workspaceId = (body.workspace_id ?? body.workspaceId) as string | undefined
  const snapshotId = (body.snapshot_id ?? body.snapshotId) as string | undefined
  const executionId = (body.n8n_execution_id ?? body.executionId ?? body.id) as string | undefined
  const workflowId = (body.n8n_workflow_id ?? body.workflowId) as string | undefined
  const status = (body.status ?? body.executionStatus ?? 'unknown') as string
  const startedAt = (body.started_at ?? body.startedAt) as string | undefined
  const finishedAt = (body.finished_at ?? body.finishedAt) as string | undefined
  const errorMessage = (body.error_message ?? body.errorMessage ?? body.error) as string | undefined

  if (!projectId) {
    return NextResponse.json({ error: 'project_id is required for execution logs' }, { status: 400 })
  }

  // Resolver workspace_id a partir do project se não vier no payload
  let resolvedWorkspaceId = workspaceId
  if (!resolvedWorkspaceId) {
    const { data: project } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .single()
    resolvedWorkspaceId = project?.workspace_id
  }

  if (!resolvedWorkspaceId) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  let durationMs: number | null = null
  if (startedAt && finishedAt) {
    durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  }

  const { error } = await supabase.from('n8n_execution_logs').insert({
    project_id: projectId,
    workspace_id: resolvedWorkspaceId,
    snapshot_id: snapshotId ?? null,
    n8n_execution_id: executionId ?? null,
    n8n_workflow_id: workflowId ?? null,
    status,
    started_at: startedAt ?? null,
    finished_at: finishedAt ?? null,
    duration_ms: durationMs,
    error_message: errorMessage ?? null,
    data: body,
  })

  if (error) {
    console.error('n8n execution log error:', error)
    return NextResponse.json({ error: 'Failed to save execution log' }, { status: 500 })
  }

  return NextResponse.json({ success: true, type: 'execution_logged' })
}
