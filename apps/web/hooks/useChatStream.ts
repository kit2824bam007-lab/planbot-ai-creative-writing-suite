'use client';

import { useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useChatStream() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    currentConversationId,
    mode,
    promptText,
    poemType,
    genre,
    tone,
    length,
    language,
    platform,
    style,
    format,
    setPromptText,
    addMessage,
    isStreaming,
    setIsStreaming,
    streamingContent,
    setStreamingContent,
    appendStreamingChunk,
    setStreamingMetadata,
    setActiveActionChip,
    setIsLimitModalOpen,
    addConversation,
    setQuota
  } = useChatStore();

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setActiveActionChip(null);
  };

  const generate = async (options?: {
    action?: string;
    previousMessageId?: string;
    previousContent?: string;
    overridePrompt?: string;
    mediaContext?: any;
  }) => {
    if (isStreaming) return;

    const action = options?.action;
    let userPrompt = options?.overridePrompt || promptText;
    if (action && !userPrompt.trim()) {
      userPrompt = options?.previousContent || 'action';
    }

    const state = useChatStore.getState();
    const currentMedia = state.uploadedMedia;

    if (!action && !userPrompt.trim() && !currentMedia) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // If standard generation, add user message to chat UI
    if (!action) {
      const displayContent = userPrompt.trim()
        ? userPrompt
        : `[Uploaded ${currentMedia?.type}: ${currentMedia?.fileName}]`;

      addMessage({
        id: `usr_${Date.now()}`,
        role: 'user',
        content: displayContent,
        createdAt: new Date()
      });
      setPromptText('');
    } else {
      // Set regenerating chip text
      const actionLabel = action.replace('-', ' ');
      setActiveActionChip(`🔄 Performing ${actionLabel}...`);
    }

    setIsStreaming(true);
    setStreamingContent('');

    try {
      const anonId = typeof window !== 'undefined' ? localStorage.getItem('planbot_anon_id') || 'anon_guest' : 'anon_guest';
      const timezone = typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Anon-Id': anonId,
        'X-Timezone': timezone
      };

      const currentMode = state.mode;
      const currentPoemType = state.poemType;
      const currentGenre = state.genre;
      const currentTone = state.tone;
      const currentLength = state.length;
      const currentLanguage = state.language;
      const currentPlatform = state.platform;
      const currentStyle = state.style;
      const currentFormat = state.format;

      const mediaPayload = currentMedia ? {
        type: currentMedia.type,
        mimeType: currentMedia.mimeType,
        data: currentMedia.data,
        fileName: currentMedia.fileName,
        fileSize: currentMedia.fileSize,
        duration: currentMedia.duration
      } : undefined;

      const response = await fetch(`${API_BASE_URL}/api/chat/generate`, {
        method: 'POST',
        headers,
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          prompt: userPrompt,
          conversationId: currentConversationId || undefined,
          mode: currentMode,
          poemType: currentPoemType,
          genre: currentGenre,
          tone: currentTone,
          length: currentLength,
          language: currentLanguage,
          platform: currentPlatform,
          style: currentStyle,
          format: currentFormat,
          action,
          previousMessageId: options?.previousMessageId,
          previousContent: options?.previousContent,
          originalPrompt: options?.overridePrompt || userPrompt,
          media: mediaPayload,
          mediaContext: options?.mediaContext || state.mediaContext || undefined
        })
      });

      // Update quota headers
      const remainingHeader = response.headers.get('X-Remaining-Today');
      const limitHeader = response.headers.get('X-Daily-Limit');
      const resetsAtHeader = response.headers.get('X-Resets-At');
      const planHeader = response.headers.get('X-User-Plan');

      if (planHeader === 'PRO') {
        setQuota({
          limit: null,
          used: null,
          remaining: null,
          resetsAt: null,
          plan: 'PRO',
          isPro: true,
          isAnonymous: false
        });
      } else if (remainingHeader && limitHeader) {
        const limitVal = parseInt(limitHeader, 10) || 10;
        const remainingVal = parseInt(remainingHeader, 10) || 0;
        setQuota({
          limit: limitVal,
          used: Math.max(0, limitVal - remainingVal),
          remaining: remainingVal,
          resetsAt: resetsAtHeader,
          plan: 'FREE',
          isPro: false,
          isAnonymous: false
        });
      }

      if (response.status === 429) {
        setIsLimitModalOpen(true);
        setIsStreaming(false);
        setActiveActionChip(null);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 503 || errorData?.error?.code === 'AI_UNAVAILABLE') {
          toast.error('AI generation is temporarily unavailable. Please try again shortly.');
        } else if (errorData?.upgradeRequired || errorData?.error === 'FREE_LIMIT_REACHED') {
          setIsLimitModalOpen(true);
        } else {
          toast.error(errorData?.error?.message || errorData?.message || 'Generation failed. Please try again.');
        }
        setIsStreaming(false);
        setActiveActionChip(null);
        return;
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      let finalMetadata: any = null;
      let finalMessageId = `msg_${Date.now()}`;
      let finalConvId = currentConversationId;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = 'message';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.replace('event:', '').trim();
          } else if (line.startsWith('data:')) {
            const rawData = line.replace('data:', '').trim();
            if (!rawData) continue;

            try {
              const parsed = JSON.parse(rawData);

              if (currentEvent === 'token') {
                accumulatedText += parsed.text;
                appendStreamingChunk(parsed.text);
              } else if (currentEvent === 'retry') {
                toast.info(parsed.message || 'Polishing meter and structure...');
              } else if (currentEvent === 'replace') {
                accumulatedText = parsed.text;
                setStreamingContent(parsed.text);
              } else if (currentEvent === 'done') {
                accumulatedText = parsed.content || accumulatedText;
                finalMetadata = parsed.metadata;
                if (finalMetadata?.mediaContext) {
                  state.setMediaContext(finalMetadata.mediaContext);
                }
                if (parsed.messageId) finalMessageId = parsed.messageId;
                if (parsed.conversationId) finalConvId = parsed.conversationId;
              } else if (currentEvent === 'error') {
                if (parsed.code === 'MEDIA_ANALYSIS_FAILED') {
                  toast.error(parsed.message || 'Unable to analyze this media. Please try another file.');
                } else if (parsed.code === 'AI_UNAVAILABLE' || parsed.code === 'KEYS_EXHAUSTED' || parsed.status === 503) {
                  toast.error('AI generation is temporarily unavailable. Please try again shortly.');
                } else if (parsed.code === 'FREE_LIMIT_REACHED' || parsed.upgradeRequired) {
                  setIsLimitModalOpen(true);
                } else {
                  toast.error(parsed.message || 'AI generation is temporarily unavailable. Please try again shortly.');
                }
              }
            } catch (err) {
              // Ignore parse chunk errors
            }
          }
        }
      }

      // Add completed message
      if (accumulatedText.trim()) {
        addMessage({
          id: finalMessageId,
          role: 'assistant',
          content: accumulatedText,
          metadata: finalMetadata || {
            mode: currentMode,
            language: currentLanguage,
            poemType: currentPoemType,
            genre: currentGenre,
            tone: currentTone,
            length: currentLength,
            platform: currentPlatform,
            style: currentStyle,
            format: currentFormat,
            action
          },
          createdAt: new Date()
        });

        if (finalConvId && !currentConversationId) {
          addConversation({
            id: finalConvId,
            title: userPrompt.substring(0, 40),
            mode,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream stopped by user.');
      } else {
        console.error('Stream failure:', err);
        toast.error('AI generation is temporarily unavailable. Please try again shortly.');
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setActiveActionChip(null);
      abortControllerRef.current = null;
    }
  };

  return {
    generate,
    stopStreaming,
    isStreaming,
    streamingContent
  };
}
