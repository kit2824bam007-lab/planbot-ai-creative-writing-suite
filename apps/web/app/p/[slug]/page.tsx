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
    <div className="min-h-screen bg-transparent py-6 sm:py-12 px-3 sm:px-4 select-none">
      <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
        {/* Navigation & Brand */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-xl bg-white dark:bg-white/95 p-1 border border-stone-200/60 dark:border-white/20 shadow-2xs flex items-center justify-center">
              <img
                src="/logo-transparent.png"
                alt="PlanBot"
                width={20}
                height={20}
                className="w-full h-full max-w-[20px] max-h-[20px] object-contain"
              />
            </div>
            <span className="font-serif">PlanBot Literary Studio</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Eye className="w-3.5 h-3.5" />
            <span>{poem.viewCount || 1} views</span>
          </div>
        </div>

        {/* Poem Card */}
        <div className="bg-white/95 dark:bg-[#181622]/92 border border-[#E8E2D9] dark:border-[#282534] rounded-3xl p-5 sm:p-10 md:p-14 shadow-soft-xl space-y-6 sm:space-y-8 backdrop-blur-md">
          {/* Header */}
          <div className="border-b border-[#EAE3DA] dark:border-[#262330] pb-5 sm:pb-6 space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-full">
                {poem.poemType || poem.mode}
              </span>
              {poem.language === 'ta' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md">
                  தமிழ்
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
              "{poem.prompt}"
            </h1>
          </div>

          {/* Content */}
          <div className="text-base sm:text-xl text-zinc-800 dark:text-zinc-100 poem-content leading-relaxed sm:leading-loose font-serif">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {poem.content}
            </ReactMarkdown>
          </div>

          {/* Footer watermark & CTA */}
          <div className="border-t border-[#EAE3DA] dark:border-[#262330] pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Created with PlanBot AI</span>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#6B5488] hover:bg-[#5E477A] text-white shadow-soft-sm hover:opacity-95 transition-all"
            >
              <span>Compose Your Own</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
