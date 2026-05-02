import { LoginForm } from '@/components/auth/LoginForm'

interface SearchParams {
  error?: string
  domain?: string
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const authError =
    params.error === 'domain_not_allowed'
      ? `Acesso restrito ao domínio @${params.domain ?? 'empresa.com'}. Use sua conta corporativa.`
      : params.error === 'auth_callback_failed'
      ? 'Falha na autenticação. Tente novamente.'
      : null

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Entrar na sua conta</h2>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe o progresso do seu projeto</p>
      </div>
      {authError && (
        <div className="mb-4 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {authError}
        </div>
      )}
      <LoginForm />
    </div>
  )
}
