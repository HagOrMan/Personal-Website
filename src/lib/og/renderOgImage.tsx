import { ImageResponse } from 'next/og';

import { LOGO_DATA_URI } from './logoDataUri';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

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

const PADDING = 80;

export async function renderOgImage({
  title,
  subtitle,
  eyebrow,
  aside,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /**
   * An absolute image URL shown full-height against the right edge, with the
   * text column narrowed to clear it. `width` is its width at the card's
   * full height.
   */
  aside?: { src: string; width: number };
}) {
  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: PADDING,
          paddingRight: aside ? aside.width + PADDING : PADDING,
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
              lineHeight: 1.3,
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

        {aside && (
          // eslint-disable-next-line @next/next/no-img-element -- Satori
          <img
            src={aside.src}
            width={aside.width}
            height={OG_SIZE.height}
            alt=''
            style={{ position: 'absolute', top: 0, right: 0 }}
          />
        )}
        {/* Fades the page's left edge into the background. */}
        {aside && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: aside.width - 60,
              width: 60,
              height: OG_SIZE.height,
              backgroundImage: `linear-gradient(to right, ${COLORS.bg}, ${COLORS.bg}00)`,
            }}
          />
        )}
      </div>
    ),
    { ...OG_SIZE },
  );
}
