import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-slate-700',
  trend,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-4.5 shadow-xs transition-colors hover:border-slate-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">
          {title}
        </span>
        <div className={`p-1.5 rounded-md bg-slate-50 border border-slate-200/60 ${iconColor}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="mt-2.5 flex items-baseline justify-between">
        <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
          {value}
        </div>
        {trend && (
          <span
            className={`text-[11px] font-semibold font-mono tabular-nums ${
              trend.isPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[11px] text-slate-400 mt-1 font-medium">{subtitle}</p>}
    </div>
  );
};
