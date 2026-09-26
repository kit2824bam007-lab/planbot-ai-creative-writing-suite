import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: 'resizes-content',
};

export const metadata: Metadata = {
  title: 'DreamInk AI — AI Creative Writing, Poem & Story Studio',
  description: 'AI creative writing platform with classical Tamil forms, ChatGPT-style streaming chat, Tanglish translanguaging, and social media card generator.',
  keywords: ['DreamInk AI', 'AI Poem Generator', 'Tamil Classical Poetry', 'Venpa', 'Kurinji', 'Story Generator', 'Tanglish to Tamil', 'Social Post Generator'],
  authors: [{ name: 'DreamInk Team' }],
  openGraph: {
    title: 'DreamInk AI — AI Creative Writing, Poem & Story Studio',
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
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
