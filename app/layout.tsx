import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PesaBooks — The AI bookkeeper in your WhatsApp',
  description:
    'PesaBooks turns your M-Pesa payments into legal KRA invoices and proper books — automatically, over WhatsApp. Built for Kenyan SMEs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
