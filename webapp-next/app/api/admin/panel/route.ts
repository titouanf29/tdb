import { NextRequest, NextResponse } from 'next/server';
import { getAdminPanelData } from '@/lib/admin-panel-data';
import { isValidAdminToken } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value ?? '';

  if (!isValidAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      ok: true,
      panel: getAdminPanelData(),
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}
