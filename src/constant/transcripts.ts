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

  'security-master': `I worked at Scotiabank for one year. Out of everything I did there, I'd say one project really stood out to me. It was the Security Master, a data application that powers the trading algorithms that my team uses, as well as acts as a single source of truth for everything in the bank.

So this was brought to me as a new co-op, and the algorithmic team lead said that he wanted someone to bring his MVP to production. That involved completely re-architecting it, designing a new architecture that was easily testable, maintainable, and made it easy to add new custom columns as we further enriched the data set in the future.

And one moment that stood out to me after designing it and architecting it was when a new team wanted to come on board. And they had a specific quality of data that they wanted, but they didn't know what field actually had that property. So I went on multiple calls with Bloomberg back and forth to find a field that worked for them. And after that, I had to coordinate multiple teams within the bank to actually bring the data into the bank so we could use it.

At the end of it, I was getting questions from other team leads who wanted to know more about the security master and how they could use it, which was unreal as a co-op, because it made me realize that by digging deep into the problem and choosing to do the research to understand the data, suddenly I was getting asked about it, which is an amazing experience and honestly taught me that when it comes to solving problems, being able to dive deep into them and gather that knowledge is one of the most satisfying things.`,

  'infratech-experience': `I've been on my school's engineering society for almost four years now working on our website, and people always ask me why I've stayed for so long. It's because of the community. I think my love really started when I helped my mom build a meal planning app and realized that I could help solve problems for other people through coding, except now I get to do that at a faculty level.
  
I've been leading about 20 people on a few projects, and the biggest one that we've done is a room booking platform. The Engineering Society manages some study rooms. So we built a platform from the ground up that helps students book rooms a lot more easily.

My favorite part about being on the team has been these weekly chats where I get to talk to the team about anything, career advice, coding, and draw from my own experiences to help them out. One of the best outcomes was one of them applying to Shopify. He needed someone to speak to his coding experience, so I got to put in a good word for him. He aced the interview and got in, and I was really proud of him.

But it made me really happy realizing that I've helped build and shape this community that's giving people real life development experience on a large team solving problems that actually help people. So that's been a wonderful feeling. I've received a lot of great mentorship throughout my own career development, so being able to pay it forward is part of what makes me love it so much. That's why I'm still here.`,

  'hobbies-and-interests': `So in my first video I promised to tell you a bit more about me outside of work. So here we are.
  
First fun fact is that I've been learning Mandarin for more than 1,100 days for my girlfriend. Or... [fluent Mandarin]. Which is a very humble way of saying that I'm still learning.
  
I've also been playing the classical guitar for many years, and if you're interested I've got another video on that coming up. Outside of those things I love reading, hiking, and playing way too many racquet sports.`,

  'classical-guitar': `Hey. So I've been playing classical guitar now for more than ten years. Most of which admittedly was before university, but I've been getting back into it and re-learning a piece called Spanish Romance, so I wanted to share.
  
(Plays guitar)

As a quick side lesson, most people that I've met don't know what a classical guitar is. They've heard of acoustic and electric, but classical is very unique by this Rosetta. It's a very nice little pattern that you can see around the sound hole, and it's different from acoustic, which has a big teardrop shape. So, hopefully that taught you something new.`,
};

/** Every valid video id - the exact set of keys above, nothing more. */
export type VideoId = keyof typeof TRANSCRIPTS;
