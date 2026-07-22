// Full spoken transcripts, kept separate from videos.ts so that file stays
// scannable (titles/durations/ids at a glance) instead of buried under
// paragraphs of text. Keyed by the same video `id` used everywhere else.
//
// Blank lines between paragraphs are intentional and preserved on purpose -
// VideoTranscriptPanel renders these with `whitespace-pre-line`, so each
// blank line becomes a paragraph break for the reader.
//
// No `Record<string, string>` annotation here on purpose - leaving the keys
// un-widened lets VideoId (below) be the exact union of real ids, so a
// typo'd id anywhere else in the app (videos.ts, a "Watch" chip, ...) fails
// to compile instead of silently 404ing at runtime.
export const TRANSCRIPTS = {
  'about-me': `Hey, I'm Kyle! I'm a Software and Biomedical Engineering student at McMaster University. I've done two years of work, so most recently I finished one year at Scotiabank in algorithmic trading. It was a great experience. I got to take a Security Master, which is a data application that powers the algorithms that my team uses, and bring it from MVP to production. I took full ownership of the process, was able to onboard new teams, and design the architecture around it, which was amazing.
  
Outside of work, I've been really involved in the engineering society. I've led a team of 20 developers to make applications that help the student body, such as a booking platform for rooms that the society manages. And I've loved helping out the community, as well as giving mentorship to the younger students now that I have a lot more experience to share.

I wanted to make a video series for my website. So this is the first video. In the next one, I will talk a bit more about why I love programming and how I got into it. And then in the future, I'll also share some more about my experiences and what I enjoy and what makes me, me outside of work. I'll also share that I am a proud dog owner. So here's my dog. Say hi, Rocky.

Anyways, hope you enjoy.`,

  'how-i-started-coding': `I want to share a bit about how I got into programming. And it's a funny story, I think. So it was in high school. I was just learning how to code. I had learned a bit of Java. and then I was learning C-sharp.

My mom always had trouble coming up with meals to make during the week. She found it pretty stressful having to come up with a meal plan based on a huge list of meals that she knew how to make. So I really wanted to help her out and made a meal planning app. Every week it would randomize some meals from that list of meals. And she really enjoyed it.

I think it was that moment where I realized that I really enjoyed helping people through programming. And the fact that you can literally make anything. It's like the world is your oyster. But not only that, you can make things that help people. And that's really where my passion came from.`,

  'classical-guitar': `Hey. So I've been playing classical guitar now for more than ten years. Most of which admittedly was before university, but I've been getting back into it and re-learning a piece called Spanish Romance, so I wanted to share.
  
(Plays guitar)

As a quick side lesson, most people that I've met don't know what a classical guitar is. They've heard of acoustic and electric, but classical is very unique by this Rosetta. It's a very nice little pattern that you can see around the sound hole, and it's different from acoustic, which has a big teardrop shape. So, hopefully that taught you something new.`,
};

/** Every valid video id - the exact set of keys above, nothing more. */
export type VideoId = keyof typeof TRANSCRIPTS;
