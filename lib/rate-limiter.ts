import { createServiceClient } from '@/lib/supabase/server';

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
 * For production, consider using Redis or Upstash for better performance
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

    // Check if Supabase environment variables are configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('Rate limiter: Supabase environment variables not configured. Rate limiting disabled.');
      // Fail open - allow request if Supabase is not configured
      return {
        success: true,
        limit: this.config.max,
        remaining: this.config.max,
        reset: now + this.config.windowMs,
      };
    }

    // Timeout for rate limiter operations (2 seconds)
    const RATE_LIMITER_TIMEOUT = 2000;

    try {
      // Wrap Supabase operations in a timeout
      const rateLimitCheck = async () => {
        const supabase = await createServiceClient();

        // Clean up old entries (older than window) - fire and forget
        (async () => {
          try {
            await supabase
              .from('rate_limit_entries')
              .delete()
              .lt('timestamp', new Date(windowStart).toISOString());
          } catch {
            // Silently fail cleanup - not critical
          }
        })();

        // Count requests in current window
        const { count, error } = await supabase
          .from('rate_limit_entries')
          .select('*', { count: 'exact', head: true })
          .eq('key', key)
          .gte('timestamp', new Date(windowStart).toISOString());

        if (error) {
          throw error;
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

        // Record this request - fire and forget
        (async () => {
          try {
            await (supabase.from('rate_limit_entries') as any).insert({
              key,
              timestamp: new Date().toISOString(),
            });
          } catch {
            // Silently fail insert - not critical for rate limiting
          }
        })();

        return {
          success: true,
          limit: this.config.max,
          remaining: remaining - 1,
          reset: now + this.config.windowMs,
        };
      };

      // Race against timeout
      const timeoutPromise = new Promise<RateLimitResult>((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            limit: this.config.max,
            remaining: this.config.max,
            reset: now + this.config.windowMs,
          });
        }, RATE_LIMITER_TIMEOUT);
      });

      return await Promise.race([rateLimitCheck(), timeoutPromise]);
    } catch (error) {
      // Handle network errors and other exceptions
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage.includes('timeout') || 
                       errorMessage.includes('Timeout') ||
                       errorMessage.includes('HeadersTimeoutError') ||
                       errorMessage.includes('fetch failed');
      
      // Only log non-timeout errors to reduce noise
      if (!isTimeout) {
        console.error('Rate limiter error:', {
          message: errorMessage,
        });
      }
      
      // Fail open - allow request if rate limiter fails
      return {
        success: true,
        limit: this.config.max,
        remaining: this.config.max,
        reset: now + this.config.windowMs,
      };
    }
  }
}

