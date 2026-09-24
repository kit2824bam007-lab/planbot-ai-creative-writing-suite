export type GenerationMode = 'poem' | 'story' | 'creator';

export type PoemLength = 'short' | 'medium' | 'long' | 'standard';

export interface UploadedMedia {
  type: 'image' | 'video';
  mimeType: string;
  data: string; // base64
  fileName: string;
  fileSize: number;
  previewUrl: string;
  duration?: number;
}

export interface PoemMetadata {
  mode: GenerationMode;
  language: string;
  poemType?: string;
  genre?: string;
  tone?: string;
  length?: PoemLength;
  platform?: string;
  style?: string;
  format?: string;
  action?: string | null;
  mediaType?: 'image' | 'video' | null;
  mediaContext?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: PoemMetadata;
  createdAt: string | Date;
  model?: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  mode: GenerationMode;
  updatedAt: string;
  lastMessage?: string;
}

export interface QuotaInfo {
  limit: number | null;
  used: number | null;
  remaining: number | null;
  resetsAt: string | null;
  plan: 'FREE' | 'PRO';
  status?: string;
  isPro?: boolean;
  startDate?: string | null;
  expiryDate?: string | null;
  isAnonymous: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'FREE' | 'PRO';
  subscriptionStatus?: string;
  subscriptionStartDate?: string | null;
  subscriptionExpiryDate?: string | null;
}

export interface ShareTemplate {
  id: string;
  name: string;
  background: string;
  textColor: string;
  accentColor: string;
  borderStyle?: 'none' | 'kolam' | 'border-frame';
  fontFamily: 'Playfair Display' | 'Noto Sans Tamil' | 'Inter' | 'sans-serif';
}

export interface OriginalityResult {
  enabled?: boolean;
  status?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  exactMatchFound: boolean;
  semanticSimilarity: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  similarityScore?: number;
  matchedPhrases: string[];
  reason: string;
  recommendation: string;
  sourcesChecked: string;
}
