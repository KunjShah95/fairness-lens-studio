import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Dataset, BiasAnalysis, SimulationScenario, User, AppNotification, FairnessMetrics, GroupMetric } from './types';

const generateSampleAnalysis = (datasetId: string, datasetName: string): BiasAnalysis => {
  const groupMetrics: GroupMetric[] = [
    { group: 'Male', positiveRate: 0.82, count: 1250, truePositiveRate: 0.85 },
    { group: 'Female', positiveRate: 0.78, count: 1180, truePositiveRate: 0.80 },
    { group: 'Non-Binary', positiveRate: 0.85, count: 120, truePositiveRate: 0.88 },
    { group: 'Other', positiveRate: 0.80, count: 450, truePositiveRate: 0.82 },
  ];
  
  const metrics: FairnessMetrics = {
    demographicParity: 0.78,
    equalOpportunity: 0.82,
    disparateImpact: 0.75,
    overallScore: 78,
    adversarial_audit: {
      latent_bias_detected: true,
      metrics: {
        'location': {
          reconstruction_auc: 0.72,
          severity: 'high',
          is_latent_proxy: true,
          interpretation: 'High reconstruction accuracy suggests this feature acts as a proxy for protected attributes.'
        }
      }
    },
    counterfactual_fairness: {
      overall_flagged: true,
      metrics: {
        'gender': {
          violations: 142,
          violation_rate: 0.12,
          flagged: true,
          interpretation: 'Changing gender results in different outcomes for 12% of the population.'
        }
      }
    }
  };
  
  return {
    id: `analysis-${Date.now()}`,
    datasetId,
    metrics,
    groupMetrics,
    sensitiveAttribute: 'gender',
    targetVariable: 'approved',
    fairness_score: 78,
    proxy_features: [
      {
        feature: 'location',
        protected_attribute: 'race',
        correlation: 0.68,
        p_value: 0.001,
        severity: 'high',
        note: 'Zip code is highly correlated with demographic data.'
      }
    ],
    intersectional_results: [
      { group: 'Black Female', n: 420, positive_rate: 0.65, disparity_from_average: -0.15, flagged: true },
      { group: 'White Male', n: 850, positive_rate: 0.88, disparity_from_average: 0.08, flagged: false }
    ],
    featureImportance: [
      { feature: 'income_level', importance: 0.35, isProxy: false },
      { feature: 'age_group', importance: 0.25, isProxy: false },
      { feature: 'credit_score', importance: 0.20, isProxy: false },
      { feature: 'location', importance: 0.12, isProxy: true },
      { feature: 'education', importance: 0.08, isProxy: false },
    ],
    correlations: [],
    ai_insights: {
      executive_summary: "The analysis reveals significant disparities in approval rates, particularly affecting intersectional groups. While the overall fairness score is 78, latent proxies like 'location' contribute to systemic bias.",
      risk_profile: {
        level: 'High',
        score: 82,
        factors: {
          proxy_risk: 'High correlation between location and race.',
          causal_risk: 'Gender appears to have a direct counterfactual impact.',
          calibration_risk: 'Model is well-calibrated but biased in raw outcomes.',
          legal_risk: 'Potential violation of fair lending regulations.'
        }
      },
      compliance_status: 'Partially Compliant',
      compliance_frameworks: {
        'EU AI Act': {
          status: 'At Risk',
          requirement: 'High-risk AI systems must ensure representative and bias-free datasets.',
          finding: 'Proxy features and intersectional disparities pose a non-compliance risk.'
        },
        'NIST AI RMF': {
          status: 'Warning',
          requirement: 'Identify and manage bias across the AI lifecycle.',
          finding: 'Bias detection performed, but mitigation steps are pending.'
        }
      },
      recommendations: [
        {
          category: 'Mitigation',
          severity: 'high',
          title: 'Address Proxy Features',
          insight: "Feature 'location' is acting as a strong proxy for protected attributes.",
          action: "Consider removing 'location' or applying adversarial debiasing."
        },
        {
          category: 'Data Quality',
          severity: 'medium',
          title: 'Increase Intersectional Representation',
          insight: "Certain intersectional subgroups have low sample sizes.",
          action: "Collect more data for 'Black Female' and 'Other' demographic combinations."
        }
      ]
    },
    timestamp: new Date(),
  };
};

