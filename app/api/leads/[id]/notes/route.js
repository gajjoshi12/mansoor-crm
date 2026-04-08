import { NextResponse } from 'next/server';
const { addNote } = require('@/lib/db');

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, author } = body;

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    const result = addNote(parseInt(id), { author: author || '', content });
    return NextResponse.json({ success: true, note_id: result.id });
  } catch (error) {
    console.error('Add note error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
