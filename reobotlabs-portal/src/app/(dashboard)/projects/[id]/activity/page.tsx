import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ActivityFeedRealtime } from '@/components/activity/ActivityFeedRealtime'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { getProjectActivities } from '@/actions/activities'
import type { CommentWithAuthor } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ActivityPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const isAdmin = profile?.role === 'admin'

  const [commentsRes, activitiesRes] = await Promise.all([
    supabase
      .from('comments')
      .select('*, author:profiles!comments_author_id_fkey(id, full_name, avatar_url, role)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    getProjectActivities(id),
  ])

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Atividade"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Atividade' },
        ]}
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} />

      <div className="space-y-10 mt-6">
        {activitiesRes.data.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Histórico de Alterações
            </h2>
            <ActivityTimeline activities={activitiesRes.data} />
          </section>
        )}

        <section className="pt-6 border-t border-border">
          <ActivityFeedRealtime
            initialComments={(commentsRes.data ?? []) as unknown as CommentWithAuthor[]}
            projectId={id}
            isAdmin={isAdmin}
          />
        </section>
      </div>
    </div>
  )
}

import { History } from 'lucide-react'
