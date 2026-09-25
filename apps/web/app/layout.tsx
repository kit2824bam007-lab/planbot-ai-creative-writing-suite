import type { Metadata } from 'next';
import { Inter, Noto_Sans_Tamil, Newsreader } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
  adjustFontFallback: false,
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-tamil',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PlanBot AI — Full AI Poem & Story Generator',
  description: 'AI creative writing platform with classical Tamil forms, ChatGPT-style streaming chat, Tanglish translanguaging, and social media card generator.',
  keywords: ['AI Poem Generator', 'Tamil Classical Poetry', 'Venpa', 'Kurinji', 'Story Generator', 'Tanglish to Tamil', 'Social Post Generator'],
  authors: [{ name: 'PlanBot Team' }],
  openGraph: {
    title: 'PlanBot AI — Full AI Poem & Story Generator',
    description: 'Compose sublime poetry and gripping stories in Tamil, English, and beyond.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${newsreader.variable} ${notoSansTamil.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
