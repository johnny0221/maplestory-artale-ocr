import { Geist, Geist_Mono } from 'next/font/google';
import Image from 'next/image';
import ScreenCapture from '../components/ScreenCapture';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function Home() {
  return (
    <div
      className={`${geistSans.className} ${geistMono.className} min-h-screen bg-gray-50 dark:bg-gray-900`}>
      {/* Header */}
      <header className='border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Image
                src='/next.svg'
                alt='Next.js Logo'
                width={100}
                height={20}
                className='dark:invert'
                priority
              />
              <span className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                OCR Screenshot Comparison
              </span>
            </div>
            <a
              href='https://github.com/yourusername/maple-story-ocr'
              target='_blank'
              rel='noopener noreferrer'
              className='text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'>
              <Image
                src='/github.svg'
                alt='GitHub'
                width={24}
                height={24}
                className='dark:invert'
              />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='bg-white dark:bg-gray-950 rounded-lg shadow'>
          <div className='p-6'>
            <div className='mb-6'>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
                MapleStory OCR Tool
              </h1>
              <p className='text-gray-600 dark:text-gray-400 font-[family-name:var(--font-geist-mono)] text-sm'>
                Capture and compare text from your game screen using OCR
                technology
              </p>
            </div>

            <ScreenCapture />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className='border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 mt-auto'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex justify-center items-center space-x-6 text-sm text-gray-600 dark:text-gray-400'>
            <a
              href='https://nextjs.org/docs'
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-gray-900 dark:hover:text-gray-100'>
              Documentation
            </a>
            <span>•</span>
            <a
              href='https://github.com/tesseract-ocr/tesseract'
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-gray-900 dark:hover:text-gray-100'>
              Tesseract OCR
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
