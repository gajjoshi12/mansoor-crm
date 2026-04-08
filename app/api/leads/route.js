import { NextResponse } from 'next/server';
const { getLeads, getSourceNumbers } = require('@/lib/db');
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const source = searchParams.get('source') || '';
    let assigned = searchParams.get('assigned') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Role-based Access Control
    if (session.role === 'telecaller') {
      assigned = session.id;
    }
    if (session.role === 'support') {
      // Support members see only leads assigned to them
      assigned = session.id;
    }

    const result = getLeads({ status, source, assigned, search, page, limit });
    const source_numbers = getSourceNumbers();
    return NextResponse.json({ ...result, source_numbers });
  } catch (error) {
    console.error('Get leads error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
