import { NextResponse } from 'next/server';
const { getWatiSources, addWatiSource, deleteWatiSource } = require('@/lib/db');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(getWatiSources());
  } catch (e) {
    console.error('Get sources error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { phone, label } = await request.json();
    if (!phone || !label) {
      return NextResponse.json({ error: 'phone and label are required' }, { status: 400 });
    }
    const result = addWatiSource({ phone, label });
    return NextResponse.json({ success: true, id: result.id });
  } catch (e) {
    console.error('Add source error:', e);
    const msg = e.message === 'Phone number already registered' ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    deleteWatiSource(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Delete source error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { updateWatiSourceCallers } = require('@/lib/db');
    const { id, callers } = await request.json();
    if (!id || !Array.isArray(callers)) {
      return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
    }
    updateWatiSourceCallers(parseInt(id), callers);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Update source error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
