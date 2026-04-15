import './globals.css';
import AppShell from '@/components/AppShell';

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
