import React from 'react';

interface MasteryProgressProps {
  value: number; // 0.0 to 1.0
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  threshold?: number;
}

export const MasteryProgress: React.FC<MasteryProgressProps> = ({
  value,
  size = 'md',
  showLabel = true,
  threshold = 0.75,
}) => {
  const percentage = Math.round(Math.max(0, Math.min(1, value)) * 100);

  const getColor = (pct: number) => {
    if (pct >= threshold * 100) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return 'h-1.5';
      case 'lg':
        return 'h-3';
      case 'md':
      default:
        return 'h-2';
    }
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between text-xs font-semibold mb-1">
          <span className="text-slate-600">Mastery Level</span>
          <span className="text-slate-900">{percentage}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${getHeight()}`}>
        <div
          className={`${getColor(percentage)} ${getHeight()} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
