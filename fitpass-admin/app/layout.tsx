import './globals.css';
import AppShell from '@/components/AppShell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FitPass Admin',
  description: 'FitPass administration dashboard',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 min-h-screen transition-colors duration-300">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
