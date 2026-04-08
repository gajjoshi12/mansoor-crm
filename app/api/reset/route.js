import { NextResponse } from 'next/server';
const { deleteAllLeads, fullSystemReset } = require('@/lib/db');

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { action } = await request.json();

    if (action === 'delete_leads') {
      deleteAllLeads();
      return NextResponse.json({ success: true, message: 'All leads deleted' });
    }

    if (action === 'full_reset') {
      fullSystemReset();
      return NextResponse.json({ success: true, message: 'System reset complete' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('Reset error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
