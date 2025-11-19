'use client';

import { useState } from 'react';
import { SimplifiedEvaluationScores } from '@/types';

interface ChatFeedbackFormProps {
  onSubmit: (evaluation: {
    scores: SimplifiedEvaluationScores;
    notes?: string;
  }) => void;
  disabled?: boolean;
}

interface ScoreSelectorProps {
  label: string;
  metric: keyof SimplifiedEvaluationScores;
  description: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const ScoreSelector = ({
  label,
  metric,
  description,
  value,
  onChange,
  disabled = false,
}: ScoreSelectorProps) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#757575]">
        {label}
      </label>
      <p className="text-xs text-[#9e9e9e] mb-2">{description}</p>
      <div className="relative" style={{ height: '48px' }}>
        <select
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-full h-full px-4 border border-[#e0e0e0] rounded-lg text-[#212121] bg-white focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3] disabled:bg-[#f5f5f5] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200"
          style={{
            height: '48px',
            scrollMarginTop: '100px',
            boxSizing: 'border-box',
            paddingTop: '12px',
            paddingBottom: '12px',
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} - {n === 1 ? 'Poor' : n === 2 ? 'Fair' : n === 3 ? 'Good' : n === 4 ? 'Very Good' : 'Excellent'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

export function ChatFeedbackForm({
  onSubmit,
  disabled = false,
}: ChatFeedbackFormProps) {
  const [scores, setScores] = useState<SimplifiedEvaluationScores>({
    resolution: 3,
    empathy: 3,
    efficiency: 3,
    accuracy: 3,
  });
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({ scores, notes: notes.trim() || undefined });
  };

  const updateScore = (metric: keyof SimplifiedEvaluationScores, value: number) => {
    setScores((prev) => ({
      ...prev,
      [metric]: value,
    }));
  };

  return (
    <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-[22px] font-medium leading-[28px] text-[#212121] mb-2">
          Chat Feedback
        </h3>
        <p className="text-sm font-normal leading-5 text-[#757575]">
          Rate Sierra&apos;s performance in this conversation
        </p>
      </div>

      {/* Detailed Scoring */}
      <div className="space-y-4">
        <ScoreSelector
          label="Resolution Quality"
          metric="resolution"
          description="How well did Sierra resolve your queries?"
          value={scores.resolution}
          onChange={(value) => updateScore('resolution', value)}
          disabled={disabled}
        />
        <ScoreSelector
          label="Empathy"
          metric="empathy"
          description="How empathetic and understanding was Sierra?"
          value={scores.empathy}
          onChange={(value) => updateScore('empathy', value)}
          disabled={disabled}
        />
        <ScoreSelector
          label="Efficiency"
          metric="efficiency"
          description="How quickly and efficiently did Sierra respond?"
          value={scores.efficiency}
          onChange={(value) => updateScore('efficiency', value)}
          disabled={disabled}
        />
        <ScoreSelector
          label="Accuracy"
          metric="accuracy"
          description="How accurate was the information provided?"
          value={scores.accuracy}
          onChange={(value) => updateScore('accuracy', value)}
          disabled={disabled}
        />
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="feedback-notes"
          className="block text-sm font-medium text-[#757575] mb-2"
        >
          Additional Notes (optional)
        </label>
        <textarea
          id="feedback-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full px-4 py-3 border border-[#e0e0e0] rounded-lg text-[#212121] bg-white focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3] disabled:bg-[#f5f5f5] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-all duration-200"
          placeholder="Share any additional thoughts about this conversation..."
        />
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-[#e0e0e0]">
        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full bg-[#2196f3] text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-[#1976d2] focus:outline-none focus:ring-2 focus:ring-[#2196f3] focus:ring-offset-2 disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          Submit Feedback
        </button>
      </div>
    </div>
  );
}

