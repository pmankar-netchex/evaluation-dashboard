'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChatSession, ChatMessage, ChatEvaluation } from '@/types';
import { EvaluationDisplay } from '@/components/evaluation-display';

interface SessionWithMessages extends ChatSession {
  messages?: ChatMessage[];
  has_evaluation?: boolean;
  evaluation?: ChatEvaluation;
  message_count?: number;
}

interface SessionListItem {
  id: string;
  started_at: string;
  ended_at?: string;
  session_status: string;
  has_evaluation: boolean;
  chat_messages: { count: number }[];
}

export default function ChatHistoryPage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadSessions();
  }, []);

  // Auto-load session from query parameter
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId && sessions.length > 0) {
      // Check if this session exists in the loaded sessions
      const sessionExists = sessions.some(s => s.id === sessionId);
      if (sessionExists) {
        loadSessionDetails(sessionId);
      }
    }
  }, [searchParams, sessions]);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat?limit=50');
      
      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err: unknown) {
      console.error('Error loading sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    setLoadingSession(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load session details');
      }

      const data = await response.json();
      setSelectedSession({
        ...data.session,
        messages: data.messages,
        has_evaluation: !!data.evaluation,
        evaluation: data.evaluation,
      });
    } catch (err: unknown) {
      console.error('Error loading session details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session details');
    } finally {
      setLoadingSession(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSessionDuration = (startedAt: string, endedAt?: string) => {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    
    if (minutes < 1) return 'Less than a minute';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-normal leading-[40px] text-[#212121]">
            Chat History
          </h1>
          <p className="mt-1 text-sm font-normal leading-5 text-[#757575]">
            View your previous conversations with Sierra
          </p>
        </div>
        <button
          onClick={() => router.push('/chat')}
          className="bg-[#2196f3] text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-[#1976d2] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          Start New Chat
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-[#ffebee] border border-[#f44336] p-4">
          <p className="text-sm font-normal leading-5 text-[#c62828]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2196f3]"></div>
          <p className="mt-2 text-sm font-normal leading-5 text-[#757575]">Loading history...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
          <p className="text-sm font-normal leading-5 text-[#212121] mb-4">
            No chat history yet
          </p>
          <button
            onClick={() => router.push('/chat')}
            className="bg-[#2196f3] text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-[#1976d2] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            Start Your First Chat
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-[#eeeeee] rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#eeeeee]">
                <h2 className="text-lg font-medium text-[#212121]">Sessions</h2>
                <p className="text-xs text-[#757575] mt-1">
                  {sessions.length} total
                </p>
              </div>
              <div className="divide-y divide-[#eeeeee] overflow-y-auto" style={{ maxHeight: '600px' }}>
                {sessions.map((session) => {
                  const messageCount = session.chat_messages?.[0]?.count || 0;
                  return (
                    <button
                      key={session.id}
                      onClick={() => loadSessionDetails(session.id)}
                      className={`w-full text-left px-6 py-4 hover:bg-[#f5f5f5] transition-colors ${
                        selectedSession?.id === session.id ? 'bg-[#e3f2fd]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-[#212121]">
                              {formatDate(session.started_at)}
                            </span>
                            {session.has_evaluation && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#4caf50] text-white">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#757575]">
                            <span>{messageCount} messages</span>
                            <span>•</span>
                            <span>{getSessionDuration(session.started_at, session.ended_at)}</span>
                          </div>
                          {session.session_status === 'active' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#2196f3] text-white mt-1">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Session Details */}
          <div className="lg:col-span-2">
            {loadingSession ? (
              <div className="bg-white border border-[#eeeeee] rounded-lg shadow-sm p-6">
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2196f3]"></div>
                  <p className="mt-2 text-sm font-normal leading-5 text-[#757575]">Loading conversation...</p>
                </div>
              </div>
            ) : selectedSession ? (
              <div className="bg-white border border-[#eeeeee] rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#eeeeee]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-[#212121]">
                        Conversation Details
                      </h2>
                      <p className="text-xs text-[#757575] mt-1">
                        {formatDate(selectedSession.started_at)}
                        {selectedSession.ended_at && (
                          <> • Duration: {getSessionDuration(selectedSession.started_at, selectedSession.ended_at)}</>
                        )}
                      </p>
                    </div>
                    {selectedSession.has_evaluation ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#4caf50] text-white">
                        Feedback Submitted
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#ff9800] text-white">
                        No Feedback
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-6 py-4 space-y-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
                  {selectedSession.messages && selectedSession.messages.length > 0 ? (
                    selectedSession.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-[#2196f3] text-white'
                              : 'bg-[#f5f5f5] text-[#212121]'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {message.role === 'assistant' && (
                              <span className="text-lg">🏔️</span>
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-normal leading-5 whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              <p
                                className={`text-xs font-normal leading-4 mt-1 ${
                                  message.role === 'user' ? 'text-[#e3f2fd]' : 'text-[#9e9e9e]'
                                }`}
                              >
                                {new Date(message.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            {message.role === 'user' && (
                              <span className="text-lg">👤</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-sm font-normal leading-5 text-[#757575]">
                        No messages in this conversation
                      </p>
                    </div>
                  )}
                </div>

                {/* Show evaluation if exists */}
                {selectedSession.evaluation && (
                  <div className="px-6 py-4 border-t border-[#eeeeee]">
                    <EvaluationDisplay evaluation={selectedSession.evaluation} />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-[#eeeeee] rounded-lg shadow-sm p-6">
                <div className="text-center py-12">
                  <p className="text-sm font-normal leading-5 text-[#757575]">
                    Select a session from the list to view the conversation
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

