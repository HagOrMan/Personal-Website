import { homeExperiences } from '@/lib/home/showcase';

import { ExperienceRibbon } from './ExperienceRibbon';
import { ProjectsRibbon } from './ProjectsRibbon';

/**
 * The homepage ribbon: where I've worked, then what I've built.
 *
 * The only thing this composes is the running index, and it's the only place
 * that knows the two sections share one. Rows alternate on that number rather
 * than on their position within a section, so the zig-zag carries straight
 * through the heading between them and the page reads as one ribbon instead
 * of two stacks that each open on the left. See ribbonSide().
 */
export function HomeShowcase() {
  return (
    <>
      <ExperienceRibbon indexOffset={0} />
      <ProjectsRibbon indexOffset={homeExperiences.length} />
    </>
  );
}
