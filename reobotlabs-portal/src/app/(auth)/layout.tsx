import Image from 'next/image'

const FEATURES = [
  {
    num: '1',
    title: 'Kanban de Tarefas',
    desc: 'Acompanhe cada tarefa do projeto em tempo real',
  },
  {
    num: '2',
    title: 'Timeline de Fases',
    desc: 'Visualize o progresso e marcos do projeto',
  },
  {
    num: '3',
    title: 'Documentos & Chat',
    desc: 'Tudo centralizado em um só lugar',
  },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo — branding ── */}
      <div className="auth-left-panel hidden lg:flex flex-col w-[45%] relative overflow-hidden">
        {/* Glow radial teal */}
        <div className="auth-glow absolute inset-0 pointer-events-none" />

        <div className="relative flex flex-col h-full px-10 py-12">
          {/* Logo */}
          <Image src="/logo.png" alt="ReobotLabs" width={180} height={30} priority />

          {/* Copy principal */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-bold text-white leading-snug mb-5">
              Acompanhe seu projeto
              <br />
              <span className="auth-teal">em tempo real.</span>
            </h1>
            <p className="text-white/55 text-base leading-relaxed max-w-xs">
              Visibilidade total do progresso, tarefas e documentos —
              direto no seu portal exclusivo.
            </p>
          </div>

          {/* Cards de features */}
          <div className="flex gap-3">
            {FEATURES.map((f) => (
              <div key={f.num} className="auth-feature-card flex-1 rounded-xl p-4">
                <div className="auth-feature-num w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-3">
                  {f.num}
                </div>
                <p className="text-white text-sm font-semibold leading-tight mb-1">{f.title}</p>
                <p className="text-white/45 text-xs leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background p-8">
        {/* Logo mobile */}
        <div className="lg:hidden mb-10">
          <Image src="/logo.png" alt="ReobotLabs" width={180} height={30} priority />
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
