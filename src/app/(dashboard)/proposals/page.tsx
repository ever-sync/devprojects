import { createClient } from '@/lib/supabase/server';
import { ProposalsList } from '@/components/proposals';
import { redirect } from 'next/navigation';

export default async function ProposalsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Try to get workspace from membership, fallback to profile-based query
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single();

  // Get all proposals (RLS handles access control)
  let query = supabase
    .from('proposals')
    .select(`
      *,
      client:clients(id, name),
      converted_project:projects(id, name)
    `)
    .order('created_at', { ascending: false });

  if (membership) {
    query = query.eq('workspace_id', membership.workspace_id);
  }

  const { data: proposals } = await query;

  return (
    <div className="container mx-auto py-8">
      <ProposalsList
        proposals={proposals || []}
        workspaceId={membership?.workspace_id || ''}
      />
    </div>
  );
}
