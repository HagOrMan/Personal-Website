import { TRANSCRIPTS, VideoId } from '@/constant/transcripts';
import { PortfolioVideo } from '@/types/videos/PortfolioVideo';

// Videos live in Cloudflare R2, served through a custom domain (never the
// r2.dev URL - see CLAUDE.md media pipeline notes). Falls back to an empty
// base so a missing env var 404s a <video> tag instead of crashing the app.
const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL ?? '';

// Naming convention - shared by all three asset types per video, keyed off `id`:
//   video:      {R2_BASE_URL}/about-me/{id}.mp4  (R2 bucket, never committed here)
//   poster:     /public/posters/{id}.jpg        (repo, served as a static asset)
//   transcript: TRANSCRIPTS[id] in transcripts.ts (kept out of this file - see there)
//
// Every helper takes a VideoId (derived from TRANSCRIPTS' keys - see
// transcripts.ts), not a bare string, so a typo'd id fails to compile
// instead of silently producing a 404 poster/video at runtime.
function videoSrc(id: VideoId): string {
  return `${R2_BASE_URL}/about-me/${id}.mp4`;
}

function posterSrc(id: VideoId): string {
  return `/posters/${id}.jpg`;
}

function transcriptFor(id: VideoId): string {
  return TRANSCRIPTS[id];
}

// Ordered as intended for viewing - the first entry is the opening video.
// To add a new video once it's recorded/encoded: append an entry here with
// a new kebab-case `id`, then drop its poster at public/posters/{id}.jpg and
// its encoded .mp4 in the R2 bucket under videos/{id}.mp4.
export const PORTFOLIO_VIDEOS: PortfolioVideo[] = [
  {
    id: 'about-me',
    title: 'About Me',
    durationLabel: '1:11',
    durationSeconds: 71,
    poster: posterSrc('about-me'),
    src: videoSrc('about-me'),
    transcript: transcriptFor('about-me'),
    relatedSectionId: 'intro',
  },
  {
    id: 'how-i-started-coding',
    title: 'How I Started Coding',
    durationLabel: '0:45',
    durationSeconds: 45,
    poster: posterSrc('how-i-started-coding'),
    src: videoSrc('how-i-started-coding'),
    transcript: transcriptFor('how-i-started-coding'),
    relatedSectionId: 'how-i-started-coding',
  },
  {
    id: 'security-master',
    title: 'Scotiabank Experience',
    durationLabel: '1:31',
    durationSeconds: 91,
    poster: posterSrc('security-master'),
    src: videoSrc('security-master'),
    transcript: transcriptFor('security-master'),
    relatedSectionId: 'security-master',
  },
  {
    id: 'infratech-experience',
    title: 'Managing InfraTech',
    durationLabel: '1:24',
    durationSeconds: 84,
    poster: posterSrc('infratech-experience'),
    src: videoSrc('infratech-experience'),
    transcript: transcriptFor('infratech-experience'),
    relatedSectionId: 'infratech-experience',
  },
  {
    id: 'hobbies-and-interests',
    title: 'Hobbies & Interests',
    durationLabel: '0:31',
    durationSeconds: 31,
    poster: posterSrc('hobbies-and-interests'),
    src: videoSrc('hobbies-and-interests'),
    transcript: transcriptFor('hobbies-and-interests'),
    relatedSectionId: 'hobbies-and-interests',
  },
  {
    id: 'classical-guitar',
    title: 'Classical Guitar',
    durationLabel: '1:51',
    durationSeconds: 111,
    poster: posterSrc('classical-guitar'),
    src: videoSrc('classical-guitar'),
    transcript: transcriptFor('classical-guitar'),
    relatedSectionId: 'classical-guitar',
  },
];
