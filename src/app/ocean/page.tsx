import OceanSunriseScene from '@/components/backgrounds/Sunrise';
import { OceanInfoCard } from '@/components/ocean/OceanInfoCard';

/**
 * Fullscreen showcase of the ocean sunrise scene.
 */
export default function OceanPage() {
  return (
    <div className='h-screen'>
      <main className='bg-background fixed inset-0 h-dvh w-screen overflow-hidden'>
        {/* OceanInfoCard's own heading only renders once its dialog is
            opened, so the document needs a real h1 present from the start. */}
        <h1 className='sr-only'>Ocean</h1>
        <OceanSunriseScene />
        <OceanInfoCard />
      </main>
    </div>
  );
}
