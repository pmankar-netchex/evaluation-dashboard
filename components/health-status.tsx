'use client';

import { useEffect, useState, useRef } from 'react';

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
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Close expanded view when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  const status = error || !health ? 'unhealthy' : health.status;
  const statusText = loading ? 'Checking...' : error || !health ? 'System Error' : `System ${health.status.charAt(0).toUpperCase() + health.status.slice(1)}`;

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
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Status Dot */}
      <div
        className="w-2 h-2 rounded-full cursor-pointer transition-all duration-200 hover:scale-125"
        style={{ 
          backgroundColor: loading ? '#757575' : getStatusColor(status),
          animation: loading ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
        }}
        title={statusText}
      />

      {/* Tooltip on Hover */}
      {showTooltip && !isExpanded && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-[#212121] text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none">
          {statusText}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#212121]"></div>
        </div>
      )}

      {/* Expanded View - Show on Click */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#eeeeee] rounded-lg shadow-lg z-50">
          <div className="p-3 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#f5f5f5]">
              <h3 className="text-sm font-medium text-[#212121]">System Health</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="text-[#757575] hover:text-[#212121] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loading && (
              <div className="py-4 text-center text-sm text-[#757575]">
                Checking system health...
              </div>
            )}

            {error && !health && (
              <div className="py-4 text-center text-sm text-[#f44336]">
                {error}
              </div>
            )}

            {health && (
              <>
                {/* Status Summary */}
                <div className="flex items-center gap-2 pb-2 border-b border-[#f5f5f5]">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getStatusColor(health.status) }}
                  ></div>
                  <span
                    className="text-sm font-medium capitalize"
                    style={{ color: getStatusColor(health.status) }}
                  >
                    {health.status}
                  </span>
                </div>
          {/* Database */}
          <div className="flex items-center justify-between py-1.5 border-b border-[#f5f5f5]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: getStatusColor(health.checks.database.status) }}>
                {getStatusIcon(health.checks.database.status)}
              </span>
              <span className="text-xs text-[#212121]">Database</span>
            </div>
            <div className="flex items-center gap-1.5">
              {health.checks.database.latency !== undefined && (
                <span className="text-[10px] text-[#757575]">
                  {health.checks.database.latency}ms
                </span>
              )}
              <span
                className="text-[10px] capitalize"
                style={{ color: getStatusColor(health.checks.database.status) }}
              >
                {health.checks.database.status}
              </span>
            </div>
          </div>

          {/* Salesforce */}
          <div className="flex items-center justify-between py-1.5 border-b border-[#f5f5f5]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: getStatusColor(health.checks.salesforce.status) }}>
                {getStatusIcon(health.checks.salesforce.status)}
              </span>
              <span className="text-xs text-[#212121]">Salesforce</span>
            </div>
            <span
              className="text-[10px] capitalize"
              style={{ color: getStatusColor(health.checks.salesforce.status) }}
            >
              {health.checks.salesforce.configured ? 'Configured' : 'Not Configured'}
            </span>
          </div>

          {/* Sierra */}
          <div className="flex items-center justify-between py-1.5 border-b border-[#f5f5f5]">
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: getStatusColor(health.checks.sierra.status) }}>
                {getStatusIcon(health.checks.sierra.status)}
              </span>
              <span className="text-xs text-[#212121]">Sierra</span>
            </div>
            <span
              className="text-[10px] capitalize"
              style={{ color: getStatusColor(health.checks.sierra.status) }}
            >
              {health.checks.sierra.configured ? 'Configured' : 'Not Configured'}
            </span>
          </div>

          {/* System Info */}
          <div className="pt-1.5 mt-1.5 border-t border-[#eeeeee]">
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
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
                <span className="text-[#757575]">Env:</span>{' '}
                <span className="text-[#212121] capitalize">{health.environment}</span>
              </div>
              <div>
                <span className="text-[#757575]">Response:</span>{' '}
                <span className="text-[#212121]">{health.responseTime}ms</span>
              </div>
            </div>
          </div>

                <div className="pt-2 mt-2 border-t border-[#eeeeee] text-[10px] text-[#9e9e9e] text-right">
                  {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

