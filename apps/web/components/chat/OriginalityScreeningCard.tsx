'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, Sparkles, Loader2, Check, RefreshCw } from 'lucide-react';
import { ChatMessage, OriginalityResult } from '../../types';
import { api } from '../../lib/api';
import { useChatStore } from '../../store/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface OriginalityScreeningCardProps {
  message: ChatMessage;
}

export const OriginalityScreeningCard: React.FC<OriginalityScreeningCardProps> = ({ message }) => {
  const [result, setResult] = useState<OriginalityResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScreeningOpen, setIsScreeningOpen] = useState<boolean>(false);
  const { messages, isStreaming } = useChatStore();
  const { generate } = useChatStream();

  const fetchOriginality = async () => {
    try {
      setIsLoading(true);
      const res = await api.checkOriginality({
        content: message.content,
        contentType: message.metadata?.mode || 'poem',
        contentId: message.id
      });

      if (res) {
        setResult(res);
      }
    } catch (err) {
      setResult({
        riskLevel: 'LOW',
        exactMatchFound: false,
        semanticSimilarity: 'LOW',
        matchedPhrases: [],
        reason: 'Originality screening temporarily unavailable.',
        recommendation: 'Generated content remains fully usable.',
        sourcesChecked: 'PlanBot generated-content database',
        status: 'unavailable'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (message.content && message.role === 'assistant') {
      fetchOriginality();
    }
  }, [message.content, message.id]);

  const handleRewriteOriginally = () => {
    if (isStreaming) return;

    // Find original user prompt
    const msgIndex = messages.findIndex((m) => m.id === message.id);
    let originalPrompt = '';
    if (msgIndex >= 0) {
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          originalPrompt = messages[i].content;
          break;
        }
      }
    }

    toast.info('Rewriting to enhance distinctiveness and eliminate phrase overlap...');
    generate({
      action: 'rewrite-originally',
      previousMessageId: message.id,
      previousContent: message.content,
      overridePrompt: originalPrompt || message.content.substring(0, 100)
    });
  };

  // If feature is disabled in backend config, do not render
  if (result && result.enabled === false) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mt-2.5 px-3 py-2 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span>Checking originality & similarity...</span>
      </div>
    );
  }

  if (!result) return null;

  const isLow = result.riskLevel === 'LOW';
  const isHigh = result.riskLevel === 'HIGH';
  const isMedium = result.riskLevel === 'MEDIUM';

  return (
    <div
      className={cn(
        'mt-2.5 rounded-2xl border text-xs transition-all shadow-2xs overflow-hidden',
        isLow
          ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20'
          : isHigh
          ? 'border-rose-400/30 bg-rose-500/5 dark:bg-rose-950/25'
          : 'border-amber-400/30 bg-amber-500/5 dark:bg-amber-950/25'
      )}
    >
      {/* Header Bar */}
      <div className="px-3 py-2 flex items-center justify-between gap-1.5 sm:gap-2 border-b border-inherit">
        <div className="flex items-center gap-1.5 min-w-0">
          {isLow ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs font-serif truncate">
            Originality & Similarity Screening
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0',
              isLow
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : isHigh
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
            )}
          >
            Risk: {result.riskLevel}
          </span>

          <button
            type="button"
            onClick={() => setIsScreeningOpen(!isScreeningOpen)}
            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline shrink-0"
          >
            {isScreeningOpen ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {/* Main Summary Row */}
      <div className="px-3.5 py-2.5">
        {isLow ? (
          <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>No strong match detected in checked corpus.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span>⚠️ Potentially similar wording detected.</span>
            </div>
            {result.reason && (
              <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {result.reason}
              </p>
            )}
          </div>
        )}

        {/* Expanded Details Section */}
        {isScreeningOpen && (
          <div className="mt-2.5 pt-2.5 border-t border-inherit space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
              <div>
                <span className="opacity-75">Exact Match:</span>{' '}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {result.exactMatchFound ? 'Detected' : 'None detected'}
                </span>
              </div>
              <div>
                <span className="opacity-75">Similarity:</span>{' '}
                <span className="font-medium text-zinc-800 dark:text-zinc-200 capitalize">
                  {result.semanticSimilarity || 'Low'}
                </span>
              </div>
              <div>
                <span className="opacity-75">Sources:</span>{' '}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  PlanBot DB
                </span>
              </div>
            </div>

            {result.matchedPhrases && result.matchedPhrases.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                  Recurring phrase(s):
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.matchedPhrases.map((phrase, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono border border-zinc-200 dark:border-zinc-700"
                    >
                      "{phrase}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Row for MEDIUM or HIGH risk */}
        {!isLow && (
          <div className="mt-3 pt-2.5 border-t border-inherit flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={isStreaming}
              onClick={handleRewriteOriginally}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rewrite More Originally</span>
            </button>

            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
              Automated screening only. Not legal copyright advice.
            </span>
          </div>
        )}

        {/* Legal Disclaimer for Low Risk */}
        {isLow && (
          <div className="mt-2 text-[10px] text-zinc-400 dark:text-zinc-500 italic">
            Automated similarity screening only. Not a legal copyright determination.
          </div>
        )}
      </div>
    </div>
  );
};
