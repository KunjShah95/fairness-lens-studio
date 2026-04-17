export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface Dataset {
  id: string;
  name: string;
  rows: number;
  columns: string[];
  data: Record<string, unknown>[];
  uploadedAt: Date;
  targetVariable?: string;
  sensitiveAttributes?: string[];
}

export interface FairnessMetrics {
  demographicParity: number;
  equalOpportunity: number;
  disparateImpact: number;
  overallScore: number;
}

export interface GroupMetric {
  group: string;
  positiveRate: number;
  count: number;
  truePositiveRate?: number;
}

export interface BiasAnalysis {
  id: string;
  datasetId: string;
  metrics: FairnessMetrics;
  groupMetrics: GroupMetric[];
  sensitiveAttribute: string;
  targetVariable: string;
  featureImportance: FeatureImportance[];
  correlations: Correlation[];
  timestamp: Date;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  isProxy: boolean;
}

export interface Correlation {
  feature: string;
  correlation: number;
}

export interface SimulationScenario {
  id: string;
  name: string;
  removedFeatures: string[];
  reweighted: boolean;
  metrics: FairnessMetrics;
  groupMetrics: GroupMetric[];
}

export interface MitigationStrategy {
  id: string;
  name: string;
  description: string;
  type: 'reweighting' | 'feature_removal' | 'adversarial';
  impact: number; // expected improvement
}

export type MitigationType = MitigationStrategy['type'];

export type UserRole = 'admin' | 'analyst' | 'public' | 'compliance' | 'executive' | 'other' | string;

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  timestamp: string;
  link?: string;
}

