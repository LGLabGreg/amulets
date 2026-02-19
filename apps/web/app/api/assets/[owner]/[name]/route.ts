import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const { owner, name } = await params;
  const service = createServiceClient();

  const { data: userRecord } = await service
    .from('users')
    .select('id')
    .eq('username', owner)
    .single();

  if (!userRecord) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: asset, error } = await service
    .from('assets')
    .select('*, users(username, avatar_url), asset_versions(id, version, message, created_at)')
    .eq('owner_id', userRecord.id)
    .eq('slug', name)
    .eq('is_public', true)
    .order('created_at', {
      referencedTable: 'asset_versions',
      ascending: false,
    })
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ asset });
}
