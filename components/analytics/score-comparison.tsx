'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { materialComponents, materialText, materialTypography } from '@/lib/design-tokens';

interface ScoreComparisonData {
  metric: string;
  agentforce: number;
  sierra: number;
}

interface ScoreComparisonProps {
  data: ScoreComparisonData[];
}

export function ScoreComparison({ data }: ScoreComparisonProps) {
  return (
    <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
      <h3 className="text-[22px] font-medium leading-[28px] text-[#212121] mb-4">Average Scores by Metric</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="metric" stroke="#757575" />
          <YAxis domain={[0, 5]} stroke="#757575" />
          <Tooltip />
          <Legend />
          <Bar dataKey="agentforce" fill="#2196f3" name="Agentforce" />
          <Bar dataKey="sierra" fill="#9c27b0" name="Sierra" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

