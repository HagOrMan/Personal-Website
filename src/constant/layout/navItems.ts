export type NavbarItem = {
  title: string;
  link?: string;
  dropdownItems?: {
    // Optional dropdown items (nested structure)
    title: string;
    link: string;
    description?: string;
  }[];
};

export const navbarItems: NavbarItem[] = [
  {
    title: 'Home',
    link: '/',
  },
  {
    title: 'Projects',
    link: '/projects',
    dropdownItems: [
      {
        title: 'Island Builder',
        link: '/island-builder',
        description:
          'Create islands with different biomes and connected cities!',
      },
      {
        title: 'MediSafe',
        link: '/medisafe',
        description:
          'Never take conflicting prescriptions again with Medisafe!',
      },
      {
        title: 'MonPoke',
        link: '/monpoke',
        description: 'Catch your favourite MonPokes using python and pygame',
      },
      {
        title: 'Piraten Kapern',
        link: '/piraten-kapern',
        description:
          'A fun implementation of a game with the same name using Java',
      },
    ],
  },
  {
    title: 'Experience',
    link: '/experience',
  },
  {
    title: 'About Me',
    link: '/about-me',
  },
  {
    title: 'Resume',
    link: '/resume',
  },
  {
    title: 'Contact',
    link: '/contact',
  },
];
