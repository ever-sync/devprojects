import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal do Cliente | ReobotLabs',
  description: 'Acompanhe o progresso do seu projeto em tempo real.',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.2),transparent_30%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.22),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#f3f7fb_45%,#eef3f8_100%)] text-foreground font-sans antialiased">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-base font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
              R
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-950">ReobotLabs</p>
              <p className="text-xs text-slate-500">Portal do cliente</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 md:inline-flex">
            Atualizacoes e aprovacoes em um unico lugar
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        {children}
      </main>
      <footer className="mt-20 border-t border-slate-200/70 bg-white/50 py-10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Acompanhamento estruturado, sem ruido operacional.
            </p>
            <p className="text-sm text-slate-500">
              Ambiente de cliente mantido pela <span className="font-semibold text-slate-900">ReobotLabs</span>
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Client portal
          </p>
        </div>
      </footer>
    </div>
  )
}
