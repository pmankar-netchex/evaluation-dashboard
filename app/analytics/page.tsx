'use client';

import { useState, useEffect } from 'react';
import { WinRateChart } from '@/components/analytics/win-rate-chart';
import { ScoreComparison } from '@/components/analytics/score-comparison';
import { EvaluationProgress } from '@/components/analytics/evaluation-progress';
import { ExportButton } from '@/components/analytics/export-button';
import { createClient } from '@/lib/supabase/client';
import { Evaluation } from '@/types';
import { textStyles, colors, materialComponents, materialText, materialBorder, materialTypography, materialBackground } from '@/lib/design-tokens';

export default function AnalyticsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch('/api/evaluations');
      if (!response.ok) {
        throw new Error('Failed to fetch evaluations');
      }

      const data = await response.json();
      setEvaluations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateWinRate = () => {
    const winCounts: Record<string, number> = {
      agentforce: 0,
      sierra: 0,
      tie: 0,
      both_poor: 0,
    };

    evaluations.forEach((evaluation) => {
      winCounts[evaluation.winner] = (winCounts[evaluation.winner] || 0) + 1;
    });

    return [
      { name: 'Agentforce', value: winCounts.agentforce },
      { name: 'Sierra', value: winCounts.sierra },
      { name: 'Tie', value: winCounts.tie },
      { name: 'Both Poor', value: winCounts.both_poor },
    ].filter((item) => item.value > 0);
  };

  const calculateAverageScores = () => {
    if (evaluations.length === 0) return [];

    const metrics = ['resolution', 'empathy', 'efficiency', 'accuracy'] as const;
    const totals: Record<string, { af: number; sierra: number; count: number }> = {};

    metrics.forEach((metric) => {
      totals[metric] = { af: 0, sierra: 0, count: 0 };
    });

    evaluations.forEach((evaluation) => {
      metrics.forEach((metric) => {
        const scores = evaluation.scores as any;
        if (scores[metric]) {
          totals[metric].af += scores[metric].af || 0;
          totals[metric].sierra += scores[metric].sierra || 0;
          totals[metric].count += 1;
        }
      });
    });

    return metrics.map((metric) => ({
      metric: metric.charAt(0).toUpperCase() + metric.slice(1),
      agentforce: totals[metric].count > 0 ? totals[metric].af / totals[metric].count : 0,
      sierra: totals[metric].count > 0 ? totals[metric].sierra / totals[metric].count : 0,
    }));
  };

  const getProgress = () => {
    // This would ideally come from a separate API call to get total transcripts
    // For now, we'll use evaluations count as a proxy
    return {
      evaluated: evaluations.length,
      total: evaluations.length, // This should be fetched separately
    };
  };

  const handleExport = () => {
    if (evaluations.length === 0) {
      alert('No data to export');
      return;
    }

    // Convert evaluations to CSV format
    const headers = [
      'ID',
      'Case Number',
      'Winner',
      'Resolution (AF)',
      'Resolution (Sierra)',
      'Empathy (AF)',
      'Empathy (Sierra)',
      'Efficiency (AF)',
      'Efficiency (Sierra)',
      'Accuracy (AF)',
      'Accuracy (Sierra)',
      'Notes',
      'Evaluation Date',
    ];

    const rows = evaluations.map((evaluation) => {
      const scores = evaluation.scores as any;
      return [
        evaluation.id || '',
        '', // Case number would need to be joined from transcript
        evaluation.winner,
        scores.resolution?.af || '',
        scores.resolution?.sierra || '',
        scores.empathy?.af || '',
        scores.empathy?.sierra || '',
        scores.efficiency?.af || '',
        scores.efficiency?.sierra || '',
        scores.accuracy?.af || '',
        scores.accuracy?.sierra || '',
        evaluation.notes || '',
        evaluation.evaluation_timestamp || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `evaluations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2196f3]"></div>
          <p className="mt-2 text-sm font-normal leading-5 text-[#757575]">Loading analytics...</p>
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

  const winRateData = calculateWinRate();
  const scoreData = calculateAverageScores();
  const progress = getProgress();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-normal leading-[40px] text-[#212121]">Analytics Dashboard</h1>
          <p className="mt-1 text-sm font-normal leading-5 text-[#757575]">
            View evaluation statistics and insights
          </p>
        </div>
        <ExportButton onExport={handleExport} />
      </div>

      {evaluations.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
          <p className="text-sm font-normal leading-5 text-[#212121]">No evaluations found. Start evaluating transcripts to see analytics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WinRateChart data={winRateData} />
          <EvaluationProgress evaluated={progress.evaluated} total={progress.total} />
          <div className="lg:col-span-2">
            <ScoreComparison data={scoreData} />
          </div>
        </div>
      )}

      <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
        <h3 className="text-[22px] font-medium leading-[28px] text-[#212121] mb-4">Summary Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-normal leading-4 text-[#757575]">Total Evaluations</p>
            <p className="text-[28px] font-normal leading-[36px] text-[#212121]">{evaluations.length}</p>
          </div>
          <div>
            <p className="text-xs font-normal leading-4 text-[#757575]">Agentforce Wins</p>
            <p className="text-[28px] font-normal leading-[36px] text-[#2196f3]">
              {winRateData.find((d) => d.name === 'Agentforce')?.value || 0}
            </p>
          </div>
          <div>
            <p className="text-xs font-normal leading-4 text-[#757575]">Sierra Wins</p>
            <p className="text-[28px] font-normal leading-[36px] text-[#9c27b0]">
              {winRateData.find((d) => d.name === 'Sierra')?.value || 0}
            </p>
          </div>
          <div>
            <p className="text-xs font-normal leading-4 text-[#757575]">Ties</p>
            <p className="text-[28px] font-normal leading-[36px] text-[#ff9800]">
              {winRateData.find((d) => d.name === 'Tie')?.value || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

