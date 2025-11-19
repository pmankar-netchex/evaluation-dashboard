import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      'unknown';

    let limiter = apiLimiter;

    // Use stricter limits for authentication endpoints
    if (pathname.startsWith('/api/auth')) {
      limiter = authLimiter;
    }

    // Use stricter limits for expensive endpoints
    if (
      pathname.includes('/transcripts/') ||
      pathname.includes('/messages/') ||
      pathname.includes('/generate')
    ) {
      limiter = expensiveEndpointLimiter;
    }

    const result = await limiter.check(ip);

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

    // Add rate limit headers to response
    const response = await updateSession(request);
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());
    
    return response;
  }

  // Continue with session management for non-API routes
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

