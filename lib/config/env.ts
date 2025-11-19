/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present at runtime
 */

// Server-side environment variables (never exposed to client)
const serverEnvSchema = {
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Salesforce
  SALESFORCE_CLIENT_ID: process.env.SALESFORCE_CLIENT_ID,
  SALESFORCE_CLIENT_SECRET: process.env.SALESFORCE_CLIENT_SECRET,
  SALESFORCE_OAUTH_URL: process.env.SALESFORCE_OAUTH_URL,
  SALESFORCE_API_VERSION: process.env.SALESFORCE_API_VERSION || 'v65.0',
  
  // Sierra
  SIERRA_API_KEY: process.env.SIERRA_API_KEY,
  SIERRA_API_TOKEN: process.env.SIERRA_API_TOKEN,
  SIERRA_API_URL: process.env.SIERRA_API_URL || 'https://api.sierra.chat',
  SIERRA_VERSION: process.env.SIERRA_VERSION || 'v2.1.0',
} as const;

// Client-side environment variables (safe to expose to browser)
const clientEnvSchema = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

/**
 * Validate that all required environment variables are present
 * Call this at application startup to fail fast if misconfigured
 */
export function validateEnv() {
  const errors: string[] = [];

  // Validate server-side variables
  const requiredServerVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SALESFORCE_CLIENT_ID',
    'SALESFORCE_CLIENT_SECRET',
    'SALESFORCE_OAUTH_URL',
    'SIERRA_API_KEY',
    'SIERRA_API_TOKEN',
  ] as const;

  for (const key of requiredServerVars) {
    if (!serverEnvSchema[key]) {
      errors.push(`Missing required server environment variable: ${key}`);
    }
  }

  // Validate client-side variables
  const requiredClientVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ] as const;

  for (const key of requiredClientVars) {
    if (!clientEnvSchema[key]) {
      errors.push(`Missing required client environment variable: ${key}`);
    }
  }

  if (errors.length > 0) {
    const errorMessage = [
      '❌ Environment Configuration Error:',
      '',
      ...errors,
      '',
      '📝 To fix this:',
      '1. Copy .env.example to .env.local',
      '2. Fill in all required values',
      '3. Restart the development server',
      '',
      'For Replit deployment, add these as Secrets in the Replit UI.',
    ].join('\n');

    throw new Error(errorMessage);
  }
}

/**
 * Get the base URL for the application
 * Automatically detects Replit, Vercel, and local environments
 */
export function getBaseUrl(): string {
  // Explicit configuration takes precedence
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Replit environment
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }

  // Vercel environment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local development
  return 'http://localhost:3000';
}

/**
 * Check if running in Replit environment
 */
export function isReplit(): boolean {
  return process.env.REPL_ID !== undefined;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Export typed environment configuration
 * Use these instead of process.env directly for better type safety
 */
export const env = {
  // Server-only variables
  server: serverEnvSchema,
  
  // Client-safe variables
  client: clientEnvSchema,
  
  // Utility functions
  getBaseUrl,
  isReplit: isReplit(),
  isDevelopment: isDevelopment(),
  isProduction: isProduction(),
} as const;

// Type exports for convenience
export type ServerEnv = typeof serverEnvSchema;
export type ClientEnv = typeof clientEnvSchema;

