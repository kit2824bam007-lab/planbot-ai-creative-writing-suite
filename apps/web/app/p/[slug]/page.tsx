import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Sparkles, ArrowLeft, Share2, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getPoem(slug: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/poems/p/${slug}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const poem = await getPoem(params.slug);
  if (!poem) {
    return { title: 'Poem Not Found — PlanBot AI' };
  }

  const excerpt = poem.content.slice(0, 150).replace(/\n/g, ' ');
  return {
    title: `${poem.prompt} — PlanBot AI`,
    description: excerpt,
    openGraph: {
      title: `${poem.prompt} — PlanBot AI`,
      description: excerpt,
      type: 'article'
    }
  };
}

export default async function PublicPoemPage({
  params
}: {
  params: { slug: string };
}) {
  const poem = await getPoem(params.slug);

  if (!poem) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Composition Not Found
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          This piece may have been removed or the link is incorrect.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-primary rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to PlanBot</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Compose with PlanBot AI</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Eye className="w-3.5 h-3.5" />
            <span>{poem.viewCount || 1} views</span>
          </div>
        </div>

        {/* Poem Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 sm:p-12 shadow-xl space-y-6">
          {/* Header */}
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                {poem.poemType || poem.mode}
              </span>
              {poem.language === 'ta' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-full">
                  தமிழ்
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              "{poem.prompt}"
            </h1>
          </div>

          {/* Content */}
          <div className="text-base text-zinc-800 dark:text-zinc-200 poem-content leading-loose font-serif">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {poem.content}
            </ReactMarkdown>
          </div>

          {/* Footer watermark & CTA */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Created with PlanBot AI</span>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 transition-all shadow-sm"
            >
              <span>Create Your Own</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
