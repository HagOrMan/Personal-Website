'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { ArrowRight, Play } from 'lucide-react';

import GitHubIcon from '@/components/icons/GithubIcon';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import { Chip } from '@/components/ui/Chip';
import { VideoModalShell } from '@/components/video/VideoModalShell';
import { VideoStickyShell } from '@/components/video/VideoStickyShell';
import { GitHubLink, LinkedInLink } from '@/constant/socials';
import { VideoId } from '@/constant/transcripts';
import { useMediaQuery } from '@/lib/screenUtils';
import { cn } from '@/lib/utils';
import { PortfolioVideo } from '@/types/videos/PortfolioVideo';

const socialLinkClasses =
  'group cursor-newtab bg-nebula-500/5 border-nebula-600/10 text-nebula-950 hover:bg-nebula-500/10 hover:border-nebula-600/20 dark:bg-nebula-400/10 dark:border-nebula-300/20 dark:text-nebula-50 dark:hover:bg-nebula-400/20 dark:hover:border-nebula-300/40 flex items-center gap-3 rounded-full border px-5 py-2 transition-colors';

type AboutMeSection = {
  id: string;
  title: string;
  body: string;
  videoId?: VideoId;
};

// Every about-me section lives here - a mix of video-linked and no-video
// sections, so the layout below has to accommodate both.
const SECTIONS: AboutMeSection[] = [
  {
    id: 'intro',
    title: 'A Bit About Me',
    body: "I'm Kyle, a Software and Biomedical Engineering student at McMaster University. I love challenges and being involved in my community, like my current position building solutions to help the engineering student body in the engineering society.",
    videoId: 'about-me',
  },
  {
    id: 'how-i-started-coding',
    title: 'How I Started Coding',
    body: "I started to love programming after making a meal planner app for my mom. She was always stressed coming up with a plan for the week, so I made an app that randomized a meal plan for a list of meals that she could personalize. Seeing how much it helped her made me realize that I love building things that make other people's lives better.",
    videoId: 'how-i-started-coding',
  },
  {
    id: 'security-master',
    title: 'Defining Moment At Scotiabank',
    body: "During my co-op at Scotiabank, I took ownership of a security master (the source of truth the trading floor relies on to know what a given stock actually is) and brought it from an early prototype to something the firm ran on in production. I loved digging into the tricky edge cases nobody had looked at yet, and somewhere along the way I'd gone deep enough on stock symbology that people started coming to me with their questions. It's the kind of work I really enjoy: taking something rough and making it into a thing people can trust.",
    videoId: 'security-master',
  },
  {
    id: 'infratech-experience',
    title: 'Managing an Engineering Society Tech Team',
    body: "I've spent almost four years with the McMaster Engineering Society, and I've stayed because I love helping the community around me. It's the same instinct that got me into coding in the first place: taking something annoying off people's plates. Just at a bigger scale now. I help lead around 20 developers across a few teams building tools for the student body, like a platform to make booking events and rooms far easier. My favourite part, though, is the people: holding weekly hours to talk through code and careers, and getting to put in a word for someone chasing a role they really wanted. I got a lot of great mentorship starting out, so being on the other side of that now means a lot.",
    videoId: 'infratech-experience',
  },
  {
    id: 'hobbies-and-interests',
    title: 'What I Enjoy Outside of Coding',
    body: "Outside of coding, I've been learning Mandarin for a few years now. 我会说一点中文，不太好, which is a humble way of saying I'm still working on it. I play classical guitar (more on that below!), I'm a big reader, and when I'm not doing either of those I'm usually out on a soccer pitch, halfway up a trail, or picking up whichever racquet sport a friend wants to play that week.",
    videoId: 'hobbies-and-interests',
  },
  {
    id: 'classical-guitar',
    title: 'Classical Guitar',
    body: "I've been playing the classical guitar for more than 10 years now. I've learned a lot of songs, composed my own music, and wanted to share a classical guitar piece because I feel like most people have never heard classical guitar before :)",
    videoId: 'classical-guitar',
  },
];

