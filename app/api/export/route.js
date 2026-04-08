import { NextResponse } from 'next/server';
const { getAllLeadsForExport } = require('@/lib/db');
const XLSX = require('xlsx');
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      source: searchParams.get('source'),
      status: searchParams.get('status'),
      assigned_to: searchParams.get('assigned_to'),
    };

    const leads = getAllLeadsForExport(filters);

    const data = leads.map((l, i) => ({
      '#': i + 1,
      'Phone': l.phone,
      'Name': l.name || '-',
      'Status': l.status,
      'Source WhatsApp': l.source_number || '-',
      'Source Label': l.source_label || '-',
      'Assigned To': l.assigned_to || 'Unassigned',
      'Last Message': l.last_message || '-',
      'Last Activity': l.last_activity || '-',
      'Created': l.created_at || '-',
      'Updated': l.updated_at || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(r => String(r[key] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="leads_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
