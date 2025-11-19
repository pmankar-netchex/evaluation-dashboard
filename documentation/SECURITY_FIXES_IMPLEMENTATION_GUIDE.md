# Security Fixes Implementation Guide

This guide provides detailed, copy-paste-ready implementations for the security fixes identified in the Security Analysis Report.

---

## Table of Contents

1. [Security Headers (CRITICAL)](#1-security-headers-critical)
2. [Rate Limiting (CRITICAL)](#2-rate-limiting-critical)
3. [Error Message Sanitization (CRITICAL)](#3-error-message-sanitization-critical)
4. [CSRF Protection (CRITICAL)](#4-csrf-protection-critical)
5. [Input Validation Enhancement](#5-input-validation-enhancement)
6. [XSS Prevention](#6-xss-prevention)
7. [Authorization Fixes](#7-authorization-fixes)
8. [Audit Logging](#8-audit-logging)
9. [Database Constraints](#9-database-constraints)
10. [Production Logging](#10-production-logging)

---

## 1. Security Headers (CRITICAL)

**Priority:** P0 - Immediate  
**Effort:** 4 hours  
**Impact:** Prevents XSS, clickjacking, MIME sniffing attacks

### Implementation

Replace your `next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // DNS Prefetch Control
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          // Strict Transport Security (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // XSS Protection (legacy browsers)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co https://api.sierra.chat wss://*.supabase.co",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          }
        ],
      },
      // API routes should have additional headers
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Testing

```bash
# After deployment, test headers:
curl -I https://your-domain.com
curl -I https://your-domain.com/api/evaluations

# Or use online tools:
# https://securityheaders.com/
# https://csp-evaluator.withgoogle.com/
```

---

## 2. Rate Limiting (CRITICAL)

**Priority:** P0 - Immediate  
**Effort:** 8 hours  
**Impact:** Prevents DoS, API abuse, brute force

### Step 1: Create Rate Limiter

Create `lib/rate-limiter.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyPrefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Simple rate limiter using Supabase as storage
 * For production, consider using Redis or Upstash
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'ratelimit',
      ...config,
    };
  }

  /**
   * Check if a request is allowed for the given identifier
   */
  async check(identifier: string): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const supabase = await createClient();

      // Clean up old entries
      await supabase
        .from('rate_limit_entries')
        .delete()
        .lt('timestamp', new Date(windowStart).toISOString());

      // Count requests in current window
      const { count, error } = await supabase
        .from('rate_limit_entries')
        .select('*', { count: 'exact', head: true })
        .eq('key', key)
        .gte('timestamp', new Date(windowStart).toISOString());

      if (error) {
        console.error('Rate limit check error:', error);
        return {
          success: true, // Fail open
          limit: this.config.max,
          remaining: this.config.max,
          reset: now + this.config.windowMs,
        };
      }

      const requestCount = count || 0;
      const remaining = Math.max(0, this.config.max - requestCount);

      if (requestCount >= this.config.max) {
        return {
          success: false,
          limit: this.config.max,
          remaining: 0,
          reset: now + this.config.windowMs,
        };
      }

      // Record this request
      await supabase.from('rate_limit_entries').insert({
        key,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        limit: this.config.max,
        remaining: remaining - 1,
        reset: now + this.config.windowMs,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request
      return {
        success: true,
        limit: this.config.max,
        remaining: this.config.max,
        reset: now + this.config.windowMs,
      };
    }
  }
}
```

### Step 2: Create Database Migration

Create `supabase/migrations/004_rate_limiting.sql`:

```sql
-- Rate limiting table
CREATE TABLE rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_rate_limit_key_timestamp ON rate_limit_entries(key, timestamp);

-- Auto-cleanup function (run daily)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_entries 
  WHERE timestamp < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (no policies needed - service role only)
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;
```

### Step 3: Create Middleware

Create `middleware.ts` in project root:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { RateLimiter } from '@/lib/rate-limiter';

// Create rate limiters with different configs
const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  keyPrefix: 'api',
});

const authLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 5, // 5 login attempts per minute
  keyPrefix: 'auth',
});

const expensiveEndpointLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 10, // 10 requests per minute for expensive operations
  keyPrefix: 'expensive',
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') 
      || request.headers.get('x-real-ip') 
      || 'unknown';

    let limiter = apiLimiter;
    let limitType = 'API';

    // Use stricter limits for authentication endpoints
    if (pathname.startsWith('/api/auth')) {
      limiter = authLimiter;
      limitType = 'Auth';
    }

    // Use stricter limits for expensive endpoints
    if (
      pathname.includes('/transcripts/') ||
      pathname.includes('/messages/')
    ) {
      limiter = expensiveEndpointLimiter;
      limitType = 'Expensive';
    }

    const result = await limiter.check(ip);

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          message: 'You have exceeded the rate limit. Please try again later.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
          }
        }
      );
    }

    return response;
  }

  // Continue with session management
  return updateSession(request);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/analytics/:path*',
    '/chat/:path*',
    '/logs/:path*',
  ],
};
```

### Step 4: Apply Migration

```bash
# Run the migration
cd supabase
supabase migration up

# Or via Supabase dashboard: paste the SQL
```

---

## 3. Error Message Sanitization (CRITICAL)

**Priority:** P0 - Immediate  
**Effort:** 4 hours  
**Impact:** Prevents information disclosure

### Step 1: Create Error Handler

Create `lib/error-handler.ts`:

```typescript
import { NextResponse } from 'next/server';

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

export class SafeApiError extends Error {
  statusCode: number;
  code?: string;
  internalDetails?: unknown;

  constructor(message: string, statusCode: number = 500, code?: string, internalDetails?: unknown) {
    super(message);
    this.name = 'SafeApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.internalDetails = internalDetails;
  }
}

export function handleApiError(error: unknown, operation: string): NextResponse {
  const isDev = process.env.NODE_ENV === 'development';

  // Log the full error internally
  console.error(`[${operation}] Error:`, error);

  // SafeApiError - use the message as-is
  if (error instanceof SafeApiError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.code && { code: error.code }),
        ...(isDev && error.internalDetails && { details: error.internalDetails }),
      },
      { status: error.statusCode }
    );
  }

  // Standard Error
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: 'An error occurred',
        ...(isDev && { details: error.message, stack: error.stack }),
      },
      { status: 500 }
    );
  }

  // Unknown error
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      ...(isDev && { details: String(error) }),
    },
    { status: 500 }
  );
}

// Predefined safe error messages
export const SafeErrors = {
  Unauthorized: new SafeApiError('Authentication required', 401, 'UNAUTHORIZED'),
  Forbidden: new SafeApiError('You do not have permission to access this resource', 403, 'FORBIDDEN'),
  NotFound: new SafeApiError('Resource not found', 404, 'NOT_FOUND'),
  InvalidInput: new SafeApiError('Invalid input provided', 400, 'INVALID_INPUT'),
  RateLimit: new SafeApiError('Too many requests', 429, 'RATE_LIMIT'),
  ServerError: new SafeApiError('An error occurred processing your request', 500, 'SERVER_ERROR'),
};
```

### Step 2: Update API Routes

Example update for `app/api/evaluations/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { Database } from '@/lib/supabase/database.types';
import { handleApiError, SafeApiError, SafeErrors } from '@/lib/error-handler';

const evaluationSchema = z.object({
  // ... existing schema
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw SafeErrors.Unauthorized;
    }

    const body = await request.json();
    const validatedData = evaluationSchema.parse(body);

    // Insert evaluation
    const insertData: Database['public']['Tables']['evaluations']['Insert'] = {
      transcript_id: validatedData.transcript_id,
      evaluator_id: user.id,
      evaluator_email: user.email,
      winner: validatedData.winner,
      scores: validatedData.scores as Database['public']['Tables']['evaluations']['Insert']['scores'],
      notes: validatedData.notes || null,
      time_spent_seconds: validatedData.time_spent_seconds || null,
    };

    const { data: evaluation, error } = await (supabase
      .from('evaluations') as any)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new SafeApiError(
        'Failed to save evaluation',
        500,
        'DATABASE_ERROR',
        error // Internal details, only shown in dev
      );
    }

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    return handleApiError(error, 'POST /api/evaluations');
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw SafeErrors.Unauthorized;
    }

    // FIXED: Remove evaluator_id parameter (security issue)
    // Users can only query their own evaluations
    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('transcript_id');

    let query = supabase
      .from('evaluations')
      .select('*, transcripts(*)')
      .eq('evaluator_id', user.id); // FIXED: Always use current user

    if (transcriptId) {
      query = query.eq('transcript_id', transcriptId);
    }

    const { data: evaluations, error } = await query.order(
      'evaluation_timestamp',
      { ascending: false }
    );

    if (error) {
      throw new SafeApiError(
        'Failed to fetch evaluations',
        500,
        'DATABASE_ERROR',
        error
      );
    }

    return NextResponse.json(evaluations);
  } catch (error: any) {
    return handleApiError(error, 'GET /api/evaluations');
  }
}
```

---

## 4. CSRF Protection (CRITICAL)

**Priority:** P0 - Immediate  
**Effort:** 6 hours  
**Impact:** Prevents cross-site request forgery

### Step 1: Install CSRF Protection

```bash
npm install @edge-csrf/nextjs
npm install --save-dev @types/csrf
```

### Step 2: Create CSRF Utility

Create `lib/csrf.ts`:

```typescript
import { createCsrfProtect } from '@edge-csrf/nextjs';
import { NextRequest } from 'next/server';

const csrfProtect = createCsrfProtect({
  cookie: {
    name: '__Host-csrf',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  },
});

export async function validateCsrf(request: NextRequest): Promise<Error | null> {
  if (process.env.NODE_ENV === 'test') {
    return null; // Skip in tests
  }

  try {
    const csrfError = await csrfProtect(request);
    return csrfError;
  } catch (error) {
    console.error('CSRF validation error:', error);
    return new Error('CSRF validation failed');
  }
}

export { csrfProtect };
```

### Step 3: Update Middleware

Update `middleware.ts` to include CSRF:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { RateLimiter } from '@/lib/rate-limiter';
import { csrfProtect } from '@/lib/csrf';

// ... existing limiters ...

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF protection for state-changing API operations
  if (
    pathname.startsWith('/api/') &&
    (request.method === 'POST' || 
     request.method === 'PUT' || 
     request.method === 'DELETE' ||
     request.method === 'PATCH')
  ) {
    const csrfError = await csrfProtect(request);
    if (csrfError) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
  }

  // ... existing rate limiting code ...

  // Continue with session management
  return updateSession(request);
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/analytics/:path*',
    '/chat/:path*',
    '/logs/:path*',
  ],
};
```

### Step 4: Create CSRF Context for Client

Create `lib/csrf-context.tsx`:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface CsrfContextType {
  token: string | null;
  refreshToken: () => Promise<void>;
}

const CsrfContext = createContext<CsrfContextType>({
  token: null,
  refreshToken: async () => {},
});

export function useCsrf() {
  return useContext(CsrfContext);
}

export function CsrfProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/csrf-token');
      const data = await response.json();
      setToken(data.csrfToken);
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  };

  useEffect(() => {
    refreshToken();
  }, []);

  return (
    <CsrfContext.Provider value={{ token, refreshToken }}>
      {children}
    </CsrfContext.Provider>
  );
}
```

### Step 5: Create CSRF Token Endpoint

Create `app/api/csrf-token/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // The CSRF token is automatically set in cookies by the middleware
  // We just need to return it for the client to use
  const csrfToken = request.headers.get('x-csrf-token') || '';
  
  return NextResponse.json({ csrfToken });
}
```

### Step 6: Update Root Layout

Update `app/layout.tsx`:

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CsrfProvider } from "@/lib/csrf-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chatbot Evaluation Dashboard",
  description: "Evaluate and compare Sierra AI and Salesforce Agentforce chatbot conversations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CsrfProvider>
          {children}
        </CsrfProvider>
      </body>
    </html>
  );
}
```

### Step 7: Use CSRF in Forms

Example update for client components:

```typescript
'use client';

import { useCsrf } from '@/lib/csrf-context';

export function MyForm() {
  const { token } = useCsrf();

  const handleSubmit = async (data: any) => {
    const response = await fetch('/api/some-endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token || '',
      },
      body: JSON.stringify(data),
    });
    
    // handle response
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

---

## 5. Input Validation Enhancement

**Priority:** P1 - High  
**Effort:** 4 hours

### Enhanced Schemas

Update `lib/schemas/validation.ts` (create if doesn't exist):

```typescript
import { z } from 'zod';

// Message validation with length limits
export const messageSchema = z.object({
  content: z.string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message too long (max 5000 characters)")
    .trim()
    .refine(
      (val) => val.length > 0,
      { message: "Message must contain non-whitespace characters" }
    ),
});

// Evaluation notes with sanitization
export const evaluationNotesSchema = z.string()
  .max(2000, "Notes too long (max 2000 characters)")
  .optional()
  .transform(val => val?.trim());

// Enhanced evaluation schema
export const evaluationSchema = z.object({
  transcript_id: z.string().uuid("Invalid transcript ID"),
  winner: z.enum(['sierra', 'agentforce', 'tie', 'both_poor'], {
    errorMap: () => ({ message: "Invalid winner selection" })
  }),
  scores: z.object({
    resolution: z.object({
      af: z.number().int().min(1).max(5),
      sierra: z.number().int().min(1).max(5),
    }),
    empathy: z.object({
      af: z.number().int().min(1).max(5),
      sierra: z.number().int().min(1).max(5),
    }),
    efficiency: z.object({
      af: z.number().int().min(1).max(5),
      sierra: z.number().int().min(1).max(5),
    }),
    accuracy: z.object({
      af: z.number().int().min(1).max(5),
      sierra: z.number().int().min(1).max(5),
    }),
  }),
  notes: evaluationNotesSchema,
  time_spent_seconds: z.number().int().min(0).max(86400).optional(), // Max 24 hours
});

// Case number validation
export const caseNumberSchema = z.string()
  .regex(/^[A-Za-z0-9-_]+$/, "Invalid case number format")
  .min(1)
  .max(100);

// Session ID validation
export const sessionIdSchema = z.string().uuid("Invalid session ID");
```

---

## 6. XSS Prevention

**Priority:** P1 - High  
**Effort:** 4 hours

### Step 1: Install DOMPurify

```bash
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

### Step 2: Create Sanitization Utility

Create `lib/sanitize.ts`:

```typescript
import DOMPurify from 'isomorphic-dompurify';

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: { [key: string]: string[] };
}

const defaultOptions: SanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'br', 'p'],
  allowedAttributes: {},
};

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeHtml(dirty: string, options: SanitizeOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: opts.allowedTags,
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize plain text (strips all HTML)
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}
```

### Step 3: Update Components

Update `components/chat-interface.tsx`:

```typescript
'use client';

