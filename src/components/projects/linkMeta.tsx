import * as React from 'react';

import { Download, ExternalLink, FileText } from 'lucide-react';

import { GitHubGlyph } from '@/components/icons/GitHubGlyph';
import type { ProjectLinkKind } from '@/types/projects/ProjectShowcase';

/**
 * The two props any of these are ever handed — kept explicit rather than
 * pinned to `typeof SomeLucideIcon`, so a brand mark that isn't a lucide icon
 * (GitHubGlyph, since lucide deprecated theirs) sits in this table too.
 */
export type LinkIcon = React.ComponentType<{
  className?: string;
  'aria-hidden'?: boolean;
}>;

/**
 * Label and icon per link kind, in its own module because two places render
 * project links now: the cards on /projects and the ribbon on the homepage.
 *
 * Worth a file of its own rather than an export from ProjectSpotlightCard —
 * importing a const from that module would have pulled the whole card, and
 * every component it reaches, into the homepage bundle for the sake of four
 * strings.
 */
export const LINK_META: Record<
  ProjectLinkKind,
  { label: string; Icon: LinkIcon }
> = {
  github: { label: 'on GitHub', Icon: GitHubGlyph },
  demo: { label: 'Try it', Icon: ExternalLink },
  article: { label: 'write-up', Icon: FileText },
  download: { label: 'download', Icon: Download },
};
