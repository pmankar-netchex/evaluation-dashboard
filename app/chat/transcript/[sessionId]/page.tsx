'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChatSession, ChatMessage, ChatEvaluation } from '@/types';
import { EvaluationDisplay } from '@/components/evaluation-display';

interface SessionWithMessages extends ChatSession {
  messages?: ChatMessage[];
  has_evaluation?: boolean;
  evaluation?: ChatEvaluation;
}

export default function ChatTranscriptPage() {
  const [session, setSession] = useState<SessionWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  useEffect(() => {
    if (sessionId) {
      loadSessionDetails(sessionId);
    }
  }, [sessionId]);

  const loadSessionDetails = async (sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/${sessionId}`);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have permission to view this session');
        }
        if (response.status === 404) {
          throw new Error('Session not found');
        }
        throw new Error('Failed to load session details');
      }

      const data = await response.json();
      setSession({
        ...data.session,
        messages: data.messages,
        has_evaluation: !!data.evaluation,
        evaluation: data.evaluation,
      });
    } catch (err: unknown) {
      console.error('Error loading session details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session details');
    } finally {
      setLoading(false);
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
            Chat Transcript
          </h1>
          <p className="mt-1 text-sm font-normal leading-5 text-[#757575]">
            View conversation transcript
          </p>
        </div>
        <button
          onClick={() => router.push('/logs')}
          className="bg-[#2196f3] text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-[#1976d2] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          Back to Logs
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-[#ffebee] border border-[#f44336] p-4">
          <p className="text-sm font-normal leading-5 text-[#c62828]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-[#eeeeee] rounded-lg shadow-sm p-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2196f3]"></div>
            <p className="mt-2 text-sm font-normal leading-5 text-[#757575]">Loading transcript...</p>
          </div>
        </div>
      ) : session ? (
        <div className="bg-white border border-[#eeeeee] rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#eeeeee]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-[#212121]">
                  Conversation Details
                </h2>
                <p className="text-xs text-[#757575] mt-1">
                  {formatDate(session.started_at)}
                  {session.ended_at && (
                    <> • Duration: {getSessionDuration(session.started_at, session.ended_at)}</>
                  )}
                </p>
              </div>
              {session.has_evaluation ? (
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
            {session.messages && session.messages.length > 0 ? (
              session.messages.map((message) => (
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
          {session.evaluation && (
            <div className="px-6 py-4 border-t border-[#eeeeee]">
              <EvaluationDisplay evaluation={session.evaluation} />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#eeeeee] rounded-lg shadow-sm p-6">
          <div className="text-center py-12">
            <p className="text-sm font-normal leading-5 text-[#757575]">
              Session not found
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

