import { notFound } from 'next/navigation'
import { getCSATByToken } from '@/actions/csat'
import { CSATWidget } from '@/components/csat/CSATWidget'

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { survey, error } = await getCSATByToken(token)
  if (error || !survey) notFound()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">ReobotLabs</h1>
          {survey.project && <p className="text-muted-foreground text-sm mt-1">Projeto: {survey.project.name}</p>}
        </div>
        <CSATWidget token={token} type={survey.type} alreadyAnswered={!!survey.answered_at} />
      </div>
    </div>
  )
}
