import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Home Restaurant',
  description: 'Book a seat at intimate dinners cooked by verified home chefs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
