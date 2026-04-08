import { NextResponse } from 'next/server';
const { upsertLead } = require('@/lib/db');

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceFromUrl = searchParams.get('source') || '';
    const body = await request.json();
    console.log("================ WATI PAYLOAD ================");
    console.log(JSON.stringify(body, null, 2));
    console.log("==============================================");

    // WATI webhook fields
    let finalPhone = body.waId || body.phone || '';
    let finalName  = body.senderName || body.name || 'Unknown Contact';
    let finalMsg   = body.text || body.message || '';
    if (!finalMsg) finalMsg = `(${body.type || 'Attachment'})`;

    if (!finalPhone) {
      return NextResponse.json({ error: 'Phone number (waId) is required' }, { status: 400 });
    }

    // source_number = the ?source= param (WATI number), or body field, or fallback
    const sourceNumber = sourceFromUrl || body.source_number || body.sourceId || 'WATI Webhook';

    const result = upsertLead({
      phone:         String(finalPhone).replace(/\D/g, ''),
      name:          finalName,
      message:       finalMsg,
      source_number: sourceNumber,
      timestamp:     body.created || body.timestamp || new Date().toISOString(),
    });

    return NextResponse.json({
      success:        true,
      lead_id:        result.id,
      created:        result.created,
      message:        result.created ? 'New lead created' : 'Lead updated',
      source_number:  sourceNumber,
      receivedFormat: body.eventType || 'custom',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

