'use client';

import { useState } from 'react';
import { textStyles, colors, materialComponents, materialText, materialBorder, materialTypography } from '@/lib/design-tokens';

interface CaseLoaderProps {
  onLoadCase: (caseNumber: string) => void;
  loading?: boolean;
  currentCaseNumber?: string;
}

export function CaseLoader({
  onLoadCase,
  loading = false,
  currentCaseNumber,
}: CaseLoaderProps) {
  const [caseNumber, setCaseNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (caseNumber.trim()) {
      onLoadCase(caseNumber.trim());
      setCaseNumber('');
    }
  };

  return (
    <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-medium leading-6 text-[#212121] mb-1">Load Transcript</h3>
        <p className="text-xs font-normal leading-4 text-[#757575]">Enter a case number to fetch and compare transcripts</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <form onSubmit={handleSubmit} className="flex-1 flex gap-2 w-full sm:w-auto">
          <div className="flex-1">
            <label htmlFor="case-number" className="block text-xs font-medium text-[#757575] mb-1">
              Case Number
            </label>
            <input
              id="case-number"
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="e.g., 02173888"
              disabled={loading}
              className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg text-[#212121] bg-white focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3] disabled:bg-[#f5f5f5] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-all duration-200"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !caseNumber.trim()}
              className="bg-[#2196f3] text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-[#1976d2] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md whitespace-nowrap h-[42px]"
            >
              {loading ? 'Loading...' : 'Load Transcripts'}
            </button>
          </div>
        </form>

      </div>

      {currentCaseNumber && (
        <div className="mt-4 pt-4 border-t border-[#e0e0e0]">
          <div className="text-sm font-normal leading-5 text-[#757575]">
            <span className="font-medium text-[#212121]">Current Case:</span>{' '}
            <span className="font-mono text-[#2196f3]">{currentCaseNumber}</span>
          </div>
        </div>
      )}
    </div>
  );
}

