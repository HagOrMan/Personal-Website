// scripts/process-music.mjs loads this file on its own, outside the Next
// build, to read slugs, titles and years for the MP3 tags. Keep every import
// here `import type` - a value import would break that script.
import type { CompositionEntry } from '@/types/music';

// To add a piece: save its score as music-src/{slug}.mscz, add an entry here
// with the same slug, and run `pnpm music`. See scripts/README.md.
export const COMPOSITIONS: CompositionEntry[] = [
  {
    slug: 'nice',
    title: 'Nice',
    subtitle: 'An original composition for my high school strings class',
    instrumentation: 'Viola, Cello',
    year: 2019,
    order: 1,
    featured: true,
    writeup: `In my third high school strings class of playing the cello, our final performance task involved playing a piece. Key word: playing.
    
    In my infinite zeal, I wanted to take music that was going around in my head and bring it to life. I'd previously made a few pieces that never got transcribed onto sheet music, and I had also arranged a piece the year before with a few friends, so it wasn't a completely daunting task.
    
    So, I set out to write! I started with the main idea, found in the first section and then called back before the ending. There are four ideas in the piece, which I will refer to as scenes. What ended up happening is I had these melodies I wanted to include, with no idea how to make them work together or if I should at all. My guitar teacher at the time suggested I create small melodies to flow between each scene, helping tie the piece together. So, this piece is a mix of scenes and transitions.
    
    The final scene is my favourite, where I experimented a lot with handing off melodies and mirroring/reflecting the sounds. I actually don't believe I had the full melody in mind, a lot of it was simply built piece by piece as I explored the story I wanted to tell. You'll find that the cello and viola hand off who is doing the triplets, or have one instrument's pitch go higher as the other goes lower. But my favourite part is easily the very end, as the instruments rotate triplets and eigth notes for an energetic finish.`,
  },
  {
    slug: 'arr-of-qingyun-peak-themes',
    title: 'Qingyun Peak Themes',
    subtitle: 'An arrangement from a game song',
    instrumentation: 'Flute, Violin, Cello',
    year: 2021,
    order: 2,
    featured: true,
    writeup: `In giant mountains where they rise into the clouds like skyscrapers and birds fly by, what feelings are evoked?
    
    This piece is an arrangement of that exact area in a game, where the background music makes me feel wistful and evokes deep emotions. It felt ethereal, standing atop the peaks and hearing those beautiful melodies, so I wanted to try arranging it myself for instruments I and friends could play.`,
  },
  {
    slug: 'bass-etude-no1-bass-riff',
    title: 'Bass Etude No. 1 "The Bass Riff"',
    subtitle: 'Groovy riff exploring silence',
    instrumentation: 'Electric Bass',
    year: 2020,
    order: 3,
    featured: false,
    writeup: `How much of a melody do you need to hear to recognize it? That question was the central thought behind this piece.
    
    For the longest time, I've come up with little melodies on the guitar. 90% of them are currently on my phone, still as a voice note. This is the first one that I decided to write out at the recommendation of my guitar teacher.
    
    It started as the main melody. As I wrote the piece, I started thinking about lessons from class - how the silence in music is as important as the notes themselves. So, I started wondering how I could use the off beats and silence to make the melody progressively groovier, still incorporating the feel yet using less notes to do it.
    
    I had the melody in my head and was humming it, trying different variations of silence and the notes that felt right to me. The end product I decided to name an etude, after hearing that it could make a good study piece for exploring rhythms.`,
  },
  {
    slug: 'aboard-the-pirate-ship',
    title: 'Aboard the Pirate Ship',
    subtitle: 'for solo cello',
    instrumentation: 'Cello',
    year: 2020,
    order: 4,
    featured: false,
    writeup: `I honestly did not know what to name this piece. I thought of adventures at sea. Pirates, or something along those lines. It always came back to being pirate-adjacent - a night at sea, excitement in the waters, just something out there.
    
    Like many of my cello pieces, this is a melody I created while playing with notes in my head, so it may be highly influenced by whatever was on my mind at the time.`,
  },
  {
    slug: 'cello-miniature-a-happy-day',
    title: 'Cello Miniature "A Happy Day"',
    subtitle: 'for solo cello',
    instrumentation: 'Cello',
    year: 2021,
    order: 5,
    featured: false,
    writeup: `This was a quirky little melody I came up with that made me think of someone having a happy day. I wanted to try the 6/8 time signature and honestly it probably belongs more in 3/4, but either way it was just an upbeat melody. A fun little tune that lightens your spirits.`,
  },
  {
    slug: 'cello-miniature-no2-resonant',
    title: 'Cello Miniature No. 2 "Resonant"',
    subtitle: 'for solo cello',
    instrumentation: 'Cello',
    year: 2020,
    order: 6,
    featured: false,
    writeup: `This piece takes on a deeper feel that I quite enjoy exploring, especially on the cello which sounds so gorgeous on lower notes.
    
    As the melody repeats, I wanted to explore changing where the beat moves, so holding a note half a beat longer. It had the expected consequence of shortening the next note, which honestly sounded off to me, yet I was too attached to the idea of that lengthening variation to keep the melody the exact same.`,
  },
  {
    slug: 'fragment-for-solo-cello',
    title: 'Fragment',
    subtitle: 'for solo cello',
    instrumentation: 'Cello',
    year: 2021,
    order: 7,
    featured: false,
    writeup: `As a classical guitarist, I felt like a lot of my melodies that I explored while playing the cello felt classical or at least adjacent to an era around that time.
    
    This specific melody is one that came to me while just having fun warming up. I loved the harmonies of playing two notes myself, so just had fun with it.`,
  },
  {
    slug: 'skipping',
    title: 'Skipping',
    subtitle: '',
    instrumentation: 'Flute, Alto Saxophone, Tuba',
    year: 2024,
    order: 8,
    featured: false,
    writeup: `This piece was born of random melodies in my head, this time where I had no idea what instruments to use to bring them to life. I had an upper sound and a deeper melody, so decided on the instruments you see now for a full depth of expression.
    
    I named it skipping because it's another very light tune, one that makes me picture the notes (or players) skipping around.`,
  },
  {
    slug: 'a-brown-ballad',
    title: 'A Brown Ballad',
    subtitle: 'for flute',
    instrumentation: 'Flute',
    year: 2022,
    order: 9,
    featured: false,
    writeup: `This piece was written for a friend who plays the flute almost as a joke. I mentioned that I'd composed music before and we joked about me making someting for him to play.
    
    He mentioned things he had trouble with, so naturally I made a piece to perfectly compliment that and help him improve. Trills, random ascending scales, the whole shabang.
    
    That said, some of the melody is something I genuinely did think may sound good if he played it. The rest... well you'll see for yourself.`,
  },
  {
    slug: 'santiago-the-alchemist',
    title: 'Santiago',
    subtitle: 'Inspired by The Alchemist',
    instrumentation: 'Harp, Tuba, Flute, Cello, Viola',
    year: 2020,
    order: 10,
    featured: false,
    writeup: `In high school, we read The Alchemist. For an assignment, I chose to compose my own music inspired by Santiago and his journey to the pyramids.
    
    I started it off lightly, attempting to draw on sounds that I envisioned while reading. As the piece continues, the melody increases in complexity while maintaining the same core. I wanted to show rising tensions and complications in Santiago's journey as he discovers his own personal legend.`,
  },
  {
    slug: 'bass-riff-for-flute',
    title: 'Flute Etude No. 1 "The Bass Riff"',
    subtitle: 'A flute version of my bass riff',
    instrumentation: 'Treble Flute',
    year: 2022,
    order: 11,
    featured: false,
    writeup: `After showing my compositions to my friend who plays the flute, I wanted to make the bass riff playable to him. Thus, my bass riff makes a re-appearance as a flute etude, ported exactly over.`,
  },
  {
    slug: 'a-trumpets-promise-strings-aleotoric-composition',
    title: "A Trumpet's Promise",
    subtitle: 'An aleatoric composition from a class assignment',
    instrumentation: 'B♭ Trumpet',
    year: 2021,
    order: 12,
    featured: false,
    writeup: `In my grade 12 strings class (online... covid...), we learned about aleatoric compositions and were challenged to create our own.
    
    I rolled dice for the instrument, beats, and some of the notes, and then strung the rest together. The result, an interesting mix of sounds that somehow (hopefully?) work.`,
  },
];
