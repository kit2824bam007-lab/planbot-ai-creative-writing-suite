# 🌟 PlanBot AI — Full AI Poem & Story Generator (Production Build)

A production-grade, multilingual AI creative-writing platform combining classical Tamil poetry forms, Western poetry meters, narrative story generation, ChatGPT-style token streaming, translanguaging input detection (Tanglish/Hinglish → native script), Content Creator mode (8 live-rendered Canvas image cards for Instagram/WhatsApp), Redis daily quota limits, per-user data isolation, and rotating Gemini key pool with 429 auto-backoff.

---

## 📁 Monorepo Structure

```plain
plan bot/
├── apps/
│   ├── api/                     # Express.js + Prisma + Redis + Gemini Engine
│   │   ├── prisma/
│   │   │   └── schema.prisma    # User, Conversation, Message, Poem, GenerationLog, Feedback
│   │   ├── src/
│   │   │   ├── config/          # prompts.js (Master Prompt Engine), env.js, i18n-messages.js
│   │   │   ├── middleware/      # auth.js, rateLimit.js, sanitize.js, errorHandler.js
│   │   │   ├── routes/          # auth, chat, conversations, poems, feedback, admin, health
│   │   │   ├── services/        # gemini.js, keyPool.js, language.js, guards.js, redis.js
│   │   │   └── server.js
│   │   └── tests/               # 5 test suites (language, guards, keyPool, prompts, routes)
│   └── web/                     # Next.js 14 (App Router, TypeScript, Tailwind)
│       ├── app/
│       │   ├── (auth)/          # /login, /register
│       │   ├── (main)/          # Main ChatGPT-style streaming chat interface
│       │   └── p/[slug]/        # Public poem share view with SEO meta tags
│       ├── components/
│       │   ├── chat/            # ChatArea, MessageBubble, ActionButtonsRow, EmptyState, TypingIndicator
│       │   ├── generation/      # GenerationPanel, PoemOptions, StoryOptions, CreatorOptions, CustomDropdown
│       │   ├── share/           # ShareModal (8 live templates + WhatsApp/Instagram/Twitter/PNG)
│       │   ├── sidebar/         # ResizableSidebar (260-400px), ConversationList, UserMenu
│       │   └── modals/          # LimitModal (429 midnight countdown), AuthPromptModal
│       ├── hooks/               # useChatStream (SSE), useQuota
│       ├── store/               # chatStore (Zustand)
│       ├── lib/                 # cardRenderer.ts (Pure HTML Canvas API), api.ts
│       └── i18n/                # react-i18next bilingual Generation Panel (en & ta)
├── docker-compose.yml           # Full stack: web, api, postgres, redis
├── .env.example
└── README.md
```

---

## 🚀 Quick Start

### 1. Run with Docker Compose (Recommended)

```bash
# 1. Clone or open directory
cp .env.example .env

# 2. Add your Gemini API Key in .env
# GEMINI_API_KEY="AIzaSy..."

# 3. Launch all services
docker compose up --build -d
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:4000](http://localhost:4000)
- **Health Check**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

### 2. Local Development

#### Start Backend (`apps/api`):
```bash
cd apps/api
npm install
npx prisma generate
npm run dev
```

#### Run Automated Tests:
```bash
cd apps/api
npm test
```
*All 24 unit & integration tests covering language detection, prompt constraints, output guards, key rotation, and user data isolation will execute.*

#### Start Frontend (`apps/web`):
```bash
cd apps/web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎨 Frontend Features

1. **ChatGPT-style Streaming Chat**:
   - Token-by-token SSE streaming with blinking cursor and 3-dot typing indicator.
   - Stop button with `AbortController` support.
   - Preserves genuine poetic line breaks.
2. **Tamil-First & Translanguaging**:
   - Automatic Unicode Tamil detection switches language dropdown on-the-fly.
   - Tanglish & Hinglish lexical fingerprint scoring (e.g. `kavithai`, `kadhal`, `venum` → auto-generates authentic Tamil script).
3. **Classical Tamil Poetry Forms**:
   - Supports: வெண்பா (Venpa), குறிஞ்சி, முல்லை, மருதம், நெய்தல், அந்தாதி, கட்டளைக் கலித்துறை, பரணி, சிந்து, குறவஞ்சி.
   - Selecting a classical form automatically locks the language to தமிழ் with a lock icon.
4. **Western Poetry Meters**:
   - Haiku (5-7-5), Sonnet (ABABCDCDEFEFGG), Limerick (AABBA), Acrostic, Free Verse, Blank Verse, Couplet, Villanelle, Ballad, Ode, Elegy.
5. **Action Buttons Suite**:
   - Under every AI bubble: 📋 Copy · ⬇ Download .txt · 🔄 Regenerate · ▶ Continue Piece · ✨ More Creative · 💗 More Emotional · 😄 More Humorous · ✍ Simpler · 📉 Shorter · 📏 Longer · 📤 Share.
6. **Pure Canvas Card Generator (`lib/cardRenderer.ts`)**:
   - 8 live aesthetic templates: *Midnight Glow, Golden Hour, Minimal White, Forest Calm, Rose Blush, Ocean Depths, Tamil Classic (cream bg + Kolam decorative border), Bold Statement*.
   - Auto-scales typography (72px → 36px) to avoid clipping.
   - Renders 1080×1080 (Post) and 1080×1920 (Story/Status).
   - One-click share to WhatsApp (`wa.me`), Instagram (Web Share API / PNG download), and Twitter / 𝕏.
7. **Daily Quotas & Resilient Limit Modal**:
   - Atomic Redis rate-limiting (`genlimit:{userId|ip}:{YYYY-MM-DD}`).
   - Shows live midnight countdown timer with bilingual EN & TA guidance.
   - Allows users to provide their own personal Gemini Key (BYOK) for unlimited generations.

---

## ⚙️ Backend Architecture & Resilience

- **Gemini Key Pool**: Round-robin over `GEMINI_API_KEY` and `GEMINI_API_KEY_2..10`. On 429 quota exhaustion, keys undergo a 1-minute cooldown, while other errors use exponential backoff (1m → 2m → 4m → 8m).
- **Quality Guards**: Automatically catches mode mismatches (rhyming lines in stories or monolithic prose in poems), script mismatches, romanized leakage, and triggers structured single retries.
- **User Isolation**: All conversation and message queries are owner-scoped. Attempts to view unowned conversations return a secure 404 (never leaking existence with 403).

---

## 📄 License
MIT © PlanBot AI Team
