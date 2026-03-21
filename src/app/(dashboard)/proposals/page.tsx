import { createClient } from '@/lib/supabase/server';
import { ProposalsList } from '@/components/proposals';
import { redirect } from 'next/navigation';

export default async function ProposalsPage() {
  const supabase = await createClient();
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/sign-in');
  }

  // Get user's workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    redirect('/onboarding');
  }

  // Get all proposals for the workspace
  const { data: proposals } = await supabase
    .from('proposals')
    .select(`
      *,
      client:clients(id, name),
      converted_project:projects(id, name)
    `)
    .eq('workspace_id', membership.workspace_id)
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto py-8">
      <ProposalsList 
        proposals={proposals || []} 
        workspaceId={membership.workspace_id}
      />
    </div>
  );
}
