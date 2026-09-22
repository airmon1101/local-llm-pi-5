import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PiLLM — Private Local AI Appliance',
  description: 'Your AI. Your Raspberry Pi. Your Data. Running locally on Raspberry Pi 5.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
