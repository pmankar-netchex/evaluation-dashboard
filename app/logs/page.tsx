'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface LogEntry {
  id: string;
  evaluationType: 'case_comparison' | 'custom_chat';
  caseNumber: string;
  transcriptId?: string;
  chatSessionId?: string;
  winner: 'sierra' | 'agentforce' | 'tie' | 'both_poor' | null;
  scores: {
    resolution?: { af: number; sierra: number } | number;
    empathy?: { af: number; sierra: number } | number;
    efficiency?: { af: number; sierra: number } | number;
    accuracy?: { af: number; sierra: number } | number;
  };
  notes?: string;
  evaluatorEmail: string;
  evaluationDate: string;
  chatStarted?: string;
  chatEnded?: string;
}

const ITEMS_PER_PAGE = 10;

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState({
    caseId: true,
    winner: true,
    resolution: true,
    empathy: true,
    efficiency: true,
    accuracy: true,
    evaluator: true,
    date: true,
    notes: true,
    actions: true,
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const columnButtonRef = useRef<HTMLButtonElement>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to view logs');
        return;
      }

      const response = await fetch('/api/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const data = await response.json();
      setLogs(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  // Filter logs based on search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    
    const query = searchQuery.toLowerCase();
    return logs.filter((log) => {
      return (
        log.caseNumber.toLowerCase().includes(query) ||
        log.evaluatorEmail.toLowerCase().includes(query) ||
        (log.winner && log.winner.toLowerCase().includes(query)) ||
        (log.notes && log.notes.toLowerCase().includes(query))
      );
    });
  }, [logs, searchQuery]);

  // Paginate filtered logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWinnerLabel = (winner: string | null) => {
    if (!winner) return 'Chat';
    switch (winner) {
      case 'agentforce':
        return 'Agentforce';
      case 'sierra':
        return 'Sierra';
      case 'tie':
        return 'Tie';
      case 'both_poor':
        return 'Both Poor';
      default:
        return winner;
    }
  };

  const getWinnerColor = (winner: string | null) => {
    if (!winner) return 'bg-[#e8eaf6] text-[#5e35b1] border-[#5e35b1]';
    switch (winner) {
      case 'agentforce':
        return 'bg-[#e0f2f1] text-[#009688] border-[#009688]';
      case 'sierra':
        return 'bg-[#f3e5f5] text-[#9c27b0] border-[#9c27b0]';
      case 'tie':
        return 'bg-[#fff3e0] text-[#ff9800] border-[#ff9800]';
      case 'both_poor':
        return 'bg-[#ffebee] text-[#f44336] border-[#f44336]';
      default:
        return 'bg-[#f5f5f5] text-[#757575] border-[#757575]';
    }
  };

  // Helper to get score value - handles both comparison and chat evaluation formats
  const getScoreValue = (score: { af: number; sierra: number } | number | undefined, bot: 'af' | 'sierra') => {
    if (!score) return '-';
    if (typeof score === 'number') {
      // Chat evaluation - only has Sierra score
      return bot === 'sierra' ? score : '-';
    }
    // Comparison evaluation - has both
    return score[bot] || '-';
  };

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const getColumnLabel = (key: string) => {
    const labels: Record<string, string> = {
      caseId: 'Case ID',
      winner: 'Winner',
      resolution: 'Resolution',
      empathy: 'Empathy',
      efficiency: 'Efficiency',
      accuracy: 'Accuracy',
      evaluator: 'Evaluator',
      date: 'Date',
      notes: 'Notes',
      actions: 'Actions',
    };
    return labels[key] || key;
  };

  // Navigate based on evaluation type
  const handleViewTranscript = (log: LogEntry) => {
    if (log.evaluationType === 'custom_chat' && log.chatSessionId) {
      // For chat evaluations, go to chat history with session ID
      router.push(`/chat/history?session=${log.chatSessionId}`);
    } else if (log.evaluationType === 'case_comparison' && log.caseNumber && log.caseNumber !== 'Unknown') {
      // For comparison evaluations, go to dashboard with case number in VIEW MODE (read-only)
      router.push(`/dashboard?case=${encodeURIComponent(log.caseNumber)}&mode=view`);
    } else {
      console.error('Cannot view transcript: missing required data', log);
    }
  };

  const handleColumnMenuToggle = () => {
    if (!showColumnMenu && columnButtonRef.current) {
      const rect = columnButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // 8px = mt-2 spacing
        right: window.innerWidth - rect.right,
      });
    }
    setShowColumnMenu(!showColumnMenu);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2196f3]"></div>
        <p className="mt-2 text-sm font-normal leading-5 text-[#757575]">Loading logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-[#ffebee] border border-[#f44336] p-4">
        <p className="text-sm font-normal leading-5 text-[#c62828]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-normal leading-[40px] text-[#212121]">Evaluation Logs</h1>
        <p className="mt-1 text-sm font-normal leading-5 text-[#757575]">
          View all case evaluations with results, evaluators, and assessment dates
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-[#eeeeee] rounded-lg p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by case ID, evaluator, winner, or notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="w-full px-4 py-2 border border-[#e0e0e0] rounded-lg text-sm text-[#212121] bg-white focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3] transition-all duration-200"
            />
          </div>
          
          {/* Column Selector Dropdown */}
          <div className="inline-block">
            <button
              ref={columnButtonRef}
              onClick={handleColumnMenuToggle}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#212121] bg-white border border-[#e0e0e0] rounded-lg hover:bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 transition-colors"
            >
              <span>Columns</span>
              <svg
                className={`w-4 h-4 transition-transform ${showColumnMenu ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {searchQuery && (
          <div className="mt-3 text-xs text-[#757575]">
            Showing {filteredLogs.length} of {logs.length} evaluations
          </div>
        )}
      </div>

      {/* Dropdown menu - positioned fixed to avoid layout shifts */}
      {showColumnMenu && dropdownPosition && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowColumnMenu(false)}
          />
          <div
            className="fixed w-56 bg-white border border-[#e0e0e0] rounded-lg shadow-lg z-50 py-2"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            <div className="px-3 py-2 border-b border-[#e0e0e0]">
              <p className="text-xs font-semibold text-[#757575] uppercase tracking-wider">Select Columns</p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {Object.entries(visibleColumns).map(([key, visible]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-[#f5f5f5] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                    className="w-4 h-4 text-[#2196f3] border-[#e0e0e0] rounded focus:ring-[#2196f3]"
                  />
                  <span className="text-sm text-[#212121]">
                    {getColumnLabel(key)}
                  </span>
                </label>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-[#e0e0e0] flex gap-2">
              <button
                onClick={() => {
                  setVisibleColumns({
                    caseId: true,
                    winner: true,
                    resolution: true,
                    empathy: true,
                    efficiency: true,
                    accuracy: true,
                    evaluator: true,
                    date: true,
                    notes: true,
                    actions: true,
                  });
                }}
                className="text-xs text-[#2196f3] hover:text-[#1976d2] font-medium"
              >
                Show All
              </button>
              <span className="text-[#e0e0e0]">|</span>
              <button
                onClick={() => {
                  setVisibleColumns({
                    caseId: true,
                    winner: true,
                    resolution: false,
                    empathy: false,
                    efficiency: false,
                    accuracy: false,
                    evaluator: true,
                    date: true,
                    notes: false,
                    actions: true,
                  });
                }}
                className="text-xs text-[#2196f3] hover:text-[#1976d2] font-medium"
              >
                Hide Scores
              </button>
            </div>
          </div>
        </>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
          <p className="text-sm font-normal leading-5 text-[#212121]">No evaluations found.</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
          <p className="text-sm font-normal leading-5 text-[#212121]">No evaluations match your search.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-[#eeeeee] rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                  <tr>
                    {visibleColumns.caseId && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#757575] uppercase tracking-wider whitespace-nowrap">
                        Case ID
                      </th>
                    )}
                    {visibleColumns.winner && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#757575] uppercase tracking-wider whitespace-nowrap">
                        Winner
                      </th>
                    )}
                    {visibleColumns.resolution && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[#757575] uppercase tracking-wider whitespace-nowrap">
                        Resolution
                      </th>
                    )}
                    {visibleColumns.empathy && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[#757575] uppercase tracking-wider whitespace-nowrap">
                        Empathy
                      </th>
                    )}
                    {visibleColumns.efficiency && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[#757575] uppercase tracking-wider whitespace-nowrap">
                        Efficiency
                      </th>
                    )}
                    {visibleColumns.accuracy && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[#757575] uppercase tracking-wider whitespace-nowrap">
                        Accuracy
                      </th>
                    )}
                    {visibleColumns.evaluator && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#757575] uppercase tracking-wider whitespace-nowrap">
                        Evaluator
                      </th>
                    )}
                    {visibleColumns.date && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#757575] uppercase tracking-wider whitespace-nowrap">
                        Date
                      </th>
                    )}
                    {visibleColumns.notes && (
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#757575] uppercase tracking-wider whitespace-nowrap">
                        Notes
                      </th>
                    )}
                    {visibleColumns.actions && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[#757575] uppercase tracking-wider whitespace-nowrap">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#fafafa] transition-colors">
                      {visibleColumns.caseId && (
                        <td className="px-4 py-3 text-sm font-medium text-[#212121]">
                          <span className="font-mono text-[#2196f3]">{log.caseNumber}</span>
                        </td>
                      )}
                      {visibleColumns.winner && (
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getWinnerColor(log.winner)}`}>
                            {getWinnerLabel(log.winner)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.resolution && (
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs text-[#757575]">
                            <div className="font-medium text-[#212121]">AF {getScoreValue(log.scores.resolution, 'af')}</div>
                            <div className="text-[#9e9e9e]">S {getScoreValue(log.scores.resolution, 'sierra')}</div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.empathy && (
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs text-[#757575]">
                            <div className="font-medium text-[#212121]">AF {getScoreValue(log.scores.empathy, 'af')}</div>
                            <div className="text-[#9e9e9e]">S {getScoreValue(log.scores.empathy, 'sierra')}</div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.efficiency && (
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs text-[#757575]">
                            <div className="font-medium text-[#212121]">AF {getScoreValue(log.scores.efficiency, 'af')}</div>
                            <div className="text-[#9e9e9e]">S {getScoreValue(log.scores.efficiency, 'sierra')}</div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.accuracy && (
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs text-[#757575]">
                            <div className="font-medium text-[#212121]">AF {getScoreValue(log.scores.accuracy, 'af')}</div>
                            <div className="text-[#9e9e9e]">S {getScoreValue(log.scores.accuracy, 'sierra')}</div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.evaluator && (
                        <td className="px-4 py-3 text-sm text-[#212121]">
                          {log.evaluatorEmail}
                        </td>
                      )}
                      {visibleColumns.date && (
                        <td className="px-4 py-3 text-sm text-[#757575] whitespace-nowrap">
                          {formatDate(log.evaluationDate)}
                        </td>
                      )}
                      {visibleColumns.notes && (
                        <td className="px-4 py-3 text-sm text-[#757575] max-w-xs">
                          <div className="truncate" title={log.notes || ''}>
                            {log.notes || '-'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewTranscript(log)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#2196f3] hover:bg-[#1976d2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 transition-colors duration-200"
                            title={log.evaluationType === 'custom_chat' ? 'View chat session' : 'View transcript in Evaluator'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white border border-[#eeeeee] rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#757575]">
                  Showing <span className="font-medium text-[#212121]">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-medium text-[#212121]">
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)}
                  </span>{' '}
                  of <span className="font-medium text-[#212121]">{filteredLogs.length}</span> evaluations
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm font-medium text-[#212121] bg-white border border-[#e0e0e0] rounded-lg hover:bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-[#2196f3] text-white'
                              : 'text-[#212121] bg-white border border-[#e0e0e0] hover:bg-[#f5f5f5]'
                          } focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-[#212121] bg-white border border-[#e0e0e0] rounded-lg hover:bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

