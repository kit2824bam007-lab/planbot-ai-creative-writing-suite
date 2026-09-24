'use client';

import React, { useState } from 'react';
import {
  Copy,
  Download,
  RotateCcw,
  Play,
  Sparkles,
  Heart,
  Smile,
  PenTool,
  TrendingDown,
  Maximize2,
  Share2,
  Check
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { ChatMessage } from '../../types';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface ActionButtonsRowProps {
  message: ChatMessage;
}

export const ActionButtonsRow: React.FC<ActionButtonsRowProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const { isStreaming, setSelectedMessageForShare, setIsShareModalOpen, activeActionChip, messages } = useChatStore();
  const { generate } = useChatStream();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([message.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planbot-${message.metadata?.poemType || 'composition'}-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded composition as .txt');
  };

  const handleAction = (actionName: string) => {
    if (isStreaming) return;

    // Find previous user prompt in message chain
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

    generate({
      action: actionName,
      previousMessageId: message.id,
      previousContent: message.content,
      overridePrompt: originalPrompt || message.content,
      mediaContext: message.metadata?.mediaContext || undefined
    });
  };

  const handleShareClick = () => {
    setSelectedMessageForShare(message);
    setIsShareModalOpen(true);
  };

  return (
    <div className="pt-2 mt-1 space-y-2">
      {/* Active action chip */}
      {isStreaming && activeActionChip && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-semibold rounded-full animate-pulse">
          {activeActionChip}
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center gap-1 text-zinc-500 dark:text-zinc-400">
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          title="Download .txt"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        <span className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

        <button
          type="button"
          disabled={isStreaming}
          onClick={() => handleAction('regenerate')}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
            isStreaming && 'opacity-50 cursor-not-allowed'
          )}
          title="Completely fresh take with zero line reuse"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Regenerate</span>
        </button>

        <button
          type="button"
          disabled={isStreaming}
          onClick={() => handleAction('continue')}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
            isStreaming && 'opacity-50 cursor-not-allowed'
          )}
          title="Pick up from where it ended"
        >
          <Play className="w-3 h-3" />
          <span>Continue</span>
        </button>

        <button
          type="button"
          disabled={isStreaming}
          onClick={() => handleAction('more-creative')}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
            isStreaming && 'opacity-50 cursor-not-allowed'
          )}
          title="Richer imagery and metaphor"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>More Creative</span>
        </button>

        <button
          type="button"
          disabled={isStreaming}
          onClick={() => handleAction('more-emotional')}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
            isStreaming && 'opacity-50 cursor-not-allowed'
          )}
          title="Deep emotional resonance"
        >
          <Heart className="w-3 h-3 text-rose-500" />
          <span>More Emotional</span>
        </button>

        <button
          type="button"
          disabled={isStreaming}
          onClick={() => handleAction('more-humorous')}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
            isStreaming && 'opacity-50 cursor-not-allowed'
          )}
          title="Playful wit and humor"
        >
          <Smile className="w-3 h-3 text-emerald-500" />
          <span>Humorous</span>
        </button>

        <button
          type="button"
          disabled={isStreaming}
          onClick={() => handleAction('simpler')}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
            isStreaming && 'opacity-50 cursor-not-allowed'
          )}
          title="Simpler words and everyday diction"
        >
          <PenTool className="w-3 h-3" />
          <span>Simpler</span>
        </button>

        <button
          type="button"
          disabled={isStreaming}
          onClick={() => handleAction('shorter')}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
            isStreaming && 'opacity-50 cursor-not-allowed'
          )}
          title="Condensed to ~half length"
        >
          <TrendingDown className="w-3 h-3" />
          <span>Shorter</span>
        </button>

        <button
          type="button"
          disabled={isStreaming}
          onClick={() => handleAction('longer')}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
            isStreaming && 'opacity-50 cursor-not-allowed'
          )}
          title="Extended to ~double length"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Longer</span>
        </button>

        <span className="w-[1px] h-3.5 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

        <button
          type="button"
          onClick={handleShareClick}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="Share as Canvas Image Card"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};
