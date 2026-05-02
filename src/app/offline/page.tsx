import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Voce esta offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sem conexao no momento. Assim que a internet voltar, recarregue para continuar.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Tentar novamente
          </Link>
        </div>
      </div>
    </main>
  )
}
