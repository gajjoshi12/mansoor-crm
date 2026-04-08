import { NextResponse } from 'next/server';
const { getSetting, setSetting } = require('@/lib/db');
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

    const value = getSetting(key);
    return NextResponse.json({ key, value });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { key, value } = await request.json();
    if (!key || value === undefined) return NextResponse.json({ error: 'Missing key/value' }, { status: 400 });

    setSetting(key, String(value));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