import { sanitizeText } from '@/lib/sanitize';
// ... other imports

export function ChatInterface({
  // ... props
}: ChatInterfaceProps) {
  // ... existing code

  return (
    <div className="flex flex-col h-full bg-white border border-[#eeeeee] rounded-lg shadow-sm">
      {/* ... header */}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={/* ... existing className */}>
              <div className="flex items-start gap-2">
                {message.role === 'assistant' && <span className="text-lg">🏔️</span>}
                <div className="flex-1">
                  <p className="text-sm font-normal leading-5 whitespace-pre-wrap break-words">
                    {sanitizeText(message.content)}
                  </p>
                  {/* ... timestamp */}
                </div>
                {message.role === 'user' && <span className="text-lg">👤</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ... input */}
    </div>
  );
}
```

---

## 7. Authorization Fixes

**Priority:** P1 - High  
**Effort:** 2 hours

Already shown in Section 3 (Error Handler) - remove the `evaluator_id` parameter from GET `/api/evaluations`.

---

## 8. Audit Logging

**Priority:** P2 - Medium  
**Effort:** 8 hours

### Step 1: Create Audit Log Migration

Create `supabase/migrations/005_audit_logging.sql`:

```sql
-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path TEXT,
  status_code INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs (for now, no policy = service role only)
