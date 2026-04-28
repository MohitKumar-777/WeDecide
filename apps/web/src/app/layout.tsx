import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Sidebar from '@/components/Sidebar';
import MainContainer from '@/components/MainContainer';
import SplashAnimation from '@/components/SplashAnimation';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'WeDecide — India\'s Social Prediction Platform',
  description:
    'Predict on Cricket, Bollywood, Politics & more. Earn status. Beat the crowd. WeDecide — where accuracy is currency.',
  keywords: ['predictions', 'cricket', 'bollywood', 'politics', 'India', 'social'],
  openGraph: {
    title: 'WeDecide',
    description: 'Predict on what matters. Earn status.',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WeDecide',
    description: 'India\'s social prediction platform',
  },
};

import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SplashAnimation />
        <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' } }} />
        <Providers>
          <Suspense fallback={<div style={{ width: '280px', flexShrink: 0, borderRight: '1px solid var(--border)' }} />}>
            <Sidebar />
          </Suspense>
          <MainContainer>{children}</MainContainer>
        </Providers>
      </body>
    </html>
  );
}
