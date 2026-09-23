import { WaveSprayLazy } from '@/components/animated-fun/WaveSprayLazy';
import { SparkleField } from '@/components/backgrounds/SparkleField';
import { ContactForm } from '@/components/contact/ContactForm';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Contact() {
  return (
    <main className='bg-background page-shell relative overflow-hidden'>
      <div className='pointer-events-none absolute inset-0'>
        <SparkleField />
      </div>

      <div className='relative'>
        <PageHeader
          title='Contact'
          description='Want to work together or just want to say hi? Send me a message below. Please no more "we will help you with your SEO" emails :sob:'
          decoration={
            <div className='size-24 overflow-hidden rounded-2xl md:size-28'>
              <WaveSprayLazy
                colorStart='--tw-color-lush-800'
                colorEnd='--tw-color-lush-400'
              />
            </div>
          }
          fadeDecoration={true}
        />

        <ContactForm />
      </div>
    </main>
  );
}
