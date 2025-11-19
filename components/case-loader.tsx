'use client';

import { useState } from 'react';
import { textStyles, colors, materialComponents, materialText, materialBorder, materialTypography } from '@/lib/design-tokens';

interface CaseLoaderProps {
  onLoadCase: (identifier: string, type: 'case' | 'messagingSession') => void;
  loading?: boolean;
  currentCaseNumber?: string;
  currentMessagingSessionId?: string;
  currentMessagingSessionName?: string;
}

export function CaseLoader({
  onLoadCase,
  loading = false,
  currentCaseNumber,
  currentMessagingSessionId,
  currentMessagingSessionName,
}: CaseLoaderProps) {
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<'case' | 'messagingSession'>('case');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onLoadCase(inputValue.trim(), inputType);
      setInputValue('');
    }
  };

  return (
    <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-medium leading-6 text-[#212121] mb-1">Load Transcript</h3>
        <p className="text-xs font-normal leading-4 text-[#757575]">Enter a Case Number or MessagingSessionId to fetch and compare transcripts</p>
      </div>
      <div className="flex flex-col gap-4">
        {/* Input Type Selector */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="inputType"
              value="case"
              checked={inputType === 'case'}
              onChange={(e) => setInputType(e.target.value as 'case' | 'messagingSession')}
              disabled={loading}
              className="w-4 h-4 text-[#2196f3] focus:ring-[#2196f3]"
            />
            <span className="text-sm font-medium text-[#212121]">Case Number</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="inputType"
              value="messagingSession"
              checked={inputType === 'messagingSession'}
              onChange={(e) => setInputType(e.target.value as 'case' | 'messagingSession')}
              disabled={loading}
              className="w-4 h-4 text-[#2196f3] focus:ring-[#2196f3]"
            />
            <span className="text-sm font-medium text-[#212121]">MessagingSessionId</span>
          </label>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <label htmlFor="identifier-input" className="block text-xs font-medium text-[#757575] mb-1">
              {inputType === 'case' ? 'Case Number' : 'MessagingSessionId'}
            </label>
            <input
              id="identifier-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputType === 'case' ? 'e.g., 02173888' : 'e.g., 0M5...'}
              disabled={loading}
              className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg text-[#212121] bg-white focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3] disabled:bg-[#f5f5f5] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-all duration-200"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="bg-[#2196f3] text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-[#1976d2] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md whitespace-nowrap h-[42px]"
            >
              {loading ? 'Loading...' : 'Load Transcripts'}
            </button>
          </div>
        </form>
      </div>

      {(currentCaseNumber || currentMessagingSessionId) && (
        <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
          <div className="text-sm font-normal leading-5 text-[#757575]">
            {currentCaseNumber && (
              <>
                <span className="font-medium text-[#212121]">Current Case:</span>{' '}
                <span className="font-mono text-[#2196f3]">{currentCaseNumber}</span>
              </>
            )}
            {currentMessagingSessionId && (
              <>
                {currentCaseNumber && <br className="mt-1" />}
                <span className="font-medium text-[#212121]">MessagingSessionId:</span>{' '}
                <span className="font-mono text-[#2196f3]">{currentMessagingSessionId}</span>
              </>
            )}
            {currentMessagingSessionName && (
              <>
                {(currentCaseNumber || currentMessagingSessionId) && <br className="mt-1" />}
                <span className="font-medium text-[#212121]">MessagingSessionName:</span>{' '}
                <span className="font-mono text-[#2196f3]">{currentMessagingSessionName}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

