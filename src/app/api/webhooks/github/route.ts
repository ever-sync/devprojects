import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const digest = `sha256=${hmac.digest('hex')}`
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed } = checkRateLimit(`github:${ip}`, 60)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = request.headers.get('x-github-event')
  const payload = JSON.parse(body)

  try {
    const supabase = createAdminClient()

    switch (event) {
      case 'push':
        await handlePushEvent(supabase, payload)
        break
      case 'pull_request':
        await handlePullRequestEvent(supabase, payload)
        break
      case 'deployment_status':
        await handleDeploymentEvent(supabase, payload)
        break
      case 'ping':
        return NextResponse.json({ message: 'pong' })
      default:
        return NextResponse.json({ message: `Event ${event} not handled` })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('GitHub webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handlePushEvent(supabase: ReturnType<typeof createAdminClient>, payload: any) {
  const repoFullName = payload.repository?.full_name
  if (!repoFullName) return

  // Find matching repository
  const { data: repos } = await supabase
    .from('project_repositories')
    .select('id, project_id')
    .eq('repo_name', repoFullName)

  if (!repos || repos.length === 0) return

  for (const repo of repos) {
    for (const commit of payload.commits || []) {
      await supabase.from('task_commits').insert({
        project_id: repo.project_id,
        repository_id: repo.id,
        commit_sha: commit.id,
        commit_message: commit.message,
        commit_url: commit.url,
        author_name: commit.author?.name,
        author_email: commit.author?.email,
        committed_at: commit.timestamp,
        files_changed: (commit.added?.length || 0) + (commit.modified?.length || 0) + (commit.removed?.length || 0),
        additions: 0,
        deletions: 0,
      })
    }
  }
}

async function handlePullRequestEvent(supabase: ReturnType<typeof createAdminClient>, payload: any) {
  const pr = payload.pull_request
  const repoFullName = payload.repository?.full_name
  if (!pr || !repoFullName) return

  const { data: repos } = await supabase
    .from('project_repositories')
    .select('id, project_id')
    .eq('repo_name', repoFullName)

  if (!repos || repos.length === 0) return

  const prStatusMap: Record<string, string> = {
    opened: 'open',
    closed: pr.merged ? 'merged' : 'closed',
    reopened: 'open',
    synchronize: 'open',
  }

  const prStatus = prStatusMap[payload.action] || 'open'

  for (const repo of repos) {
    // Check if branch already linked
    const { data: existing } = await supabase
      .from('task_branches')
      .select('id')
      .eq('repository_id', repo.id)
      .eq('branch_name', pr.head?.ref)
      .limit(1)

    if (existing && existing.length > 0) {
      // Update existing branch record
      await supabase
        .from('task_branches')
        .update({
          pr_number: pr.number,
          pr_url: pr.html_url,
          pr_status: prStatus,
          pr_title: pr.title,
          commits_count: pr.commits,
          is_merged: pr.merged || false,
          merged_at: pr.merged_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id)
    }
  }
}

async function handleDeploymentEvent(supabase: ReturnType<typeof createAdminClient>, payload: any) {
  const deployment = payload.deployment
  const status = payload.deployment_status
  const repoFullName = payload.repository?.full_name
  if (!deployment || !status || !repoFullName) return

  const { data: repos } = await supabase
    .from('project_repositories')
    .select('id, project_id')
    .eq('repo_name', repoFullName)

  if (!repos || repos.length === 0) return

  const statusMap: Record<string, string> = {
    pending: 'pending',
    in_progress: 'building',
    success: 'success',
    failure: 'failure',
    error: 'failure',
  }

  for (const repo of repos) {
    await supabase.from('project_deployments').insert({
      project_id: repo.project_id,
      repository_id: repo.id,
      environment: deployment.environment || 'production',
      deployment_url: status.target_url,
      status: statusMap[status.state] || 'pending',
      commit_sha: deployment.sha,
      branch_name: deployment.ref,
      started_at: deployment.created_at,
      completed_at: status.state === 'success' || status.state === 'failure' ? status.created_at : null,
      metadata: {
        github_deployment_id: deployment.id,
        description: status.description,
      },
    })
  }
}
