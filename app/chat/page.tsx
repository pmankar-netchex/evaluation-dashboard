'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { ChatFeedbackForm } from '@/components/chat-feedback-form';
import { Toast } from '@/components/toast';
import { ChatSession, ChatMessage, SimplifiedEvaluationScores } from '@/types';

export default function ChatPage() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  const router = useRouter();

  // Create or load active session
  useEffect(() => {
    const initializeSession = async () => {
      setLoading(true);
      try {
        // Check if there's an active session
        const response = await fetch('/api/chat?status=active&limit=1');
        if (!response.ok) {
          throw new Error('Failed to check for active session');
        }

        const data = await response.json();
        
        if (data.sessions && data.sessions.length > 0) {
          // Load existing active session
          const activeSession = data.sessions[0];
          await loadSession(activeSession.id);
        } else {
          // Create new session
          await createNewSession();
        }
      } catch (error: unknown) {
        console.error('Error initializing session:', error);
        setToast({
          message: error instanceof Error ? error.message : 'Failed to initialize chat',
          type: 'error',
          isVisible: true,
        });
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, []);

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const newSession = await response.json();
      setSession(newSession);
      setMessages([]);
      setShowFeedbackForm(false);
      setFeedbackSubmitted(false);
    } catch (error: unknown) {
      console.error('Error creating session:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to create chat session',
        type: 'error',
        isVisible: true,
      });
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/${sessionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const data = await response.json();
      setSession(data.session);
      setMessages(data.messages || []);
      
      // If session is ended and has no evaluation, show feedback form
      if (data.session.session_status === 'ended' && !data.evaluation) {
        setShowFeedbackForm(true);
      } else if (data.evaluation) {
        setFeedbackSubmitted(true);
      }
    } catch (error: unknown) {
      console.error('Error loading session:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to load session',
        type: 'error',
        isVisible: true,
      });
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!session) return;

    // Create optimistic user message and add it immediately
    const optimisticUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: session.id,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    
    // Show user message immediately
    setMessages((prev) => [...prev, optimisticUserMessage]);

    try {
      const response = await fetch(`/api/chat/${session.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      
      // Replace optimistic message with actual messages from server
      setMessages((prev) => {
        // Remove the optimistic message
        const withoutOptimistic = prev.filter(m => m.id !== optimisticUserMessage.id);
        // Add both user and assistant messages from server
        return [...withoutOptimistic, data.userMessage, data.assistantMessage];
      });
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== optimisticUserMessage.id));
      setToast({
        message: error instanceof Error ? error.message : 'Failed to send message',
        type: 'error',
        isVisible: true,
      });
    }
  };

  const handleEndSession = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/chat/${session.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_status: 'ended' }),
      });

      if (!response.ok) {
        throw new Error('Failed to end session');
      }

      const updatedSession = await response.json();
      setSession(updatedSession);
      setShowFeedbackForm(true);
      
      setToast({
        message: 'Session ended. Please provide feedback.',
        type: 'info',
        isVisible: true,
      });
    } catch (error: unknown) {
      console.error('Error ending session:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to end session',
        type: 'error',
        isVisible: true,
      });
    }
  };

  const handleSubmitFeedback = async (evaluation: {
    scores: SimplifiedEvaluationScores;
    notes?: string;
  }) => {
    if (!session) return;

    try {
      const response = await fetch(`/api/chat/${session.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      setFeedbackSubmitted(true);
      setShowFeedbackForm(false);
      
      setToast({
        message: 'Feedback submitted successfully!',
        type: 'success',
        isVisible: true,
      });

      // Optionally redirect to history after a delay
      setTimeout(() => {
        router.push('/chat/history');
      }, 2000);
    } catch (error: unknown) {
      console.error('Error submitting feedback:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to submit feedback',
        type: 'error',
        isVisible: true,
      });
    }
  };

  const handleStartNewChat = () => {
    // Redirect to reload page with new session
    router.refresh();
    createNewSession();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2196f3]"></div>
          <p className="mt-2 text-sm font-normal leading-5 text-[#757575]">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
        duration={3000}
      />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-normal leading-[40px] text-[#212121]">
            Sierra Chat
          </h1>
          <p className="mt-1 text-sm font-normal leading-5 text-[#757575]">
            Have a conversation with Sierra and provide feedback
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/chat/history')}
            className="bg-transparent border-2 border-[#2196f3] text-[#2196f3] px-6 py-2 rounded-full font-medium text-sm hover:bg-[#e3f2fd] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 transition-colors duration-200"
          >
            View History
          </button>
          {feedbackSubmitted && (
            <button
              onClick={handleStartNewChat}
              className="bg-[#2196f3] text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-[#1976d2] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              Start New Chat
            </button>
          )}
        </div>
      </div>

      {session && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Interface */}
          <div>
            <ChatInterface
              sessionId={session.id}
              messages={messages}
              onSendMessage={handleSendMessage}
              onEndSession={handleEndSession}
              isSessionActive={session.session_status === 'active'}
              isLoading={loading}
            />
          </div>

          {/* Feedback Form or Submitted Message */}
          <div>
            {showFeedbackForm && !feedbackSubmitted ? (
              <ChatFeedbackForm
                onSubmit={handleSubmitFeedback}
                disabled={loading}
              />
            ) : feedbackSubmitted ? (
              <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✓</div>
                  <h3 className="text-[22px] font-medium leading-[28px] text-[#212121] mb-2">
                    Feedback Submitted
                  </h3>
                  <p className="text-sm font-normal leading-5 text-[#757575] mb-6">
                    Thank you for your feedback!
                  </p>
                  <button
                    onClick={handleStartNewChat}
                    className="bg-[#2196f3] text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-[#1976d2] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    Start New Chat
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
                <div className="text-center py-12">
                  <p className="text-sm font-normal leading-5 text-[#757575]">
                    Start chatting with Sierra, then click &quot;End Session&quot; to provide feedback
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

