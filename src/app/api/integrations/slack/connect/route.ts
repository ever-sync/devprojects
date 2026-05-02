import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.redirect(new URL('/settings?error=forbidden', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single()

  if (!membership?.workspace_id) {
    return NextResponse.redirect(new URL('/settings?error=no_workspace', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }

  const clientId = process.env.SLACK_CLIENT_ID
  const redirectUri = process.env.SLACK_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL('/settings/slack?error=slack_env_missing', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }

  const statePayload = Buffer.from(JSON.stringify({
    workspaceId: membership.workspace_id,
    userId: user.id,
    ts: Date.now(),
  })).toString('base64url')

  const authUrl = new URL('https://slack.com/oauth/v2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('scope', 'chat:write,channels:read,groups:read')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', statePayload)

  return NextResponse.redirect(authUrl)
}
