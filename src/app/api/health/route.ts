import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {}

  // Database check
  try {
    const supabase = createAdminClient()
    const dbStart = Date.now()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    checks.database = { ok: !error, latencyMs: Date.now() - dbStart }
    if (error) checks.database.error = error.message
  } catch (e) {
    checks.database = { ok: false, error: String(e) }
  }

  // Required env vars
  const requiredEnvs = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
  ]
  const missingEnvs = requiredEnvs.filter((k) => !process.env[k])
  checks.env = { ok: missingEnvs.length === 0, error: missingEnvs.length ? `Missing: ${missingEnvs.join(', ')}` : undefined }

  const allOk = Object.values(checks).every((c) => c.ok)

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeMs: Date.now() - start,
      checks,
    },
    { status: allOk ? 200 : 503 }
  )
}
