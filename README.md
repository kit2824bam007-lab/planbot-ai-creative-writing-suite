# 🌟 DreamInk AI (PlanBot) — AI Creative Writing Suite & Poetry Engine

A modern, production-ready, multilingual creative writing platform powered by **Google Gemini 3.8 Flash**, **Next.js 14**, and **Express.js**. DreamInk AI specializes in strict input grounding, classical Tamil poetry meters (வெண்பா, அகவல், முதலியன), Western poetic forms (Sonnets, Haikus, Limericks), rich narrative fiction, translanguaging (Tanglish/Hinglish to native script), social media canvas card rendering, and resilient multi-key API rotation.

---

## 📑 Table of Contents

- [Overview & Philosophy](#-overview--philosophy)
- [Strict Input Grounding Engine](#-strict-input-grounding-engine)
- [Key Features](#-key-features)
  - [Creative Writing & Classical Poetics](#1-creative-writing--classical-poetics)
  - [Multilingual & Translanguaging Intelligence](#2-multilingual--translanguaging-intelligence)
  - [Social Media Canvas Card Studio](#3-social-media-canvas-card-studio)
  - [Context-Preserving Follow-up Actions](#4-context-preserving-follow-up-actions)
  - [Voice & Mobile-First Interface](#5-voice--mobile-first-interface)
  - [Quotas & Resilience](#6-quotas--resilience)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development Setup](#local-development-setup)
  - [Docker Setup](#docker-setup)
- [Automated Testing](#-automated-testing)
- [API Reference](#-api-reference)
- [License](#-license)

---

## 🎯 Overview & Philosophy

Most AI writing applications suffer from **topic drift**—when a user enters specific keywords and selects a genre or tone, generic LLM prompts frequently discard the user's specific characters and locations in favor of broad, canned story templates (e.g., generating a generic village tale when the user requested a specific temple rock competition).

**DreamInk AI eliminates topic drift through strict input grounding:**
```
USER INPUT       →  WHAT to write about (Highest Priority)
CONTENT TYPE     →  WHAT FORM to write (Story, Poem, Social Post, Script)
GENRE            →  CREATIVE FRAMEWORK (Village Life, Sci-Fi, Fantasy, Mystery)
TONE / MOOD      →  HOW IT FEELS (Emotional, Humorous, Romantic, Suspenseful)
LANGUAGE         →  HOW IT IS EXPRESSED (Tamil, English, Tanglish, etc.)
LENGTH           →  HOW MUCH TO WRITE (Short, Medium, Long)
```
The user's actual keywords, places, characters, and events always define the core narrative. The genre and tone modify only the presentation, atmosphere, and pacing—never the core subject.

---

## 🧠 Strict Input Grounding Engine

The backend prompt and guard pipeline enforces 100% fidelity to the user's intent:

```
[ User Request ] 
       │
       ▼
[ Content Anchor Extractor ] ──► Extracts: Place, Setting, Characters, Events, Feel
       │
       ▼
[ Structured Generation Payload ] ──► { userInput, contentType, genre, tone, language, anchors }
       │
       ▼
[ Gemini 3.8 Flash Engine ] ──► Key-pooled round-robin rotation with 429 auto-backoff
       │
       ▼
[ Multilingual Semantic Guards ] ──► Validates output against COMMON_CONCEPT_MAP (Tamil/English/Tanglish)
       │
       ├─► [PASSED] ──► SSE Token Stream to Client
       └─► [DRIFT DETECTED] ──► Auto-Retry with Strict Grounding Directive (up to 2 retries)
```

1. **Semantic Anchor Extraction**: Automatically decomposes prompt phrases into Places, Settings, Characters, Events, and Core Keywords.
2. **Deterministic Priority Rules**: Prohibits generic AI story openings (`"In today's fast-paced world..."`, `"Life is a journey..."`) and blocks unrequested character or plot shifts.
3. **Multilingual Relevance Guard (`guards.js`)**: Analyzes the generated text using bilingual regex concept mapping (`COMMON_CONCEPT_MAP`) across Tamil, English, and Tanglish stems to confirm keyword presence before the client receives the output.
4. **Resilient Retry Loop**: Automatically prompts the AI with an anchor-correction directive if the output strays from the user's concepts.

---

## ✨ Key Features

### 1. Creative Writing & Classical Poetics
- **Classical Tamil Poetry**:
  - **Venpa (வெண்பா)**: Enforces strict 4-line / 7-seer metrical constraints with a 3-seer final line (ஈற்றடி முச்சீர்).
  - Sangam Landscapes: **குறிஞ்சி** (Mountains/Love), **முல்லை** (Forests/Waiting), **மருதம்** (Plains/Sulk), **நெய்தல்** (Seashore/Lament), **பாலை** (Wasteland/Separation).
  - Traditional Forms: **அந்தாதி (Andhadhi)**, **கட்டளைக் கலித்துறை**, **பரணி**, **சிந்து**, **குறவஞ்சி**.
- **Western Poetic Forms**:
  - **Haiku** (5-7-5 syllable discipline)
  - **Sonnet** (14 lines, ABABCDCDEFEFGG rhyme scheme)
  - **Limerick** (AABBA rhythm)
  - **Villanelle, Ballad, Ode, Elegy, Acrostic, Free Verse, Couplet**.
- **Story & Narrative Modes**: Short Stories, Micro-fiction, Dialogue/Scripts, Scene Outlines, and Chapter Drafts.

### 2. Multilingual & Translanguaging Intelligence
- Native script generation for: **தமிழ் (Tamil)**, **English**, **Tanglish (Tamil in Latin script)**, **हिंदी (Hindi)**, **Hinglish**, **తెలుగు (Telugu)**, **മലയാളം (Malayalam)**, **ಕನ್ನಡ (Kannada)**, **Français**, **Deutsch**, **Español**.
- Automatic transliteration detection: Inputting phonetic Tanglish (e.g. `kavithai kadhal mazhai`) automatically generates authentic, high-register Tamil script.

### 3. Social Media Canvas Card Studio
- Generates publication-ready image cards using client-side **HTML5 Canvas API** (`apps/web/lib/cardRenderer.ts`):
  - **Square Format (1080×1080)**: For Instagram, Facebook, and Twitter posts.
  - **Vertical Story Format (1080×1920)**: For Instagram Stories, WhatsApp Status, and Shorts.
- **8 Custom Aesthetic Themes**:
  - `Midnight Glow`: Deep indigo and violet ambient gradients with glowing accents.
  - `Golden Hour`: Warm amber, sunset orange, and gold tones.
  - `Minimal White`: Clean editorial layout with refined typography and soft shadows.
  - `Forest Calm`: Organic emerald and sage greens.
  - `Rose Blush`: Soft pastel rose and crimson gradients.
  - `Ocean Depths`: Deep aquatic blues and teal gradients.
  - `Tamil Classic`: Parchment cream texture with an authentic **traditional Kolam border**.
  - `Bold Statement`: High-contrast obsidian black with vivid neon typography.
- Direct one-click sharing to **WhatsApp**, **Instagram** (Web Share API / PNG download), and **X / Twitter**.

### 4. Context-Preserving Follow-up Actions
Under every generated piece, one-click action buttons retain the full context of the original prompt:
- **▶ Continue**: Continues the exact same narrative or poem without restarting.
- **💗 More Emotional**: Intensifies emotional depth on the *same* characters and situation.
- **😄 More Humorous**: Rewrites the *same* scenario with comedic timing.
- **✨ More Creative**: Enhances metaphor, sensory imagery, and lyrical prose.
- **✍ Simpler**: Clarifies vocabulary and sentence flow.
- **📏 Longer / 📉 Shorter**: Adjusts pacing and length while preserving story anchors.
- **🔄 Regenerate**: Re-rolls the response with fresh phrasing under identical parameters.

### 5. Voice & Mobile-First Interface
- **Speaking Mode**: Hands-free voice input and speech synthesis modal.
- **Mobile Keyboard Docking**: Composer remains pinned above on-screen keyboards without layout jumping.
- **Sliding Options Drawer**: Instant access to genres, moods, lengths, and poetic forms on mobile screens.

### 6. Quotas & Resilience
- **Rotating Key Pool (`keyPool.js`)**: Supports up to 10 Gemini API keys (`GEMINI_API_KEY`, `GEMINI_API_KEY_2..10`) with round-robin load distribution and automatic cooldown on 429 quota exhaustion.
- **Redis Rate Limiting**: Per-user and anonymous daily generation limits (`genlimit:{userId|ip}:{YYYY-MM-DD}`) with a live midnight countdown modal and Bring-Your-Own-Key (BYOK) support.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | [Next.js 14](https://nextjs.org/) (App Router), TypeScript, [Tailwind CSS](https://tailwindcss.com/), [Zustand](https://zustand-demo.pmnd.rs/), [Lucide React](https://lucide.dev/), HTML5 Canvas |
| **Backend API** | [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/), [Prisma ORM](https://www.prisma.io/), Server-Sent Events (SSE) |
| **AI Engine** | [Google Generative AI SDK](https://www.npmjs.com/package/@google/generative-ai) (`gemini-3.8-flash`) |
| **Database & Cache** | [PostgreSQL](https://www.postgresql.org/) (User accounts, chats, poems), [Redis](https://redis.io/) (Rate limits & key states) |
| **Testing** | [Jest](https://jestjs.io/) (Prompt tests, quality guards, input grounding suites) |
| **DevOps** | Docker, Docker Compose |

---

## 📁 Repository Structure

```plain
plan bot/
├── apps/
│   ├── api/                           # Backend API Server
│   │   ├── prisma/
│   │   │   └── schema.prisma          # Database models (User, Conversation, Message, Poem, Feedback)
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── env.js             # Environment validation & model defaults
│   │   │   │   ├── prompts.js         # Master prompt engine & content anchor extractor
│   │   │   │   └── i18n-messages.js   # Localized system messages
│   │   │   ├── middleware/
│   │   │   │   ├── auth.js            # JWT verification & guest token handling
│   │   │   │   ├── rateLimit.js       # Atomic Redis daily quota checks
│   │   │   │   ├── sanitize.js        # Input sanitization
│   │   │   │   └── errorHandler.js    # Global error interceptor
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.js     # User registration & login
│   │   │   │   ├── chat.routes.js     # SSE generation & follow-up action endpoints
│   │   │   │   ├── conversation.routes.js # Conversation history management
│   │   │   │   ├── poem.routes.js     # Saved poems & public share cards
│   │   │   │   ├── feedback.routes.js # User ratings & reports
│   │   │   │   └── health.routes.js   # Service health check endpoint
│   │   │   ├── services/
│   │   │   │   ├── gemini.js          # Google Gemini client & streaming handler
│   │   │   │   ├── keyPool.js         # Multi-key rotation & cooldown tracker
│   │   │   │   ├── guards.js          # Topic relevance & meter validation guards
│   │   │   │   ├── language.js        # Unicode script & Tanglish lexical detection
│   │   │   │   └── redis.js           # Redis client wrapper
│   │   │   └── server.js              # Application entrypoint
│   │   └── tests/                     # Jest test suites
│   │       ├── inputGrounding.test.js # Anchor extraction & topic relevance tests
│   │       ├── prompts.test.js        # Prompt template assertions
│   │       ├── guards.test.js         # Output validation & meter tests
│   │       └── keyPool.test.js        # Key rotation & backoff tests
│   │
│   └── web/                           # Frontend Next.js Application
│       ├── app/
│       │   ├── (auth)/                # /login and /register pages
│       │   ├── (main)/                # Core chat & creative workspace
│       │   └── p/[slug]/              # Public share card landing page
│       ├── components/
│       │   ├── chat/                  # ChatArea, MessageBubble, ActionButtonsRow, EmptyState
│       │   ├── generation/            # CompactComposer, OptionsDrawer, WritingComposer
│       │   ├── share/                 # ShareModal (Canvas preview, download, social share)
│       │   ├── sidebar/               # ResizableSidebar, ConversationList, UserProfile
│       │   ├── voice/                 # SpeakingModeModal
│       │   └── modals/                # LimitModal, AuthPromptModal
│       ├── hooks/
│       │   ├── useChatStream.ts       # Server-Sent Events consumer with abort support
│       │   └── useQuota.ts            # Daily generation limit hook
│       ├── lib/
│       │   ├── cardRenderer.ts        # Pure HTML5 Canvas card generation engine
│       │   └── api.ts                 # Axios / Fetch client wrappers
│       └── store/
│           └── chatStore.ts           # Zustand global state (conversations, parameters, active message)
│
├── docker-compose.yml                 # Multi-container orchestration (web, api, postgres, redis)
├── .env.example                       # Reference environment configuration
└── README.md                          # Documentation
```

---

## ⚙️ Environment Variables

Create `.env` inside `apps/api/` (or copy `.env.example` to the root):

```env
# Database & Cache
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/planbot?schema=public"
REDIS_URL="redis://localhost:6379"

# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Gemini Model & API Key Pool (Supports 1..10 keys)
GEMINI_MODEL="gemini-3.8-flash"
GEMINI_API_KEY="AIzaSy..."
GEMINI_API_KEY_2="AIzaSy..."
GEMINI_API_KEY_3="AIzaSy..."

# Daily Generation Limits
DAILY_LIMIT_FREE=10
DAILY_LIMIT_ANON=3

# Admin Key
ADMIN_API_KEY="your-admin-secret"
```

For the frontend (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14 or higher (or Docker)
- **Redis**: v6 or higher (or Docker)
- **Google Gemini API Key**: From [Google AI Studio](https://aistudio.google.com/)

---

### Local Development Setup

#### 1. Clone the repository
```bash
git clone https://github.com/kit2824bam007-lab/planbot-ai-creative-writing-suite.git
cd planbot-ai-creative-writing-suite
```

#### 2. Start PostgreSQL & Redis
If you have Docker installed, start database services easily:
```bash
docker run -d --name planbot-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=planbot postgres:15
docker run -d --name planbot-redis -p 6379:6379 redis:7-alpine
```

#### 3. Setup and Run the Backend API
```bash
cd apps/api
npm install

# Run database migrations
npx prisma generate
npx prisma db push

# Start the dev server
npm run dev
```
The API server will run at `http://localhost:4000`.

#### 4. Setup and Run the Frontend
In a new terminal window:
```bash
cd apps/web
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Docker Setup

To run the entire stack (API, Web, PostgreSQL, Redis) with a single command:

```bash
# Copy and configure environment variables
cp .env.example .env

# Build and start all services
docker compose up --build -d
```
- **Web App**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`
- **Health Check**: `http://localhost:4000/api/health`

---

## 🧪 Automated Testing

The backend includes test coverage for prompt assembly, topic relevance guards, metrical validation, and key pool rotation.

Run all test suites:
```bash
cd apps/api
npm test
```

Run specific test suites:
```bash
# Test strict input grounding and anchor extraction
npx jest tests/inputGrounding.test.js

# Test prompt assembly and options mapping
npx jest tests/prompts.test.js

# Test output quality guards and metrical rules
npx jest tests/guards.test.js

# Test API key pool rotation and 429 backoff
npx jest tests/keyPool.test.js
```

---

## 📡 API Reference

### Chat & Generation
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/stream` | Server-Sent Events stream for AI content generation with structured anchors |
| `POST` | `/api/chat/action` | Context-preserving follow-up action (`continue`, `more-emotional`, `more-creative`, etc.) |

### Conversations & History
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/conversations` | Retrieve authenticated user's conversations |
| `GET` | `/api/conversations/:id` | Get message history for a specific conversation |
| `DELETE` | `/api/conversations/:id` | Delete a conversation thread |

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create a new user account |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/auth/me` | Fetch current authenticated user profile & remaining quota |

### Social Poems & Cards
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/poems` | Save a generated poem or story |
| `GET` | `/api/poems/p/:slug` | Public read endpoint for social card sharing |

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

Developed with ❤️ for creative writers, poets, and storytellers worldwide.
