import { NextResponse } from 'next/server';

import { createClient } from '@supabase/supabase-js';

import { type BotRun, sweepBehaviouralBots } from '@/lib/blog/analytics';
import { BOT_ALERT_FROM, getResendClient } from '@/lib/resend';
import { SITE_URL } from '@/lib/seo';
import { supabaseEnv } from '@/lib/supabase/env';

// Vercel Cron hits this daily so the Supabase project sees regular API
// activity and doesn't get auto-paused for inactivity on the free tier.
// Configure in Vercel: Project Settings -> Environment Variables -> CRON_SECRET
// (Vercel automatically sends it as `Authorization: Bearer <value>` on cron
// invocations - see vercel.json for the schedule).
//
// It also runs the behavioural bot sweep, last and best-effort - see the note
// above that block.

// A little over a day, so a crawl landing near the cron's own run time can't
// slip between two windows. Overlap is free: the sweep only ever looks at rows
// still marked is_bot = false, so nothing can be reported twice.
const SWEEP_LOOKBACK_HOURS = 26;

function formatRun(run: BotRun): string {
  const when = new Date(run.startedAt)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
  const seconds = (run.durationMs / 1000).toFixed(1);
  const rate =
    run.durationMs > 0
      ? `${(run.views / (run.durationMs / 1000)).toFixed(1)}/s`
      : 'n/a';

  return [
    `${when} UTC · ${run.country ?? 'unknown'} · ${run.posts} posts, ${run.views} views in ${seconds}s (${rate})`,
    `  agent: ${run.userAgent ?? 'not sent'}`,
    run.lockedReads > 0
      ? `  *** got content for ${run.lockedReads} LOCKED post(s) - investigate ***`
      : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

async function sendBotAlert(
  flagged: BotRun[],
  rowsFlagged: number,
): Promise<void> {
  const to = process.env.CONTACT_EMAIL_TO;
  if (!to) {
    console.error('[cron] Missing CONTACT_EMAIL_TO; skipping bot alert.');
    return;
  }

  const runWord = flagged.length === 1 ? 'run' : 'runs';

  await getResendClient().emails.send({
    from: BOT_ALERT_FROM,
    to: [to],
    subject: `[blog] ${flagged.length} automated ${runWord} flagged`,
    text: [
      `${flagged.length} ${runWord} matched the behavioural bot rule in the last ${SWEEP_LOOKBACK_HOURS} hours.`,
      `${rowsFlagged} view rows are now marked is_bot and excluded from the reader stats.`,
      '',
      flagged.map(formatRun).join('\n\n'),
      '',
      `${SITE_URL}/stats?view=bots`,
    ].join('\n'),
  });
}

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

  // Deliberately last and deliberately swallowed: keeping Supabase awake is
  // this route's actual job, and a sweep failure must never turn a healthy
  // keep-alive into a 500 that reads as "the project is down". The outcome
  // goes in the body instead, so a quietly broken sweep is still visible to
  // anyone who curls this.
  let botSweep: 'ok' | 'failed' = 'ok';
  try {
    const { flagged, rowsFlagged } =
      await sweepBehaviouralBots(SWEEP_LOOKBACK_HOURS);
    if (flagged.length > 0) await sendBotAlert(flagged, rowsFlagged);
  } catch (sweepError) {
    console.error('[cron] Behavioural bot sweep failed:', sweepError);
    botSweep = 'failed';
  }

  return NextResponse.json({ ok: true, botSweep });
}
