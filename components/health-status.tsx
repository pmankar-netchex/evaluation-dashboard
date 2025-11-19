'use client';

import { useEffect, useState } from 'react';

interface HealthCheck {
  status: string;
  latency?: number;
  message?: string;
  configured?: boolean;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    salesforce: HealthCheck;
    sierra: HealthCheck;
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    unit: string;
  };
  responseTime: number;
}

export function HealthStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch {
        setError('Failed to fetch health status');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-[#eeeeee] rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#757575] rounded-full animate-pulse"></div>
          <span className="text-sm text-[#757575]">Checking system health...</span>
        </div>
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="bg-white border border-[#f44336] rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#f44336] rounded-full"></div>
          <span className="text-sm text-[#f44336]">
            {error || 'Unable to fetch health status'}
          </span>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return '#4caf50';
      case 'degraded':
      case 'not_configured':
        return '#ff9800';
      case 'unhealthy':
        return '#f44336';
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return '✓';
      case 'degraded':
      case 'not_configured':
        return '⚠';
      case 'unhealthy':
        return '✗';
      default:
        return '?';
    }
  };

  return (
    <div 
      className="bg-white border border-[#eeeeee] rounded-lg shadow-sm transition-all duration-300 ease-in-out cursor-pointer"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Collapsed View - Always Visible */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-medium text-[#212121]">System Health</h3>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: getStatusColor(health.status) }}
            ></div>
            <span
              className="text-sm font-medium capitalize"
              style={{ color: getStatusColor(health.status) }}
            >
              {health.status}
            </span>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-[#757575] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded View - Show on Hover */}
      <div 
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? '500px' : '0',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="px-4 pb-4 space-y-3 border-t border-[#f5f5f5] pt-3">
          {/* Database */}
          <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
            <div className="flex items-center gap-2">
              <span style={{ color: getStatusColor(health.checks.database.status) }}>
                {getStatusIcon(health.checks.database.status)}
              </span>
              <span className="text-sm text-[#212121]">Database</span>
            </div>
            <div className="flex items-center gap-2">
              {health.checks.database.latency !== undefined && (
                <span className="text-xs text-[#757575]">
                  {health.checks.database.latency}ms
                </span>
              )}
              <span
                className="text-xs capitalize"
                style={{ color: getStatusColor(health.checks.database.status) }}
              >
                {health.checks.database.status}
              </span>
            </div>
          </div>

          {/* Salesforce */}
          <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
            <div className="flex items-center gap-2">
              <span style={{ color: getStatusColor(health.checks.salesforce.status) }}>
                {getStatusIcon(health.checks.salesforce.status)}
              </span>
              <span className="text-sm text-[#212121]">Salesforce API</span>
            </div>
            <span
              className="text-xs capitalize"
              style={{ color: getStatusColor(health.checks.salesforce.status) }}
            >
              {health.checks.salesforce.configured ? 'Configured' : 'Not Configured'}
            </span>
          </div>

          {/* Sierra */}
          <div className="flex items-center justify-between py-2 border-b border-[#f5f5f5]">
            <div className="flex items-center gap-2">
              <span style={{ color: getStatusColor(health.checks.sierra.status) }}>
                {getStatusIcon(health.checks.sierra.status)}
              </span>
              <span className="text-sm text-[#212121]">Sierra API</span>
            </div>
            <span
              className="text-xs capitalize"
              style={{ color: getStatusColor(health.checks.sierra.status) }}
            >
              {health.checks.sierra.configured ? 'Configured' : 'Not Configured'}
            </span>
          </div>

          {/* System Info */}
          <div className="pt-2 mt-2 border-t border-[#eeeeee]">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[#757575]">Uptime:</span>{' '}
                <span className="text-[#212121]">
                  {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
                </span>
              </div>
              <div>
                <span className="text-[#757575]">Memory:</span>{' '}
                <span className="text-[#212121]">
                  {health.memory.used}/{health.memory.total} {health.memory.unit}
                </span>
              </div>
              <div>
                <span className="text-[#757575]">Environment:</span>{' '}
                <span className="text-[#212121] capitalize">{health.environment}</span>
              </div>
              <div>
                <span className="text-[#757575]">Response:</span>{' '}
                <span className="text-[#212121]">{health.responseTime}ms</span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-[#9e9e9e] text-right">
            Last checked: {new Date(health.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}

