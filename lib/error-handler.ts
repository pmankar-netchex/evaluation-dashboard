import { NextResponse } from 'next/server';
import { logger } from './logger';

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
  logger.error(`[${operation}] Error`, error);

  // SafeApiError - use the message as-is
  if (error instanceof SafeApiError) {
    const response: Record<string, unknown> = {
      error: error.message,
    };
    
    if (error.code) {
      response.code = error.code;
    }
    
    if (isDev && error.internalDetails) {
      response.details = error.internalDetails;
    }
    
    return NextResponse.json(response, { status: error.statusCode });
  }

  // Standard Error
  if (error instanceof Error) {
    const response: Record<string, unknown> = {
      error: 'An error occurred',
    };
    
    if (isDev) {
      response.details = error.message;
      response.stack = error.stack;
    }
    
    return NextResponse.json(response, { status: 500 });
  }

  // Unknown error
  const response: Record<string, unknown> = {
    error: 'An unexpected error occurred',
  };
  
  if (isDev) {
    response.details = String(error);
  }
  
  return NextResponse.json(response, { status: 500 });
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

