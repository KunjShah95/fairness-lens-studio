import React from 'react';
import type { FairnessMetrics } from '@/lib/types';

interface BiasNutritionLabelProps {
  metrics: FairnessMetrics;
  sensitiveAttribute: string;
  datasetName: string;
}

function formatMetric(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

function getRiskLevel(value: number): { label: string; className: string } {
  if (value >= 0.8) return { label: 'Low Risk', className: 'bg-success/10 text-success' };
  if (value >= 0.6) return { label: 'Moderate', className: 'bg-warning/10 text-warning' };
  return { label: 'High Risk', className: 'bg-destructive/10 text-destructive' };
}

export const BiasNutritionLabel: React.FC<BiasNutritionLabelProps> = ({ metrics, sensitiveAttribute, datasetName }) => {
  const items = [
    { name: 'Demographic Parity', value: metrics.demographicParity, desc: 'Equal positive prediction rates across groups' },
    { name: 'Equal Opportunity', value: metrics.equalOpportunity, desc: 'Equal true positive rates across groups' },
    { name: 'Disparate Impact', value: metrics.disparateImpact, desc: 'Ratio of positive rates (min/max group)' },
  ];

  return (
    <div className="bg-card border-2 border-foreground/20 rounded-lg p-6 max-w-sm font-mono">
      <div className="border-b-4 border-foreground/20 pb-2 mb-3">
        <h3 className="text-lg font-bold text-foreground">Bias Nutrition Label</h3>
        <p className="text-xs text-muted-foreground">{datasetName}</p>
      </div>
      <div className="border-b border-foreground/10 pb-2 mb-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Protected Attribute</span>
          <span className="font-semibold text-foreground">{sensitiveAttribute}</span>
        </div>
      </div>
      <div className="border-b-4 border-foreground/20 pb-2 mb-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-foreground">Overall Fairness Score</span>
          <span className="text-2xl font-black text-foreground">{metrics.overallScore}</span>
        </div>
      </div>
      <div className="space-y-3">
        {items.map(item => {
          const risk = getRiskLevel(item.value);
          return (
            <div key={item.name} className="border-b border-foreground/10 pb-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-foreground">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{formatMetric(item.value)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${risk.className}`}>{risk.label}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
