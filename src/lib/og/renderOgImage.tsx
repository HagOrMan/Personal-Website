import { readFileSync } from 'fs';
import { join } from 'path';

import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// Read once at module scope (not fetched over the network — next/og's Satori
// renderer wants a data: URI or absolute URL, and reading from disk avoids a
// network round trip per image render).
const LOGO_DATA_URI = `data:image/png;base64,${readFileSync(
  join(process.cwd(), 'src/lib/og/logo.png'),
).toString('base64')}`;

// Hardcoded from the `lush` / `breeze` / `nebula` palette and dark
// `--background` in src/app/globals.css — Satori does not evaluate CSS
// custom properties, so these can't be read from the theme at render time.
const COLORS = {
  bg: '#061113',
  lush: '#00d1b0',
  breeze: '#09ace2',
  nebula: '#785bf9',
  foreground: '#eaf7f5',
  muted: '#8fb0ba',
};

const MAX_TITLE_LENGTH = 100;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

export async function renderOgImage({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: 80,
          backgroundColor: COLORS.bg,
          backgroundImage: `linear-gradient(135deg, ${COLORS.nebula}33 0%, ${COLORS.bg} 45%, ${COLORS.bg} 60%, ${COLORS.breeze}26 100%)`,
          fontFamily: 'sans-serif',
        }}
      >
        {eyebrow && (
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: 1,
              color: COLORS.lush,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 3,
              overflow: 'hidden',
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.15,
              color: COLORS.foreground,
              maxWidth: 980,
            }}
          >
            {truncate(title, MAX_TITLE_LENGTH)}
          </div>

          {subtitle && (
            <div
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
                overflow: 'hidden',
                fontSize: 30,
                lineHeight: 1.4,
                color: COLORS.muted,
                maxWidth: 900,
              }}
            >
              {truncate(subtitle, 160)}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontSize: 26,
            fontWeight: 600,
            color: COLORS.foreground,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori
              renders its own image pipeline; next/image doesn't apply here. */}
          <img src={LOGO_DATA_URI} width={44} height={44} alt='' />
          kylehagerman.dev
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