const generateSampleDataset = (name: string, rows: number): Dataset => ({
  id: `dataset-${Date.now()}`,
  name,
  rows,
  columns: ['id', 'income_level', 'age_group', 'credit_score', 'location', 'education', 'approved'],
  data: [],
  uploadedAt: new Date(),
  targetVariable: 'approved',
  sensitiveAttributes: ['gender', 'age_group'],
});

const sampleDatasets: Dataset[] = [
  generateSampleDataset('clinical_triages_q1_2026', 12540),
  generateSampleDataset('insurance_claims_2025', 8320),
  generateSampleDataset('patient_outcomes_aug', 15720),
];

const sampleAnalysis = generateSampleAnalysis(sampleDatasets[0].id, sampleDatasets[0].name);

const sampleSimulations: SimulationScenario[] = [
  {
    id: 'sim-1',
    name: 'Reweighting',
    removedFeatures: [],
    reweighted: true,
    metrics: { demographicParity: 0.85, equalOpportunity: 0.88, disparateImpact: 0.82, overallScore: 85 },
    groupMetrics: sampleAnalysis.groupMetrics,
  },
  {
    id: 'sim-2',
    name: 'Feature Removal',
    removedFeatures: ['location'],
    reweighted: false,
    metrics: { demographicParity: 0.82, equalOpportunity: 0.84, disparateImpact: 0.80, overallScore: 82 },
    groupMetrics: sampleAnalysis.groupMetrics,
  },
];

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  datasets: Dataset[];
  currentDataset: Dataset | null;
  currentAnalysis: BiasAnalysis | null;
  simulations: SimulationScenario[];
  notifications: AppNotification[];
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  updateUser: (user: User) => void;
  addDataset: (dataset: Dataset) => void;
  setCurrentDataset: (dataset: Dataset | null) => void;
  setCurrentAnalysis: (analysis: BiasAnalysis | null) => void;
  addSimulation: (sim: SimulationScenario) => void;
  clearSimulations: () => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  addBiasAlert: (title: string, message: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      datasets: sampleDatasets,
      currentDataset: sampleDatasets[0],
      currentAnalysis: sampleAnalysis,
      simulations: sampleSimulations,
      notifications: [
        {
          id: '1',
          title: 'Bias Detected',
          message: 'Female approval rate 4% lower than baseline',
          type: 'warning',
          read: false,
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Analysis Complete',
          message: 'clinical_triages_q1_2026 audit finished',
          type: 'success',
          read: false,
          timestamp: new Date().toISOString(),
        }
      ],
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false, currentDataset: null, currentAnalysis: null, simulations: [], notifications: [] }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      updateUser: (user) => set({ user, isAuthenticated: !!user }),
      addDataset: (dataset) => set((s) => ({ datasets: [...s.datasets, dataset] })),
      setCurrentDataset: (dataset) => set({ currentDataset: dataset }),
      setCurrentAnalysis: (analysis) => set({ currentAnalysis: analysis }),
      addSimulation: (sim) => set((s) => ({ simulations: [...s.simulations, sim] })),
      clearSimulations: () => set({ simulations: [] }),
      addNotification: (n) => set((s) => ({
        notifications: [
          {
            ...n,
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...s.notifications,
        ].slice(0, 20),
      })),
      markNotificationRead: (id) => set((s) => ({
        notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
      })),
      clearNotifications: () => set({ notifications: [] }),
      addBiasAlert: (title, message) => set((s) => ({
        notifications: [
          { id: Math.random().toString(36).substring(7), title, message, type: 'warning' as const, read: false, timestamp: new Date().toISOString() },
          ...s.notifications,
        ].slice(0, 20),
      })),
    }),
    { name: 'equitylens-store' }
  )
);

