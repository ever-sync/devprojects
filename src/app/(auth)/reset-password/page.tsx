import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Recuperar senha</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Digite seu email e enviaremos um link de recuperação
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  )
}
