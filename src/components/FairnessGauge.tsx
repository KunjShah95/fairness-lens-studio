import React from 'react';

interface FairnessGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'hsl(142, 76%, 36%)';
  if (score >= 60) return 'hsl(142, 60%, 50%)';
  if (score >= 40) return 'hsl(38, 92%, 50%)';
  if (score >= 20) return 'hsl(25, 95%, 53%)';
  return 'hsl(0, 84%, 60%)';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

export const FairnessGauge: React.FC<FairnessGaugeProps> = ({ score, size = 180, label }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="transform -rotate-90" style={{ width: size, height: size }}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{score}</span>
          <span className="text-xs font-medium text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="text-center">
        <span
          className="text-sm font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {getScoreLabel(score)}
        </span>
        {label && <p className="text-xs text-muted-foreground mt-1">{label}</p>}
      </div>
    </div>
  );
};
