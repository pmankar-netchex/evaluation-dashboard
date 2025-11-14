'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { materialComponents, materialText, materialTypography } from '@/lib/design-tokens';

interface WinRateData {
  name: string;
  value: number;
}

interface WinRateChartProps {
  data: WinRateData[];
}

const COLORS = ['#2196f3', '#9c27b0', '#ff9800', '#f44336']; // Material Design colors

export function WinRateChart({ data }: WinRateChartProps) {
  return (
    <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
      <h3 className="text-[22px] font-medium leading-[28px] text-[#212121] mb-4">Win Rate Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

