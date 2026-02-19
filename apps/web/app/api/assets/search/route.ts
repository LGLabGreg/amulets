import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';
  const type = searchParams.get('type');
  const format = searchParams.get('format');
  const tags = searchParams.getAll('tags');

  const service = createServiceClient();

  let query = service.from('assets').select('*, users(username, avatar_url)').eq('is_public', true);

  if (q) {
    query = query.textSearch('fts', q, {
      type: 'websearch',
      config: 'english',
    });
  }

  if (type) query = query.eq('type', type);
  if (format) query = query.eq('asset_format', format);
  if (tags.length > 0) query = query.overlaps('tags', tags);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assets: data });
}
