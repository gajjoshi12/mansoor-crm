import { NextResponse } from 'next/server';
const { getTelecallers, addTelecaller, toggleTelecaller, updateUserPassword, deleteTelecaller, deleteAllNonAdmins } = require('@/lib/db');

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const telecallers = getTelecallers();
    return NextResponse.json(telecallers);
  } catch (error) {
    console.error('Get telecallers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, username, password, role, action, id } = body;

    if (action === 'toggle' && id) {
      toggleTelecaller(parseInt(id));
      return NextResponse.json({ success: true });
    }

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const result = addTelecaller({ name, phone: phone || '', username, password, role });
    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Telecaller error:', error);
    const msg = error.message === 'Username already exists' ? 'Username already taken' : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id, all } = await request.json();
    if (all) {
      deleteAllNonAdmins();
    } else if (id) {
      deleteTelecaller(parseInt(id));
    } else {
      return NextResponse.json({ error: 'id or all required' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete telecaller error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, password } = await request.json();
    if (!id || !password) {
      return NextResponse.json({ error: 'id and password are required' }, { status: 400 });
    }
    updateUserPassword(parseInt(id), password);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
