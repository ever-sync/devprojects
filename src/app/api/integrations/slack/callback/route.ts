import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SlackOAuthResponse = {
  ok: boolean
  error?: string
  access_token?: string
  team?: { id: string; name: string }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings/slack?error=missing_code', appUrl))
  }

  let parsedState: { workspaceId: string; userId: string; ts: number } | null = null
  try {
    parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8')) as { workspaceId: string; userId: string; ts: number }
  } catch {
    return NextResponse.redirect(new URL('/settings/slack?error=invalid_state', appUrl))
  }

  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  const redirectUri = process.env.SLACK_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(new URL('/settings/slack?error=slack_env_missing', appUrl))
  }

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  const payload = (await response.json()) as SlackOAuthResponse
  if (!payload.ok || !payload.access_token || !payload.team?.id) {
    return NextResponse.redirect(new URL(`/settings/slack?error=${payload.error ?? 'oauth_failed'}`, appUrl))
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('external_integrations')
    .select('id, credentials')
    .eq('workspace_id', parsedState.workspaceId)
    .eq('service_type', 'slack')
    .limit(1)
    .maybeSingle()

  const credentials = {
    ...(existing?.credentials as Record<string, unknown> | undefined),
    bot_token: payload.access_token,
    team_id: payload.team.id,
    team_name: payload.team.name,
    connected_at: new Date().toISOString(),
  }

  if (existing?.id) {
    await supabase
      .from('external_integrations')
      .update({
        name: payload.team.name ? `Slack - ${payload.team.name}` : 'Slack',
        credentials,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('external_integrations')
      .insert({
        workspace_id: parsedState.workspaceId,
        service_type: 'slack',
        name: payload.team.name ? `Slack - ${payload.team.name}` : 'Slack',
        credentials,
        is_active: true,
      })
  }

  return NextResponse.redirect(new URL('/settings/slack?connected=1', appUrl))
}
