import type { Metadata } from 'next';
import { Bodoni_Moda, Hanken_Grotesk } from 'next/font/google';
import { ThemeScript } from '@/components/atoms/theme-script';
import './globals.css';

/**
 * Display + body fonts, bound to the --serif / --sans token variables so the
 * design tokens remain the single styling reference.
 */
const serif = Bodoni_Moda({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});
const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ratatouille — Anyone can cook',
  description: 'Anyone can cook. Book a seat at intimate dinners cooked by verified home chefs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
