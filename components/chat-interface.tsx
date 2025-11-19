'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';
import { sanitizeText } from '@/lib/sanitize';

interface ChatInterfaceProps {
  sessionId: string;
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
  onEndSession: () => void;
  isSessionActive: boolean;
  isLoading: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  onEndSession,
  isSessionActive,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (isSessionActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSessionActive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isSending || !isSessionActive) {
      return;
    }

    const messageContent = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    try {
      await onSendMessage(messageContent);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-[#eeeeee] rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeeeee]">
        <div>
          <h2 className="text-[22px] font-medium leading-[28px] text-[#212121]">
            🏔️ Chat with Sierra
          </h2>
          <p className="text-xs font-normal leading-4 text-[#757575] mt-1">
            {isSessionActive ? 'Session active' : 'Session ended'}
          </p>
        </div>
        {isSessionActive && (
          <button
            onClick={onEndSession}
            className="bg-[#f44336] text-white px-4 py-2 rounded-full font-medium text-sm hover:bg-[#d32f2f] focus:outline-none focus:ring-2 focus:ring-[#f44336] focus:ring-offset-2 transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            End Session
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ minHeight: '400px', maxHeight: '600px' }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm font-normal leading-5 text-[#757575]">
                Start a conversation with Sierra
              </p>
              <p className="text-xs font-normal leading-4 text-[#9e9e9e] mt-2">
                Type a message below to begin
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
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
                        {sanitizeText(message.content)}
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
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-lg px-4 py-3 bg-[#f5f5f5] text-[#212121]">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">🏔️</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-[#757575] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-[#757575] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-[#757575] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#eeeeee]">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isSessionActive || isSending}
            placeholder={isSessionActive ? "Type your message..." : "Session ended. Start a new chat to continue."}
            rows={1}
            className="flex-1 px-4 py-3 border border-[#e0e0e0] rounded-lg text-[#212121] bg-white focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3] disabled:bg-[#f5f5f5] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-all duration-200 resize-none"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            type="submit"
            disabled={!isSessionActive || isSending || !inputValue.trim()}
            className="bg-[#2196f3] text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-[#1976d2] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>
        <p className="text-xs font-normal leading-4 text-[#757575] mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

