'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API para gerar PDF da proposta
 * POST /api/proposals/generate-pdf
 */
export async function POST(request: NextRequest) {
  try {
    const { proposalId } = await request.json();

    if (!proposalId) {
      return NextResponse.json(
        { error: 'Proposal ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Obter dados completos da proposta
    const { data: proposal, error } = await supabase
      .from('project_proposals')
      .select(`
        *,
        phases:proposal_phases(*),
        items:proposal_items(*),
        terms:proposal_terms(*)
      `)
      .eq('id', proposalId)
      .single();

    if (error || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // TODO: Integrar com biblioteca de geração de PDF (pdfmake, puppeteer, etc.)
    // Por enquanto, retornamos os dados formatados para o frontend renderizar

    return NextResponse.json({
      success: true,
      data: {
        proposal,
        pdfUrl: `/dashboard/proposals/${proposalId}/preview`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

/**
 * API para visualizar proposta pública (cliente)
 * GET /api/proposals/public/:token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: proposal, error } = await supabase
      .from('project_proposals')
      .select(`
        *,
        phases:proposal_phases(*),
        items:proposal_items(*),
        terms:proposal_terms(*)
      `)
      .eq('public_share_token', token)
      .single();

    if (error || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Registrar visualização
    if (proposal.status === 'sent') {
      await supabase
        .from('project_proposals')
        .update({ status: 'viewed' })
        .eq('public_share_token', token);
    }

    return NextResponse.json({
      success: true,
      data: proposal,
    });
  } catch (error) {
    console.error('Error fetching public proposal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposal' },
      { status: 500 }
    );
  }
}