export default function AboutMeClient({
  videos,
}: {
  videos: PortfolioVideo[];
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Desktop: which video the sticky panel shows - controlled here so both
  // the playlist (inside the panel) and the "Watch" chips (in the left
  // column) can drive it.
  const [activeVideoId, setActiveVideoId] = useState(videos[0].id);

  // Bumped on every desktop "Watch" click to force playback to start, even
  // when the clicked section's video is already the one showing (setting
  // activeVideoId to the same id it already holds is a no-op re-render,
  // so it wouldn't otherwise resume/start anything).
  const [watchSignal, setWatchSignal] = useState(0);

  // Mobile: the modal is its own separate instance, opened on demand.
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [mobileStartId, setMobileStartId] = useState(videos[0].id);

  const openMobilePreview = (videoId: VideoId) => {
    setMobileStartId(videoId);
    setMobileModalOpen(true);
  };

  const watchOnDesktop = (videoId: VideoId) => {
    setActiveVideoId(videoId);
    setWatchSignal((signal) => signal + 1);
  };

  return (
    <>
      {!isDesktop && (
        <button
          type='button'
          onClick={() => openMobilePreview(videos[0].id)}
          className='group focus-visible:ring-ring relative mb-12 flex aspect-[9/16] w-full max-w-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-black focus-visible:ring-2 focus-visible:outline-hidden'
        >
          <Image
            src={videos[0].poster}
            alt=''
            fill
            priority
            sizes='224px'
            className='object-cover opacity-90 transition-opacity group-hover:opacity-100'
          />
          <span
            aria-hidden
            className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent'
          />
          <span className='relative z-10 flex size-16 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm'>
            <Play className='size-7 translate-x-0.5' fill='currentColor' />
          </span>
          <span className='absolute right-0 bottom-0 left-0 z-10 p-3 text-left text-sm font-medium text-white'>
            Hear it from me
          </span>
        </button>
      )}

      <div
        className={cn(
          // The text column caps itself at max-w-2xl below, so give it
          // exactly that much track width instead of 1fr - otherwise the
          // second column (fixed at 320px) ends up hugging the right edge
          // of a much wider viewport with a dead gap in between. The
          // second column keeps the leftover space so the video can be
          // centered within it instead.
          isDesktop &&
            'grid grid-cols-[minmax(0,42rem)_1fr] items-start gap-14',
        )}
      >
        <div className='flex max-w-2xl flex-col gap-14'>
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className='scroll-mt-20'>
              <h2 className='text-foreground mb-3 text-2xl font-semibold'>
                {section.title}
              </h2>
              <p className='text-foreground/75 text-lg leading-relaxed'>
                {section.body}
              </p>
              {section.videoId && (
                <Chip
                  asChild
                  variant='default'
                  className='mt-4 px-3 py-1.5 text-sm'
                >
                  <button
                    type='button'
                    onClick={() => {
                      if (isDesktop) watchOnDesktop(section.videoId!);
                      else openMobilePreview(section.videoId!);
                    }}
                  >
                    <Play className='size-3' fill='currentColor' />
                    Watch
                  </button>
                </Chip>
              )}
            </section>
          ))}

          {/* No-video section - the design has to hold up without a clip too. */}
          <section id='connect' className='scroll-mt-20'>
            <h2 className='text-foreground mb-3 text-2xl font-semibold'>
              Let&apos;s Connect
            </h2>
            <p className='text-foreground/75 mb-4 text-lg leading-relaxed'>
              Want to see what I&apos;ve built, or just say hi?
            </p>
            <div className='flex flex-wrap items-center gap-4'>
              <Link
                href={GitHubLink}
                target='_blank'
                rel='noopener noreferrer'
                className={socialLinkClasses}
              >
                <GitHubIcon
                  className='h-5 w-5 opacity-80 transition-opacity group-hover:opacity-100'
                  useThemeForImgSource
                />
                <span className='text-sm font-medium opacity-80 group-hover:opacity-100'>
                  View my projects
                </span>
              </Link>

              <Link
                href={LinkedInLink}
                target='_blank'
                rel='noopener noreferrer'
                className={socialLinkClasses}
              >
                <LinkedInIcon
                  className='h-5 w-5 opacity-80 transition-opacity group-hover:opacity-100'
                  useThemeForImgSource
                />
                <span className='text-sm font-medium opacity-80 group-hover:opacity-100'>
                  Connect with me
                </span>
              </Link>

              <Link
                href='/contact'
                className='group bg-lush-500/5 border-lush-600/10 text-lush-950 hover:bg-lush-500/10 hover:border-lush-600/20 dark:bg-lush-400/10 dark:border-lush-300/20 dark:text-lush-50 dark:hover:bg-lush-400/20 dark:hover:border-lush-300/40 flex items-center gap-3 rounded-full border px-5 py-2 transition-colors'
              >
                <span className='text-sm font-medium opacity-80 group-hover:opacity-100'>
                  Get in touch
                </span>
                <ArrowRight className='h-4 w-4 opacity-80 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100' />
              </Link>
            </div>
          </section>
        </div>

        {isDesktop && (
          <VideoStickyShell
            videos={videos}
            activeVideoId={activeVideoId}
            onActiveVideoChange={setActiveVideoId}
            playSignal={watchSignal}
          />
        )}
      </div>

      <VideoModalShell
        videos={videos}
        open={mobileModalOpen}
        onOpenChange={setMobileModalOpen}
        initialVideoId={mobileStartId}
      />
    </>
  );
}
