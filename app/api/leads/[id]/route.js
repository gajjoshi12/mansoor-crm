import { NextResponse } from 'next/server';
const { getLeadById, updateLead } = require('@/lib/db');

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const lead = getLeadById(parseInt(id));
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (error) {
    console.error('Get lead error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = updateLead(parseInt(id), body);
    if (!updated) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    const lead = getLeadById(parseInt(id));
    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error('Update lead error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
