'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, ArrowLeft, FileText, Check, Globe } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export const SpeakingModeModal: React.FC = () => {
  const {
    isSpeakingModalOpen,
    setIsSpeakingModalOpen,
    promptText,
    setPromptText,
    language,
    setLanguage
  } = useChatStore();

  const { generate } = useChatStream();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition when modal opens
  useEffect(() => {
    if (!isSpeakingModalOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    setTranscript(promptText || '');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === 'ta' ? 'ta-IN' : 'en-US';

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript + ' ';
      }
      const trimmed = currentTranscript.trim();
      setTranscript(trimmed);
      setPromptText(trimmed);

      // Check if Tamil Unicode script detected
      if (/[\u0B80-\u0BFF]/.test(trimmed) && language !== 'ta') {
        setLanguage('ta');
      }
    };

    recognition.onerror = (e: any) => {
      console.warn('Speech recognition status:', e?.error);
      if (e?.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone permissions.');
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if modal is still open and user wants to keep listening
      if (isSpeakingModalOpen && isListening) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    // Auto-start listening on voice mode open
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // Ignore if already started
    }

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, [isSpeakingModalOpen, language, setPromptText, setLanguage]);

  if (!isSpeakingModalOpen) return null;

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(true);
      }
    }
  };

  const handleDone = () => {
    setIsSpeakingModalOpen(false);
    if (transcript.trim()) {
      setPromptText(transcript.trim());
      // Smoothly trigger generation if user has spoken
      generate();
    }
  };

  const handleClose = () => {
    setIsSpeakingModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F8F5FB] dark:bg-[#120D1A] flex flex-col justify-between overflow-hidden animate-in fade-in duration-300">
      {/* Background Ethereal Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[500px] h-[380px] sm:h-[500px] rounded-full bg-gradient-to-tr from-purple-400/25 via-fuchsia-400/20 to-pink-300/20 dark:from-purple-900/35 dark:via-fuchsia-900/25 dark:to-pink-900/20 blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between z-10 shrink-0">
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-2xl bg-white/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 shadow-soft-sm transition-all"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-800 dark:text-zinc-100 tracking-tight font-serif">
            Speaking to PlanBot
          </h2>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-sans mt-0.5">
            {isListening ? 'Say it — I’ll take notes' : 'Tap mic to continue speaking'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLanguage(language === 'ta' ? 'en' : 'ta');
            toast.info(`Switched voice language to ${language === 'ta' ? 'English' : 'தமிழ்'}`);
          }}
          className="p-2 rounded-2xl bg-white/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 shadow-soft-sm transition-all flex items-center gap-1 text-xs font-semibold"
          title="Toggle Language"
        >
          <Globe className="w-4 h-4 text-primary" />
          <span>{language === 'ta' ? 'தமிழ்' : 'EN'}</span>
        </button>
      </header>

      {/* Center 3D Glowing Sound Orb (Directly matching Screen 2 reference) */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10 my-auto">
        <div className="relative flex items-center justify-center">
          {/* Outer Ambient Glowing Blur */}
          <div
            className={cn(
              'absolute w-60 h-60 sm:w-80 sm:h-80 rounded-full transition-all duration-700 pointer-events-none',
              isListening
                ? 'bg-gradient-to-tr from-purple-600/40 via-fuchsia-500/35 to-pink-500/30 blur-3xl scale-110'
                : 'bg-gradient-to-tr from-purple-600/20 via-fuchsia-500/15 to-pink-500/15 blur-2xl scale-95'
            )}
          />

          {/* 3D Violet Audio Sphere Orb */}
          <div
            className={cn(
              'w-52 h-52 sm:w-68 sm:h-68 rounded-full relative overflow-hidden flex items-center justify-center transition-transform duration-500',
              isListening ? 'voice-orb shadow-2xl' : 'scale-95'
            )}
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #E9D5FF 0%, #A855F7 35%, #7E22CE 65%, #3B0764 100%)',
              boxShadow:
                'inset 0 10px 30px rgba(255,255,255,0.6), inset 0 -15px 30px rgba(0,0,0,0.5), 0 20px 50px rgba(126, 34, 206, 0.4)'
            }}
          >
            {/* Dynamic Inner Swirl */}
            <div
              className="absolute inset-0 rounded-full mix-blend-overlay voice-orb-inner opacity-80"
              style={{
                background:
                  'conic-gradient(from 180deg at 50% 50%, rgba(236,72,153,0.8) 0deg, rgba(168,85,247,0.2) 120deg, rgba(99,102,241,0.8) 240deg, rgba(236,72,153,0.8) 360deg)'
              }}
            />

            {/* Specular Highlight Gloss */}
            <div className="absolute top-4 left-6 w-20 h-12 rounded-full bg-white/40 blur-xs rotate-[-30deg] pointer-events-none" />
          </div>
        </div>

        {/* Live Speech Transcript Box */}
        <div className="mt-8 max-w-md w-full text-center px-4 min-h-[70px]">
          {transcript ? (
            <p className="text-base sm:text-lg font-serif text-zinc-800 dark:text-zinc-100 leading-relaxed font-medium transition-all animate-fade-in">
              "{transcript}"
            </p>
          ) : (
            <p className="text-sm sm:text-base text-zinc-400 dark:text-zinc-500 font-sans italic">
              {speechSupported
                ? 'Speak in Tamil or English… I’m listening'
                : 'Speech recognition is not supported in this browser. Please type below.'}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Voice Controls */}
      <footer className="px-6 pb-8 pt-4 flex items-center justify-between max-w-sm mx-auto w-full z-10 shrink-0">
        {/* Switch back to Chat / Text button */}
        <button
          type="button"
          onClick={handleClose}
          className="p-3.5 rounded-full bg-white/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 shadow-soft-sm border border-stone-200/50 dark:border-zinc-700 transition-transform active:scale-95"
          title="Back to text"
        >
          <FileText className="w-5 h-5" />
        </button>

        {/* Center Glowing Mic Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={cn(
            'p-5 rounded-full transition-all duration-300 shadow-xl flex items-center justify-center relative active:scale-95',
            isListening
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 ring-8 ring-purple-400/25 animate-pulse'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-900'
          )}
          title={isListening ? 'Mute' : 'Listen'}
        >
          {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
        </button>

        {/* Done / Close button */}
        {transcript.trim() ? (
          <button
            type="button"
            onClick={handleDone}
            className="p-3.5 rounded-full bg-primary text-white shadow-soft-md hover:bg-primary/90 transition-transform active:scale-95"
            title="Send to chat"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            className="p-3.5 rounded-full bg-white/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 shadow-soft-sm border border-stone-200/50 dark:border-zinc-700 transition-transform active:scale-95"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </footer>
    </div>
  );
};
