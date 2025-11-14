'use client';

import { materialComponents } from '@/lib/design-tokens';

interface ExportButtonProps {
  onExport: () => void;
  loading?: boolean;
}

export function ExportButton({ onExport, loading = false }: ExportButtonProps) {
  return (
    <button
      onClick={onExport}
      disabled={loading}
      className={`bg-[#4caf50] text-white px-6 py-2 rounded-full font-medium text-sm hover:bg-[#43a047] focus:outline-none focus:ring-2 focus:ring-[#4caf50] focus:ring-offset-2 disabled:bg-[#e0e0e0] disabled:text-[#9e9e9e] disabled:cursor-not-allowed transition-colors duration-200 shadow-sm hover:shadow-md`}
    >
      {loading ? 'Exporting...' : 'Export to CSV'}
    </button>
  );
}

