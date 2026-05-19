export const PROJECT_TAGS = {
  'No AI': {
    description:
      'AI is important, but these projects show how I think and structure my code without it',
  },
  Personal: { description: 'A personal side project' },
  Work: { description: 'Built professionally or for a client' },
  'At Scale': { description: 'A project that makes an impact at scale' },
  'Hackathon Winner': { description: 'A winning project at a hackathon!' },
} as const;

export type ProjectTag = keyof typeof PROJECT_TAGS;

export type TProjectShowcase = {
  name: string;
  description: string;
  displayAsset?: string; // path to asset to display above name
  tags?: ProjectTag[];
};

export type TProjectShowcaseCard = {
  project: TProjectShowcase;
  index: number; // index at which this project is being displayed.
  className?: string;
};
