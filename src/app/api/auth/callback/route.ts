import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Restrição de domínio para SSO Google Workspace
      const allowedDomain = process.env.GOOGLE_WORKSPACE_DOMAIN
      if (allowedDomain) {
        const email = data.user.email ?? ''
        const provider = data.user.app_metadata?.provider
        if (provider === 'google' && !email.endsWith(`@${allowedDomain}`)) {
          await supabase.auth.signOut()
          return NextResponse.redirect(
            `${origin}/login?error=domain_not_allowed&domain=${allowedDomain}`
          )
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
