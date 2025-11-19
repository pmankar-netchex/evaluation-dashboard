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

    try {
      const supabase = await createServiceClient();

      // Clean up old entries (older than window)
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
        // Fail open - allow request if rate limiter fails
        return {
          success: true,
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
      // Type assertion needed as rate_limit_entries table is created via migration
      await (supabase.from('rate_limit_entries') as any).insert({
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

