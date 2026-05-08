export type TProjectShowcase = {
  name: string;
  description: string;
  displayAsset: string; // path to asset to display above name
};

export type TProjectShowcaseCard = {
  project: TProjectShowcase;
  index: number; // index at which this project is being displayed.
  className?: string;
};
