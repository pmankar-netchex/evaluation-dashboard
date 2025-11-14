# Chatbot Evaluation Dashboard

## Overview

A full-stack Next.js application designed for side-by-side comparison and human evaluation of Sierra AI and Salesforce Agentforce chatbot conversations. The system enables evaluators to score chatbot performance across multiple metrics (Resolution, Empathy, Efficiency, Accuracy) and provides analytics dashboards for performance tracking and comparison.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 14 with App Router
- Server-side rendering for authenticated pages
- Client-side components for interactive evaluation forms and analytics
- TypeScript for type safety across the application
- Tailwind CSS with Material Design 3 (Material You) design tokens for consistent styling

**Component Structure**:
- Transcript viewers for side-by-side conversation comparison
- Evaluation forms with keyboard shortcuts for efficient workflow
- Analytics components using Recharts for data visualization (win rates, score comparisons, progress tracking)
- Toast notifications for user feedback

**Design System**: Custom Material Design 3 implementation with design tokens (`lib/material-tokens.ts` and `lib/design-tokens.ts`) providing consistent colors, typography, spacing, and component styles across the application.

### Backend Architecture

**API Routes** (Next.js Route Handlers):
- `/api/transcripts/[case]` - Fetch or create transcript pairs for a given case number
- `/api/transcripts/[case]/generate` - Generate Sierra transcript by replaying Agentforce messages (streaming SSE response)
- `/api/transcripts/next` - Get next unevaluated transcript for current user
- `/api/transcripts/navigation` - Navigate between transcripts (previous/next)
- `/api/evaluations` - Submit and retrieve evaluation data
- `/api/logs` - Fetch evaluation history across all users

**Business Logic**:
- Salesforce client (`lib/salesforce/client.ts`) for OAuth authentication and API communication
- Conversation fetching (`lib/salesforce/conversation.ts`) - 3-step lookup process: Case → MessagingSession → Conversation → ConversationEntries
- Sierra client (`lib/sierra/client.ts`) for streaming API communication
- Transcript replay system (`lib/sierra/replay.ts`) that replays Agentforce end-user messages to Sierra API to generate comparable transcripts

**Data Flow**:
1. User requests transcript by case number
2. System checks database for existing transcript
3. If not found: fetch Agentforce conversation from Salesforce API
4. Generate Sierra transcript by replaying user messages to Sierra API (with progress streaming)
5. Store both transcripts in database
6. Display side-by-side for evaluation

### Data Storage

**Database**: Supabase (PostgreSQL)

**Schema Design**:
- `transcripts` table - Stores paired Agentforce and Sierra conversation transcripts with metadata
  - JSONB fields for flexible transcript storage
  - Case number indexing for quick lookup
  - Sierra version and test batch tracking
- `evaluations` table - Stores human evaluation results
  - Links to transcript via foreign key
  - Stores winner selection and detailed metric scores
  - Tracks evaluator identity and timestamp
  - Optional notes field for qualitative feedback

**Data Relationships**:
- One-to-many: Transcripts to Evaluations (multiple evaluators can score same transcript)
- User-scoped queries for personalized evaluation progress tracking

### Authentication & Authorization

**Provider**: Supabase Auth
- Email/password authentication
- Magic link support
- Session management via HTTP-only cookies
- Middleware-based route protection (`lib/supabase/middleware.ts`)

**Access Control**:
- Row Level Security (RLS) policies on database tables
- Server-side user verification for all API routes
- Service role client for admin operations (transcript fetching)

**User Flow**:
1. Unauthenticated users redirected to `/auth/login`
2. After authentication, redirected to `/dashboard`
3. Session maintained via Supabase SSR helpers

### External Dependencies

**Third-Party APIs**:
- **Salesforce API** - Source of Agentforce conversation transcripts
  - OAuth 2.0 client credentials flow for authentication
  - SOQL queries for case and messaging session lookups
  - REST API for conversation entries retrieval
  - Required environment variables: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_OAUTH_URL`, `SALESFORCE_API_VERSION`

- **Sierra API** - AI chatbot service for generating comparison transcripts
  - Streaming API with Server-Sent Events (SSE)
  - Stateful conversation management via conversation IDs
  - Message replay capabilities for transcript generation
  - Required environment variables: `SIERRA_API_TOKEN`, `SIERRA_API_URL`

**Database & Authentication**:
- **Supabase** - PostgreSQL database and authentication service
  - Database hosting with automatic API generation
  - Built-in authentication with email providers
  - Real-time subscriptions (not currently used but available)
  - Required environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**UI Libraries**:
- **Recharts** - Data visualization for analytics dashboard (charts and graphs)
- **react-hotkeys-hook** - Keyboard shortcut management for evaluation workflow
- **Zod** - Runtime type validation for API request/response schemas

**Utility Features**:
- HTML entity decoding (`lib/utils/html-entities.ts`) for proper text display from Salesforce
- CSV export functionality for evaluation data analysis
- Progress tracking with streaming updates during Sierra transcript generation