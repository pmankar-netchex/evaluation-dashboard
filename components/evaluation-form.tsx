'use client';

import { useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Winner, EvaluationScores } from '@/types';
import { textStyles, colors, materialComponents, materialText, materialBorder, materialTypography } from '@/lib/design-tokens';

interface EvaluationFormProps {
  onSubmit: (evaluation: {
    winner: Winner;
    scores: EvaluationScores;
    notes?: string;
  }) => void;
  onSkip: () => void;
  onPrevious?: () => void;
  initialData?: {
    winner?: Winner;
    scores?: EvaluationScores;
    notes?: string;
  };
  disabled?: boolean;
}

export function EvaluationForm({
  onSubmit,
  onSkip,
  onPrevious,
  initialData,
  disabled = false,
}: EvaluationFormProps) {
  const [winner, setWinner] = useState<Winner>(
    initialData?.winner || 'tie'
  );
  const [scores, setScores] = useState<EvaluationScores>(
    initialData?.scores || {
      resolution: { af: 3, sierra: 3 },
      empathy: { af: 3, sierra: 3 },
      efficiency: { af: 3, sierra: 3 },
      accuracy: { af: 3, sierra: 3 },
    }
  );
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Keyboard shortcuts
  useHotkeys('1', () => !disabled && setWinner('agentforce'), {
    enableOnFormTags: true,
  });
  useHotkeys('2', () => !disabled && setWinner('sierra'), {
    enableOnFormTags: true,
  });
  useHotkeys('3', () => !disabled && setWinner('tie'), {
    enableOnFormTags: true,
  });
  useHotkeys('4', () => !disabled && setWinner('both_poor'), {
    enableOnFormTags: true,
  });
  useHotkeys(
    'enter',
    (e) => {
      if (!disabled) {
        e.preventDefault();
        handleSubmit();
      }
    },
    { enableOnFormTags: true }
  );
  useHotkeys('escape', () => !disabled && onSkip(), {
    enableOnFormTags: true,
  });

  const handleSubmit = () => {
    onSubmit({ winner, scores, notes: notes.trim() || undefined });
  };

  const updateScore = (
    metric: keyof EvaluationScores,
    bot: 'af' | 'sierra',
    value: number
  ) => {
    setScores((prev) => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [bot]: value,
      },
    }));
  };

  const ScoreSelector = ({
    label,
    metric,
  }: {
    label: string;
    metric: keyof EvaluationScores;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#757575]">
        {label}
      </label>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <label className="block text-xs text-[#757575] mb-1">
            Agentforce
          </label>
          <div className="relative" style={{ height: '48px' }}>
            <select
              value={scores[metric].af}
              onChange={(e) =>
                updateScore(metric, 'af', parseInt(e.target.value))
              }
              disabled={disabled}
              className="w-full h-full px-4 border border-[#e0e0e0] rounded-lg text-[#212121] bg-white focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3] disabled:bg-[#f5f5f5] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200"
              style={{ 
                height: '48px',
                scrollMarginTop: '100px',
                boxSizing: 'border-box',
                paddingTop: '12px',
                paddingBottom: '12px'
              }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-[#757575] mb-1">Sierra</label>
          <div className="relative" style={{ height: '48px' }}>
            <select
              value={scores[metric].sierra}
              onChange={(e) =>
                updateScore(metric, 'sierra', parseInt(e.target.value))
              }
              disabled={disabled}
              className="w-full h-full px-4 border border-[#e0e0e0] rounded-lg text-[#212121] bg-white focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3] disabled:bg-[#f5f5f5] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200"
              style={{ 
                height: '48px',
                scrollMarginTop: '100px',
                boxSizing: 'border-box',
                paddingTop: '12px',
                paddingBottom: '12px'
              }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm space-y-6" style={{ position: 'relative' }}>
      <div>
        <h3 className="text-[22px] font-medium leading-[28px] text-[#212121] mb-4">
          Evaluation
        </h3>

        {/* Winner Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#757575]">
            Overall Winner
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'agentforce' as Winner, label: 'Agentforce', key: '1' },
              { value: 'sierra' as Winner, label: 'Sierra', key: '2' },
              { value: 'tie' as Winner, label: 'Tie', key: '3' },
              {
                value: 'both_poor' as Winner,
                label: 'Both Poor',
                key: '4',
              },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  winner === option.value
                    ? 'border-[#2196f3] bg-[#e3f2fd]'
                    : 'border-[#e0e0e0] hover:border-[#bdbdbd]'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="winner"
                  value={option.value}
                  checked={winner === option.value}
                  onChange={() => !disabled && setWinner(option.value)}
                  disabled={disabled}
                  className="mr-2"
                />
                <span className="flex-1 text-sm font-medium text-[#212121]">
                  {option.label}
                </span>
                <span className="text-xs text-[#757575]">({option.key})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Detailed Scoring */}
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-semibold text-[#757575]">
            Detailed Scoring (1-5 scale)
          </h4>
          <ScoreSelector label="Resolution Quality" metric="resolution" />
          <ScoreSelector label="Empathy" metric="empathy" />
          <ScoreSelector label="Efficiency" metric="efficiency" />
          <ScoreSelector label="Accuracy" metric="accuracy" />
        </div>

        {/* Notes */}
        <div className="mt-6">
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-[#757575] mb-2"
          >
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={disabled}
            rows={4}
            className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg text-[#212121] bg-white focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3] disabled:bg-[#f5f5f5] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-all duration-200"
            placeholder="Add any additional notes about this evaluation..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-[#e0e0e0]">
        {onPrevious && (
          <button
            onClick={onPrevious}
            disabled={disabled}
            className="bg-transparent border-2 border-[#2196f3] text-[#2196f3] px-6 py-2 rounded-full font-medium text-sm hover:bg-[#e3f2fd] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 disabled:border-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200"
          >
            Previous
          </button>
        )}
        <button
          onClick={onSkip}
          disabled={disabled}
          className="bg-transparent border-2 border-[#2196f3] text-[#2196f3] px-6 py-2 rounded-full font-medium text-sm hover:bg-[#e3f2fd] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 disabled:border-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200"
        >
          Skip (Esc)
        </button>
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="flex-1 bg-[#2196f3] text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-[#1976d2] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          Submit & Next (Enter)
        </button>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="pt-4 border-t border-[#e0e0e0]">
        <p className="text-xs font-normal leading-4 text-[#757575]">
          <strong className="text-[#212121]">Keyboard shortcuts:</strong> 1=Agentforce, 2=Sierra, 3=Tie,
          4=Both Poor, Enter=Submit, Esc=Skip
        </p>
      </div>
    </div>
  );
}

