'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Download,
  Copy,
  MessageCircle,
  Instagram,
  Twitter,
  Check,
  Sparkles,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { CARD_TEMPLATES, renderCardToCanvas } from '../../lib/cardRenderer';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export const ShareModal: React.FC = () => {
  const {
    isShareModalOpen,
    setIsShareModalOpen,
    selectedMessageForShare,
    mode
  } = useChatStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('midnight-glow');
  const [aspectRatio, setAspectRatio] = useState<'square' | 'story'>('square');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto set aspect ratio based on platform metadata if present
  useEffect(() => {
    if (selectedMessageForShare?.metadata?.platform) {
      const p = selectedMessageForShare.metadata.platform.toLowerCase();
      if (p.includes('story') || p.includes('status')) {
        setAspectRatio('story');
      } else {
        setAspectRatio('square');
      }
    }
  }, [selectedMessageForShare]);

  // Render card on canvas when template or aspect ratio changes
  useEffect(() => {
    if (!isShareModalOpen || !selectedMessageForShare || !canvasRef.current) return;

    let isCancelled = false;
    setIsRendering(true);

    renderCardToCanvas(canvasRef.current, {
      text: selectedMessageForShare.content,
      templateId: selectedTemplateId,
      aspectRatio,
      themeTitle: selectedMessageForShare.metadata?.poemType || mode
    })
      .then((dataUrl) => {
        if (!isCancelled) {
          setPreviewDataUrl(dataUrl);
          setIsRendering(false);
        }
      })
      .catch((err) => {
        console.error('Canvas render error:', err);
        setIsRendering(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isShareModalOpen, selectedMessageForShare, selectedTemplateId, aspectRatio, mode]);

  if (!isShareModalOpen || !selectedMessageForShare) return null;

  const handleClose = () => {
    setIsShareModalOpen(false);
    setStep(1);
  };

  const handleDownloadPng = () => {
    if (!previewDataUrl) return;
    const link = document.createElement('a');
    link.href = previewDataUrl;
    link.download = `planbot-${selectedTemplateId}-${Date.now()}.png`;
    link.click();
    toast.success('Downloaded image card!');
  };

  const handleCopyCaption = () => {
    const textToCopy = `${selectedMessageForShare.content}\n\n— Composed with ✨ PlanBot AI`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCaption(true);
    toast.success('Caption copied with hashtags!');
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  // WhatsApp Share Intent
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `"${selectedMessageForShare.content}"\n\n✨ Composed via PlanBot AI`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Twitter / X Intent
  const handleTwitterShare = () => {
    const text = encodeURIComponent(
      `${selectedMessageForShare.content.substring(0, 200)}...\n\n#PlanBotAI #Poetry`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  // Instagram Share via Web Share API
  const handleInstagramShare = async () => {
    if (previewDataUrl && navigator.share && navigator.canShare) {
      try {
        const blob = await (await fetch(previewDataUrl)).blob();
        const file = new File([blob], 'planbot-card.png', { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'PlanBot AI Composition',
            text: selectedMessageForShare.content
          });
          return;
        }
      } catch (err) {
        // Fallback below
      }
    }

    // Desktop fallback: Download image + copy caption
    handleDownloadPng();
    handleCopyCaption();
    toast.info('Card downloaded and caption copied for Instagram!');
  };

  const templatesList = Object.values(CARD_TEMPLATES);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2.5 sm:p-4 animate-fade-in">
      {/* Hidden offscreen canvas for rendering */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-[#181622]/95 backdrop-blur-md border border-[#E8E2D9] dark:border-[#282534] rounded-2xl sm:rounded-3xl shadow-soft-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#EAE3DA] dark:border-[#262330] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-1.5 rounded-lg hover:bg-warm-100 dark:hover:bg-zinc-800 text-zinc-500 mr-1"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 font-serif">
              {step === 1 ? 'Design Social Card' : 'Share Composition'}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-stone-200/50 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {step === 1 ? (
            /* STEP 1: Template Selection & Preview */
            <div className="space-y-4 sm:space-y-5">
              {/* Aspect Ratio Switcher */}
              <div className="flex items-center justify-between bg-warm-100/80 dark:bg-zinc-900/80 p-1 rounded-xl sm:rounded-2xl border border-stone-200/50 dark:border-zinc-800 gap-1">
                <button
                  type="button"
                  onClick={() => setAspectRatio('square')}
                  className={cn(
                    'flex-1 py-2 px-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-all text-center truncate',
                    aspectRatio === 'square'
                      ? 'bg-white dark:bg-zinc-800 text-primary shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  )}
                >
                  Square Post (1:1)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('story')}
                  className={cn(
                    'flex-1 py-2 px-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-all text-center truncate',
                    aspectRatio === 'story'
                      ? 'bg-white dark:bg-zinc-800 text-primary shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  )}
                >
                  Story / Status (9:16)
                </button>
              </div>

              {/* Live Preview Display */}
              <div className="flex items-center justify-center p-3 sm:p-4 bg-warm-50 dark:bg-zinc-900/40 border border-stone-200/50 dark:border-zinc-800/60 rounded-xl sm:rounded-2xl min-h-[190px] sm:min-h-[220px]">
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Card Preview"
                    className={cn(
                      'rounded-xl shadow-lg border border-zinc-200/50 object-contain transition-all',
                      aspectRatio === 'story' ? 'max-h-72 w-auto' : 'max-h-60 w-auto'
                    )}
                  />
                ) : (
                  <div className="text-xs text-zinc-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin text-primary" />
                    Rendering canvas card...
                  </div>
                )}
              </div>

              {/* 8 Live-Rendered Template Thumbnails */}
              <div>
                <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">
                  Select Visual Template (8 Curated Themes)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {templatesList.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all h-20 relative overflow-hidden',
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 shadow-md scale-[1.02]'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        )}
                        style={{
                          background:
                            tpl.bgType === 'solid'
                              ? tpl.bgColors[0]
                              : `linear-gradient(${tpl.gradientAngle || 135}deg, ${tpl.bgColors.join(', ')})`,
                          color: tpl.textColor
                        }}
                      >
                        <span className="text-[11px] font-bold line-clamp-1">{tpl.name}</span>
                        <span className="text-[9px] opacity-75">✨ PlanBot</span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: Share Channels */
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Ready to Inspire the World
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select your destination platform or export the high-res card.
                </p>
              </div>

              {/* Share Channels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-left group"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 transition-colors">
                      WhatsApp Status / Chat
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Direct share via wa.me link
                    </div>
                  </div>
                </button>

                {/* Instagram */}
                <button
                  type="button"
                  onClick={handleInstagramShare}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-pink-500/50 hover:bg-pink-50/50 dark:hover:bg-pink-950/20 transition-all text-left group"
                >
                  <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-600 shrink-0">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-pink-600 transition-colors">
                      Instagram Stories / Feed
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Native share sheet or instant copy
                    </div>
                  </div>
                </button>

                {/* Twitter / X */}
                <button
                  type="button"
                  onClick={handleTwitterShare}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-sky-500/50 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition-all text-left group"
                >
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 shrink-0">
                    <Twitter className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-sky-600 transition-colors">
                      Twitter / 𝕏 Post
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Tweet intent with hashtags
                    </div>
                  </div>
                </button>

                {/* Copy Caption */}
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="flex items-center gap-3 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                    {copiedCaption ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-primary transition-colors">
                      Copy Caption & Text
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Includes poem & PlanBot credit
                    </div>
                  </div>
                </button>
              </div>

              {/* Download PNG Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#6B5488] hover:bg-[#5E477A] text-white font-semibold text-sm shadow-soft-sm hover:opacity-95 active:scale-[0.99] transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download High-Res PNG Image</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-[#EAE3DA] dark:border-[#262330] bg-[#FAF8F5]/80 dark:bg-[#15141A]/80 flex items-center justify-between gap-3">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-2"
              >
                ⏭️ Skip — share as text only
              </button>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-[#6B5488] hover:bg-[#5E477A] rounded-xl shadow-soft-sm transition-all shrink-0"
              >
                <span>Continue to Share</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 py-2"
            >
              ← Back to template designs
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
