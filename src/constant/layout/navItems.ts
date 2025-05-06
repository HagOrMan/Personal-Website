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
        title: 'Hatch Booking System',
        link: '/projects/hatch-booking-system',
        description: 'Custom booking system used by McMaster Engineering!',
      },
      {
        title: 'Island Builder',
        link: '/projects/island-builder',
        description:
          'Create islands with different biomes and connected cities!',
      },
      {
        title: 'MediSafe',
        link: '/projects/medisafe',
        description:
          'Never take conflicting prescriptions again with Medisafe!',
      },
      {
        title: 'MonPoke',
        link: '/projects/monpoke',
        description: 'Catch your favourite MonPokes using python and pygame',
      },
      {
        title: 'Piraten Kapern',
        link: '/projects/piraten-kapern',
        description:
          'A fun implementation of a game with the same name using Java',
      },
      {
        title: 'Infinity Chess',
        link: '/projects/infinity-chess',
        description: 'A Chess variant where pieces can wrap around the walls',
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
