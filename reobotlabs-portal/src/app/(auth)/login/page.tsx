import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Entrar na sua conta</h2>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe o progresso do seu projeto</p>
      </div>
      <LoginForm />
    </div>
  )
}
