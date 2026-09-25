import { create } from 'zustand';
import {
  ChatMessage,
  ConversationItem,
  GenerationMode,
  PoemLength,
  PoemMetadata,
  QuotaInfo,
  UserProfile,
  UploadedMedia
} from '../types';

interface ChatState {
  // Media Input (Content Creator)
  uploadedMedia: UploadedMedia | null;
  mediaContext: any | null;
  setUploadedMedia: (media: UploadedMedia | null) => void;
  setMediaContext: (ctx: any | null) => void;
  // User & Auth
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;

  // Conversations
  conversations: ConversationItem[];
  currentConversationId: string | null;
  setConversations: (conversations: ConversationItem[]) => void;
  setCurrentConversationId: (id: string | null) => void;
  addConversation: (conv: ConversationItem) => void;
  removeConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;

  // Messages
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (content: string, metadata?: PoemMetadata) => void;

  // Streaming State
  isStreaming: boolean;
  streamingContent: string;
  streamingMetadata: PoemMetadata | null;
  activeActionChip: string | null;
  setIsStreaming: (val: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingChunk: (chunk: string) => void;
  setStreamingMetadata: (meta: PoemMetadata | null) => void;
  setActiveActionChip: (chip: string | null) => void;

  // Generation Panel Settings
  mode: GenerationMode;
  promptText: string;
  poemType: string;
  genre: string;
  tone: string;
  length: PoemLength;
  language: string;
  platform: string;
  style: string;
  format: string;
  setMode: (mode: GenerationMode) => void;
  setPromptText: (text: string) => void;
  setPoemType: (type: string) => void;
  setGenre: (genre: string) => void;
  setTone: (tone: string) => void;
  setLength: (length: PoemLength) => void;
  setLanguage: (lang: string) => void;
  setPlatform: (p: string) => void;
  setStyle: (s: string) => void;
  setFormat: (f: string) => void;

  // Quota
  quota: QuotaInfo | null;
  setQuota: (quota: QuotaInfo | null) => void;

  // Modals & Sidebar
  isLimitModalOpen: boolean;
  setIsLimitModalOpen: (val: boolean) => void;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (val: boolean) => void;
  selectedMessageForShare: ChatMessage | null;
  setSelectedMessageForShare: (msg: ChatMessage | null) => void;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  uploadedMedia: null,
  mediaContext: null,
  setUploadedMedia: (uploadedMedia) =>
    set((state) => ({
      uploadedMedia,
      mediaContext: uploadedMedia ? null : state.mediaContext
    })),
  setMediaContext: (mediaContext) => set({ mediaContext }),

  user: null,
  setUser: (user) => set({ user }),

  conversations: [],
  currentConversationId: null,
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversationId: (id) =>
    set((state) => ({
      currentConversationId: id,
      uploadedMedia: id === null ? null : state.uploadedMedia,
      mediaContext: id === null ? null : state.mediaContext,
      messages: id === null ? [] : state.messages
    })),
  addConversation: (conv) =>
    set((state) => ({
      conversations: [conv, ...state.conversations.filter((c) => c.id !== conv.id)],
      currentConversationId: conv.id
    })),
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
      messages: state.currentConversationId === id ? [] : state.messages,
      mediaContext: state.currentConversationId === id ? null : state.mediaContext
    })),
  updateConversationTitle: (id, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c))
    })),

  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateLastMessage: (content, metadata) =>
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length > 0) {
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content,
          metadata: metadata || msgs[msgs.length - 1].metadata
        };
      }
      return { messages: msgs };
    }),

  isStreaming: false,
  streamingContent: '',
  streamingMetadata: null,
  activeActionChip: null,
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  appendStreamingChunk: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),
  setStreamingMetadata: (meta) => set({ streamingMetadata: meta }),
  setActiveActionChip: (chip) => set({ activeActionChip: chip }),

  mode: 'poem',
  promptText: '',
  poemType: 'haiku',
  genre: 'generic',
  tone: 'inspirational',
  length: 'medium',
  language: 'ta',
  platform: 'instagram-post',
  style: 'aesthetic',
  format: 'poem-card',

  setMode: (mode) => set({ mode }),
  setPromptText: (promptText) => set({ promptText }),
  setPoemType: (poemType) => set({ poemType }),
  setGenre: (genre) => set({ genre }),
  setTone: (tone) => set({ tone }),
  setLength: (length) => set({ length }),
  setLanguage: (language) => set({ language }),
  setPlatform: (platform) => set({ platform }),
  setStyle: (style) => set({ style }),
  setFormat: (format) => set({ format }),

  quota: null,
  setQuota: (quota) => set({ quota }),

  isLimitModalOpen: false,
  setIsLimitModalOpen: (isLimitModalOpen) => set({ isLimitModalOpen }),
  isShareModalOpen: false,
  setIsShareModalOpen: (isShareModalOpen) => set({ isShareModalOpen }),
  selectedMessageForShare: null,
  setSelectedMessageForShare: (msg) => set({ selectedMessageForShare: msg }),
  sidebarWidth: 280,
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  isSidebarOpen: true,
  setIsSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen })
}));
