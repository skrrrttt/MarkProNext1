import type { Metadata, Viewport } from 'next';
import { DM_Sans, Space_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  title: 'MarkPro - Field Service Management',
  description: 'Pavement marking job management for field and office teams',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MarkPro',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f0f1a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans">
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1a1a2e',
                color: '#fff',
                border: '1px solid #2d2d44',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
