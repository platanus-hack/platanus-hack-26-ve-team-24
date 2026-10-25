import type { Metadata } from 'next';
import { Red_Hat_Mono, Schibsted_Grotesk } from 'next/font/google';
import './globals.css';

const schibsted = Schibsted_Grotesk({
  variable: '--font-schibsted',
  subsets: ['latin'],
});

const redHatMono = Red_Hat_Mono({
  variable: '--font-red-hat-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Constancia',
  description:
    'Constancia convierte una constancia de trabajo en una credencial que se prueba sola y muestra solo lo que su titular elige.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es" className={`${schibsted.variable} ${redHatMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
