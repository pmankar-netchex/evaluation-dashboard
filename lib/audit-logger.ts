import { createServiceClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';
import { logger } from './logger';

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
  metadata?: Record<string, unknown>;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createServiceClient();
    
    // Type assertion needed as audit_logs table is created via migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('audit_logs') as any).insert({
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
    
    logger.info('Audit log created', { action: entry.action, resourceType: entry.resourceType });
  } catch (error) {
    // Don't fail the request if audit logging fails
    logger.error('Audit logging failed', error, { action: entry.action });
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
  LIST_EVALUATIONS: 'LIST_EVALUATIONS',
  
  // Transcripts
  VIEW_TRANSCRIPT: 'VIEW_TRANSCRIPT',
  GENERATE_SIERRA_TRANSCRIPT: 'GENERATE_SIERRA_TRANSCRIPT',
  LIST_TRANSCRIPTS: 'LIST_TRANSCRIPTS',
  
  // Chat
  CREATE_CHAT_SESSION: 'CREATE_CHAT_SESSION',
  SEND_MESSAGE: 'SEND_MESSAGE',
  END_CHAT_SESSION: 'END_CHAT_SESSION',
  VIEW_CHAT_HISTORY: 'VIEW_CHAT_HISTORY',
  
  // Data Export
  EXPORT_DATA: 'EXPORT_DATA',
  EXPORT_ANALYTICS: 'EXPORT_ANALYTICS',
  
  // System
  HEALTH_CHECK: 'HEALTH_CHECK',
};

