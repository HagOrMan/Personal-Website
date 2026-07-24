import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { supabaseEnv } from '@/lib/supabase/env';

// Vercel Cron hits this daily so the Supabase project sees regular API
// activity and doesn't get auto-paused for inactivity on the free tier.
// Configure in Vercel: Project Settings -> Environment Variables -> CRON_SECRET
// (Vercel automatically sends it as `Authorization: Bearer <value>` on cron
// invocations - see vercel.json for the schedule).

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 });
  }

  const { url, anonKey } = supabaseEnv();
  const supabase = createClient(url, anonKey);

  const { error } = await supabase
    .from('contact_submissions')
    .select('id', { count: 'exact', head: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
