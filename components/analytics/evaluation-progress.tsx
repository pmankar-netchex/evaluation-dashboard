'use client';

import { materialComponents, materialText, materialTypography } from '@/lib/design-tokens';

interface EvaluationProgressProps {
  evaluated: number;
  total: number;
}

export function EvaluationProgress({ evaluated, total }: EvaluationProgressProps) {
  const percentage = total > 0 ? Math.round((evaluated / total) * 100) : 0;

  return (
    <div className="bg-white border border-[#eeeeee] rounded-lg p-6 shadow-sm">
      <h3 className="text-[22px] font-medium leading-[28px] text-[#212121] mb-4">Evaluation Progress</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-normal leading-4 text-[#757575] mb-2">
            <span className="text-[#212121]">Completed</span>
            <span className="font-medium text-[#212121]">{evaluated} / {total}</span>
          </div>
          <div className="w-full bg-[#e0e0e0] rounded-full h-4">
            <div
              className="bg-[#2196f3] h-4 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        <div className="text-center">
          <span className="text-[28px] font-normal leading-[36px] font-bold text-[#212121]">{percentage}%</span>
          <p className="text-xs font-normal leading-4 text-[#757575] mt-1">Complete</p>
        </div>
      </div>
    </div>
  );
}

