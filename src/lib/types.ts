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
  adversarial_audit?: {
    latent_bias_detected: boolean;
    metrics: Record<string, {
      reconstruction_auc: number;
      severity: string;
      is_latent_proxy: boolean;
      interpretation: string;
    }>;
  };
  counterfactual_fairness?: {
    overall_flagged: boolean;
    metrics: Record<string, { 
      violations: number;
      violation_rate: number;
      flagged: boolean;
      interpretation: string;
    }>;
  };
  individual_fairness?: {
    consistency_score: number;
    interpretation: string;
    method: string;
    error?: string;
  };
  multivariate_subgroups?: {
    description: string;
    size: number;
    positive_rate: number;
    disparity: number;
    risk_level: string;
  }[];
  calibration_fairness?: {
    overall_flagged: boolean;
    metrics: Record<string, {
      brier_disparity: number;
      is_calibrated: boolean;
      interpretation: string;
    }>;
  };
  distributional_representativeness?: {
    findings: Record<string, {
      feature: string;
      ks_statistic: number;
      drift_severity: string;
    }[]>;
  };
  bias_sensitivity?: {
    sensitivity_map: Record<string, {
      feature: string;
      impact: number;
      percentage_reduction: number;
    }[]>;
  };
}

export interface GroupMetric {
  group: string;
  positiveRate: number;
  count: number;
  truePositiveRate?: number;
}

export interface CausalEffect {
  node: string;
  effect: number;
  significance: 'high' | 'medium' | 'low';
  pathway: string;
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
  fairness_score?: number;
  proxy_features?: ProxyFeature[];
  intersectional_results?: IntersectionalResult[];
  causal_analysis?: {
    nodes: string[];
    edges: { source: string; target: string; weight: number }[];
    effects?: Record<string, CausalEffect>;
  };
  ai_insights?: {
    executive_summary?: string;
    risk_profile?: {
      level: string;
      score: number;
      factors: {
        proxy_risk: string;
        causal_risk: string;
        calibration_risk?: string;
        legal_risk?: string;
      };
    };
    compliance_status?: string;
    compliance_frameworks?: Record<string, {
      status: string;
      requirement: string;
      finding: string;
      article?: string;
      category?: string;
    }>;
    recommendations?: {
      category: string;
      severity: string;
      title: string;
      insight: string;
      action?: string;
    }[];
  };
}

export interface ProxyFeature {
  feature: string;
  protected_attribute: string;
  correlation: number;
  p_value: number;
  severity: string;
  multivariate_importance?: number;
  note?: string;
}

export interface IntersectionalResult {
  group: string;
  n: number;
  positive_rate: number;
  disparity_from_average: number;
  flagged: boolean;
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

