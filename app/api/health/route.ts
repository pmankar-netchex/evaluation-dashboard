import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const startTime = Date.now();
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: { status: 'unknown', latency: 0, message: '' },
      salesforce: { status: 'unknown', configured: false },
      sierra: { status: 'unknown', configured: false },
    },
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
  };

  // Check Database Connection
  try {
    const dbCheckStart = Date.now();
    const supabase = await createServiceClient();
    
    const { error } = await supabase
      .from('transcripts')
      .select('id')
      .limit(1)
      .single();

    // It's ok if we get an error about no rows, that means database is connected
    const isDbHealthy = !error || error.code === 'PGRST116';
    
    status.checks.database = {
      status: isDbHealthy ? 'healthy' : 'unhealthy',
      latency: Date.now() - dbCheckStart,
      message: isDbHealthy ? 'Connected' : error?.message || 'Connection failed',
    };
  } catch (error: unknown) {
    status.checks.database = {
      status: 'unhealthy',
      latency: 0,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
    status.status = 'degraded';
  }

  // Check Salesforce Configuration
  status.checks.salesforce = {
    status: process.env.SALESFORCE_CLIENT_ID && 
            process.env.SALESFORCE_CLIENT_SECRET && 
            process.env.SALESFORCE_OAUTH_URL 
            ? 'configured' : 'not_configured',
    configured: !!(process.env.SALESFORCE_CLIENT_ID && 
                   process.env.SALESFORCE_CLIENT_SECRET && 
                   process.env.SALESFORCE_OAUTH_URL),
  };

  // Check Sierra Configuration
  status.checks.sierra = {
    status: process.env.SIERRA_API_KEY && 
            process.env.SIERRA_API_TOKEN 
            ? 'configured' : 'not_configured',
    configured: !!(process.env.SIERRA_API_KEY && process.env.SIERRA_API_TOKEN),
  };

  // Overall status
  if (status.checks.database.status === 'unhealthy') {
    status.status = 'unhealthy';
  } else if (!status.checks.salesforce.configured || !status.checks.sierra.configured) {
    status.status = 'degraded';
  }

  const responseTime = Date.now() - startTime;
  const httpStatus = status.status === 'healthy' ? 200 : 
                     status.status === 'degraded' ? 200 : 503;

  return NextResponse.json(
    {
      ...status,
      responseTime,
    },
    { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

