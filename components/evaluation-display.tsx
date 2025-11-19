'use client';

import { Evaluation, ChatEvaluation } from '@/types';

interface EvaluationDisplayProps {
  evaluation: Evaluation | ChatEvaluation;
}

export function EvaluationDisplay({ evaluation }: EvaluationDisplayProps) {
  // Determine if this is a chat evaluation or comparison evaluation
  const isChatEvaluation = 'chat_session_id' in evaluation && evaluation.chat_session_id;
  const isComparisonEvaluation = 'transcript_id' in evaluation && evaluation.transcript_id;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWinnerLabel = (winner?: string) => {
    if (!winner) return 'N/A';
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

  const getWinnerColor = (winner?: string) => {
    if (!winner) return 'bg-[#f5f5f5] text-[#757575] border-[#757575]';
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

  // Helper to safely get score values
  const getScore = (metric: string, bot?: 'af' | 'sierra') => {
    const scores = evaluation.scores as any;
    if (!scores || !scores[metric]) return null;
    
    if (isChatEvaluation) {
      // Chat evaluations only have Sierra scores
      return scores[metric]?.sierra || scores[metric];
    } else {
      // Comparison evaluations have both AF and Sierra
      return bot ? scores[metric][bot] : null;
    }
  };

  return (
    <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-[#eeeeee] pb-4">
        <div>
          <h3 className="text-[22px] font-medium leading-[28px] text-[#212121]">
            Previous Evaluation
          </h3>
          <p className="text-xs text-[#757575] mt-1">
            {isChatEvaluation ? 'Chat feedback (read-only)' : 'Read-only view of submitted evaluation'}
          </p>
        </div>
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#e3f2fd] text-[#2196f3] border border-[#2196f3]">
          ✓ Evaluated
        </div>
      </div>

      {/* Winner - Only show for comparison evaluations */}
      {isComparisonEvaluation && 'winner' in evaluation && evaluation.winner && (
        <div>
          <label className="block text-sm font-medium text-[#757575] mb-2">
            Overall Winner
          </label>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${getWinnerColor(evaluation.winner)}`}>
            {getWinnerLabel(evaluation.winner)}
          </span>
        </div>
      )}

      {/* Scores */}
      <div>
        <label className="block text-sm font-semibold text-[#757575] mb-3">
          {isChatEvaluation ? 'Sierra Performance (1-5 scale)' : 'Detailed Scoring (1-5 scale)'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Resolution */}
          <div className="bg-[#f5f5f5] rounded-lg p-3">
            <div className="text-xs font-medium text-[#757575] mb-2">Resolution</div>
            {isChatEvaluation ? (
              <div className="text-center">
                <span className="text-2xl font-semibold text-[#212121]">{getScore('resolution', 'sierra')}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#757575]">Agentforce:</span>
                  <span className="font-semibold text-[#212121]">{getScore('resolution', 'af')}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#757575]">Sierra:</span>
                  <span className="font-semibold text-[#212121]">{getScore('resolution', 'sierra')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Empathy */}
          <div className="bg-[#f5f5f5] rounded-lg p-3">
            <div className="text-xs font-medium text-[#757575] mb-2">Empathy</div>
            {isChatEvaluation ? (
              <div className="text-center">
                <span className="text-2xl font-semibold text-[#212121]">{getScore('empathy', 'sierra')}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#757575]">Agentforce:</span>
                  <span className="font-semibold text-[#212121]">{getScore('empathy', 'af')}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#757575]">Sierra:</span>
                  <span className="font-semibold text-[#212121]">{getScore('empathy', 'sierra')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Efficiency */}
          <div className="bg-[#f5f5f5] rounded-lg p-3">
            <div className="text-xs font-medium text-[#757575] mb-2">Efficiency</div>
            {isChatEvaluation ? (
              <div className="text-center">
                <span className="text-2xl font-semibold text-[#212121]">{getScore('efficiency', 'sierra')}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#757575]">Agentforce:</span>
                  <span className="font-semibold text-[#212121]">{getScore('efficiency', 'af')}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#757575]">Sierra:</span>
                  <span className="font-semibold text-[#212121]">{getScore('efficiency', 'sierra')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Accuracy */}
          <div className="bg-[#f5f5f5] rounded-lg p-3">
            <div className="text-xs font-medium text-[#757575] mb-2">Accuracy</div>
            {isChatEvaluation ? (
              <div className="text-center">
                <span className="text-2xl font-semibold text-[#212121]">{getScore('accuracy', 'sierra')}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#757575]">Agentforce:</span>
                  <span className="font-semibold text-[#212121]">{getScore('accuracy', 'af')}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#757575]">Sierra:</span>
                  <span className="font-semibold text-[#212121]">{getScore('accuracy', 'sierra')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {evaluation.notes && (
        <div>
          <label className="block text-sm font-medium text-[#757575] mb-2">
            Notes
          </label>
          <div className="bg-[#f5f5f5] rounded-lg p-4 text-sm text-[#212121] whitespace-pre-wrap">
            {evaluation.notes}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="pt-4 border-t border-[#eeeeee] flex flex-wrap items-center gap-4 text-xs text-[#757575]">
        <div>
          <span className="font-medium text-[#212121]">Evaluator:</span>{' '}
          {evaluation.evaluator_email || 'Unknown'}
        </div>
        <div>
          <span className="font-medium text-[#212121]">Date:</span>{' '}
          {formatDate(evaluation.evaluation_timestamp || evaluation.created_at)}
        </div>
        {'time_spent_seconds' in evaluation && evaluation.time_spent_seconds && (
          <div>
            <span className="font-medium text-[#212121]">Time Spent:</span>{' '}
            {Math.floor(evaluation.time_spent_seconds / 60)}m {evaluation.time_spent_seconds % 60}s
          </div>
        )}
        <div>
          <span className="font-medium text-[#212121]">Type:</span>{' '}
          {isChatEvaluation ? 'Chat' : 'Comparison'}
        </div>
      </div>
    </div>
  );
}