-- Add admin policies later if needed

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE audit_logs IS 'Security audit trail for all sensitive operations';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., CREATE_EVALUATION, VIEW_TRANSCRIPT)';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context about the action';
```

### Step 2: Create Audit Logger

Create `lib/audit-logger.ts`:

```typescript
import { createServiceClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createServiceClient();
    
    await supabase.from('audit_logs').insert({
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      request_method: entry.requestMethod,
      request_path: entry.requestPath,
      status_code: entry.statusCode,
      metadata: entry.metadata,
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Audit logging failed:', error);
  }
}

export function extractRequestInfo(request: NextRequest) {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                request.headers.get('x-real-ip') || 
                'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    requestMethod: request.method,
    requestPath: request.nextUrl.pathname,
  };
}

// Predefined audit actions
export const AuditActions = {
  // Authentication
  LOGIN: 'AUTH_LOGIN',
  LOGOUT: 'AUTH_LOGOUT',
  FAILED_LOGIN: 'AUTH_FAILED_LOGIN',
  
  // Evaluations
  CREATE_EVALUATION: 'CREATE_EVALUATION',
  VIEW_EVALUATION: 'VIEW_EVALUATION',
  UPDATE_EVALUATION: 'UPDATE_EVALUATION',
  
  // Transcripts
  VIEW_TRANSCRIPT: 'VIEW_TRANSCRIPT',
  GENERATE_SIERRA_TRANSCRIPT: 'GENERATE_SIERRA_TRANSCRIPT',
  
  // Chat
  CREATE_CHAT_SESSION: 'CREATE_CHAT_SESSION',
  SEND_MESSAGE: 'SEND_MESSAGE',
  END_CHAT_SESSION: 'END_CHAT_SESSION',
  
  // Data Export
  EXPORT_DATA: 'EXPORT_DATA',
};
```

### Step 3: Use in API Routes

Example for evaluations:

```typescript
import { logAudit, AuditActions, extractRequestInfo } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  const requestInfo = extractRequestInfo(request);
  
  try {
    // ... authentication
    // ... validation
    // ... create evaluation

    // Log successful creation
    await logAudit({
      userId: user.id,
      action: AuditActions.CREATE_EVALUATION,
      resourceType: 'evaluation',
      resourceId: evaluation.id,
      ...requestInfo,
      statusCode: 201,
      metadata: {
        transcriptId: validatedData.transcript_id,
        winner: validatedData.winner,
      },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error: any) {
    // Log failed attempt
    await logAudit({
      userId: user?.id,
      action: AuditActions.CREATE_EVALUATION,
      resourceType: 'evaluation',
      ...requestInfo,
      statusCode: error.statusCode || 500,
      metadata: {
        error: error.message,
      },
    });

    return handleApiError(error, 'POST /api/evaluations');
  }
}
```

---

## 9. Database Constraints

**Priority:** P2 - Medium  
**Effort:** 1 hour

Create `supabase/migrations/006_additional_constraints.sql`:

```sql
-- Prevent duplicate evaluations
ALTER TABLE evaluations
ADD CONSTRAINT unique_user_transcript_eval 
UNIQUE (transcript_id, evaluator_id);

-- Ensure evaluation type matches foreign key
ALTER TABLE evaluations
ADD CONSTRAINT check_evaluation_source 
CHECK (
  (evaluation_type = 'case_comparison' AND transcript_id IS NOT NULL AND chat_session_id IS NULL) OR
  (evaluation_type = 'custom_chat' AND chat_session_id IS NOT NULL AND transcript_id IS NULL)
);

-- Ensure scores are valid
ALTER TABLE evaluations
ADD CONSTRAINT check_scores_valid
CHECK (
  jsonb_typeof(scores) = 'object' AND
  scores ? 'resolution' AND
  scores ? 'empathy' AND
  scores ? 'efficiency' AND
  scores ? 'accuracy'
);

-- Ensure chat sessions have valid status
ALTER TABLE chat_sessions
DROP CONSTRAINT IF EXISTS chat_sessions_session_status_check;

ALTER TABLE chat_sessions
ADD CONSTRAINT chat_sessions_session_status_check
CHECK (session_status IN ('active', 'ended'));

-- Ensure ended sessions have ended_at timestamp
ALTER TABLE chat_sessions
ADD CONSTRAINT check_ended_session_timestamp
CHECK (
  (session_status = 'active' AND ended_at IS NULL) OR
  (session_status = 'ended' AND ended_at IS NOT NULL)
);

-- Add check constraint for time_spent_seconds (max 24 hours)
ALTER TABLE evaluations
ADD CONSTRAINT check_time_spent
CHECK (time_spent_seconds IS NULL OR (time_spent_seconds >= 0 AND time_spent_seconds <= 86400));
```

---

## 10. Production Logging

**Priority:** P2 - Medium  
**Effort:** 3 hours

Create `lib/logger.ts`:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  private sanitize(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'api_key',
      'apiKey',
      'authorization',
      'cookie',
      'session',
    ];

    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private log(level: LogLevel, message: string, metadata?: LogMetadata) {
    const timestamp = new Date().toISOString();
    const sanitizedMetadata = metadata ? this.sanitize(metadata) : undefined;

    const logEntry = {
      timestamp,
      level,
      message,
      ...(sanitizedMetadata && { metadata: sanitizedMetadata }),
      ...(this.isDevelopment && { env: 'development' }),
    };

    // In production, send to logging service
    if (this.isProduction) {
      // TODO: Send to logging service (e.g., Datadog, Sentry, CloudWatch)
      // For now, just console.log in structured format
      console.log(JSON.stringify(logEntry));
    } else {
      // Development: pretty print
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      
      switch (level) {
        case 'error':
          console.error(prefix, message, sanitizedMetadata);
          break;
        case 'warn':
          console.warn(prefix, message, sanitizedMetadata);
          break;
        case 'info':
          console.info(prefix, message, sanitizedMetadata);
          break;
        case 'debug':
          console.debug(prefix, message, sanitizedMetadata);
          break;
      }
    }
  }

  debug(message: string, metadata?: LogMetadata) {
    if (this.isDevelopment) {
      this.log('debug', message, metadata);
    }
  }

  info(message: string, metadata?: LogMetadata) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata) {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error | unknown, metadata?: LogMetadata) {
    const errorMetadata = {
      ...metadata,
      ...(error instanceof Error && {
        error: {
          name: error.name,
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
        },
      }),
    };

    this.log('error', message, errorMetadata);
  }
}

export const logger = new Logger();
```

### Usage

Replace all `console.log` with:

```typescript
import { logger } from '@/lib/logger';

// Instead of: console.log('User created', { userId: user.id });
logger.info('User created', { userId: user.id });

// Instead of: console.error('Error:', error);
logger.error('Failed to create user', error, { operation: 'createUser' });
```

---

## Testing Checklist

After implementing these fixes:

- [ ] Test security headers with [securityheaders.com](https://securityheaders.com/)
- [ ] Test CSP with browser console (check for violations)
- [ ] Test rate limiting by making rapid requests
- [ ] Verify CSRF protection by removing token from request
- [ ] Test error messages don't leak sensitive info
- [ ] Verify audit logs are created for sensitive operations
- [ ] Test input validation with edge cases
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Test authentication flows
- [ ] Verify RLS policies with different users

---

## Deployment Steps

1. **Development:**
   ```bash
   # Apply migrations
   cd supabase
   supabase migration up
   
   # Install new dependencies
   npm install
   
   # Test locally
   npm run dev
   ```

2. **Testing:**
   - Run security tests
   - Verify all endpoints work
   - Check browser console for CSP violations

3. **Production:**
   ```bash
   # Build and test
   npm run build
   
   # Deploy to Replit/Vercel
   git push origin main
   ```

4. **Post-Deployment:**
   - Run migrations on production database
   - Verify security headers
   - Monitor error logs
   - Check audit logs

---

## Support

If you encounter issues implementing these fixes:

1. Check the main security report for context
2. Review Next.js security documentation
3. Test each fix independently
4. Monitor logs for errors

**Priority:** Implement P0 (Critical) fixes before deploying to production!

