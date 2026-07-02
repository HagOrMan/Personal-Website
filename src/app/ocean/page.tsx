import OceanSunriseScene from '@/components/backgrounds/Sunrise';

/**
 * Fullscreen showcase of the ocean sunrise scene.
 */
export default function OceanPage() {
  return (
    <div className='h-screen'>
      <main className='bg-background fixed inset-0 h-dvh w-screen overflow-hidden'>
        <OceanSunriseScene />
      </main>
    </div>
  );
}
