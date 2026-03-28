import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * Webhook para receber eventos do GitHub
 * Suporta: push, pull_request, deployment_status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const event = request.headers.get('x-github-event')
    const deliveryId = request.headers.get('x-github-delivery')

    console.log(`[GitHub Webhook] Event: ${event}, Delivery: ${deliveryId}`)

    // Verificar assinatura (opcional, mas recomendado em produção)
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')}`
      
      if (signature !== expectedSignature) {
        console.warn('[GitHub Webhook] Assinatura inválida')
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)
    const supabase = await createClient()

    // Processar baseado no tipo de evento
    switch (event) {
      case 'push':
        await handlePushEvent(supabase, payload)
        break
      
      case 'pull_request':
        await handlePullRequestEvent(supabase, payload)
        break
      
      case 'deployment_status':
        await handleDeploymentStatusEvent(supabase, payload)
        break
      
      default:
        console.log(`[GitHub Webhook] Evento não tratado: ${event}`)
    }

    return NextResponse.json({ success: true, eventId: deliveryId })
  } catch (error) {
    console.error('[GitHub Webhook] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}

/**
 * Processa evento de push (commits)
 */
async function handlePushEvent(supabase: any, payload: any) {
  const { repository, commits, ref, after: commitSha } = payload
  
  console.log(`[GitHub Push] Repo: ${repository.full_name}, Commits: ${commits?.length}`)

  // Encontrar repositório na nossa base
  const { data: repo } = await supabase
    .from('project_repositories')
    .select('id, project_id, repo_url')
    .eq('provider_repo_id', repository.id.toString())
    .single()

  if (!repo) {
    console.log('[GitHub Push] Repositório não vinculado a nenhum projeto')
    return
  }

  // Processar cada commit
  for (const commit of commits || []) {
    const { id, message, url, author, timestamp, added, removed, modified } = commit

    // Tentar vincular a uma tarefa baseada na mensagem
    let taskId = null
    const taskMatch = message.match(/#(\d+)/) // Procura por #123 no commit
    if (taskMatch) {
      const taskNumber = parseInt(taskMatch[1])
      
      const { data: task } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', repo.project_id)
        .ilike('title', `%#${taskNumber}%`)
        .maybeSingle()

      taskId = task?.id || null
    }

    // Registrar commit
    await supabase.from('task_commits').insert({
      project_id: repo.project_id,
      repository_id: repo.id,
      task_id: taskId,
      commit_sha: id,
      commit_message: message.split('\n')[0], // Primeira linha da mensagem
      commit_url: url,
      author_name: author?.name,
      author_email: author?.email,
      committed_at: timestamp,
      files_changed: (added?.length || 0) + (removed?.length || 0) + (modified?.length || 0),
      additions: added?.length || 0,
      deletions: removed?.length || 0,
    })

    console.log(`[GitHub Push] Commit registrado: ${id.substring(0, 7)} - ${message.substring(0, 50)}`)
  }

  // Atualizar último sync do repositório
  await supabase
    .from('project_repositories')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', repo.id)
}

/**
 * Processa evento de pull request
 */
async function handlePullRequestEvent(supabase: any, payload: any) {
  const { action, pull_request, repository } = payload
  
  console.log(`[GitHub PR] Action: ${action}, PR: #${pull_request.number}`)

  // Encontrar repositório
  const { data: repo } = await supabase
    .from('project_repositories')
    .select('id, project_id')
    .eq('provider_repo_id', repository.id.toString())
    .single()

  if (!repo) return

  // Tentar vincular a uma tarefa
  let taskId = null
  const taskMatch = pull_request.title.match(/#(\d+)/) || 
                    pull_request.body?.match(/#(\d+)/)
  
  if (taskMatch) {
    const taskNumber = parseInt(taskMatch[1])
    
    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('project_id', repo.project_id)
      .ilike('title', `%#${taskNumber}%`)
      .maybeSingle()

    taskId = task?.id || null
  }

  // Mapear status do PR
  const prStatusMap: Record<string, any> = {
    opened: 'open',
    reopened: 'open',
    closed: pull_request.merged ? 'merged' : 'closed',
    merged: 'merged',
  }

  const prStatus = prStatusMap[action] || 'open'

  // Vincular branch/tarefa
  if (taskId) {
    // Verificar se já existe branch vinculada
    const { data: existingBranch } = await supabase
      .from('task_branches')
      .select('id')
      .eq('task_id', taskId)
      .eq('repository_id', repo.id)
      .eq('branch_name', pull_request.head.ref)
      .maybeSingle()

    if (existingBranch) {
      // Atualizar branch existente
      await supabase
        .from('task_branches')
        .update({
          pr_number: pull_request.number,
          pr_url: pull_request.html_url,
          pr_status: prStatus,
          pr_title: pull_request.title,
          is_merged: pull_request.merged,
          merged_at: pull_request.merged_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBranch.id)
    } else {
      // Criar nova branch
      await supabase
        .from('task_branches')
        .insert({
          task_id: taskId,
          repository_id: repo.id,
          branch_name: pull_request.head.ref,
          pr_number: pull_request.number,
          pr_url: pull_request.html_url,
          pr_status: prStatus,
          pr_title: pull_request.title,
          is_merged: pull_request.merged,
          merged_at: pull_request.merged_at,
        })
    }
  }

  console.log(`[GitHub PR] PR #${pull_request.number} processado`)
}

/**
 * Processa evento de deployment status
 */
async function handleDeploymentStatusEvent(supabase: any, payload: any) {
  const { deployment_status, deployment, repository } = payload
  
  console.log(`[GitHub Deploy] Status: ${deployment_status.state}, Env: ${deployment_status.environment}`)

  // Encontrar repositório
  const { data: repo } = await supabase
    .from('project_repositories')
    .select('id, project_id')
    .eq('provider_repo_id', repository?.id?.toString())
    .single()

  if (!repo && !deployment) {
    console.log('[GitHub Deploy] Repositório não encontrado')
    return
  }

  // Mapear status do GitHub para nosso formato
  const statusMap: Record<string, any> = {
    pending: 'pending',
    queued: 'pending',
    in_progress: 'building',
    success: 'success',
    failure: 'failure',
    cancelled: 'cancelled',
  }

  const status = statusMap[deployment_status.state] || 'pending'
  const environment = deployment_status.environment as any || 'production'

  // Registrar deployment
  await supabase.from('project_deployments').insert({
    project_id: repo?.project_id || null,
    repository_id: repo?.id || null,
    environment,
    deployment_url: deployment_status.environment_url,
    status,
    commit_sha: deployment_status.commit_sha,
    branch_name: deployment_status.branch || deployment?.ref,
    started_at: deployment_status.created_at,
    completed_at: deployment_status.updated_at,
    logs_url: deployment_status.log_url,
    error_message: deployment_status.description,
    metadata: {
      github_deployment_id: deployment?.id,
      github_status_id: deployment_status.id,
    },
  })

  console.log(`[GitHub Deploy] Deployment registrado: ${status} em ${environment}`)
}

/**
 * GET handler para teste do webhook
 */
export async function GET() {
  return NextResponse.json({
    message: 'GitHub Webhook endpoint ativo',
    supported_events: ['push', 'pull_request', 'deployment_status'],
  })
}
