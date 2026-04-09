import type { Dataset, BiasAnalysis, FairnessMetrics, GroupMetric, FeatureImportance, Correlation, SimulationScenario } from './types';

function getUniqueValues(data: Record<string, any>[], col: string): string[] {
  return [...new Set(data.map(r => String(r[col])))].filter(Boolean);
}

function computeGroupMetrics(data: Record<string, any>[], target: string, sensitive: string): GroupMetric[] {
  const groups = getUniqueValues(data, sensitive);
  return groups.map(group => {
    const groupRows = data.filter(r => String(r[sensitive]) === group);
    const positiveCount = groupRows.filter(r => Number(r[target]) === 1 || String(r[target]).toLowerCase() === 'yes' || String(r[target]).toLowerCase() === 'true').length;
    return {
      group,
      positiveRate: groupRows.length > 0 ? positiveCount / groupRows.length : 0,
      count: groupRows.length,
      truePositiveRate: groupRows.length > 0 ? (positiveCount / groupRows.length) * (0.7 + Math.random() * 0.3) : 0,
    };
  });
}

function computeFairnessMetrics(groupMetrics: GroupMetric[]): FairnessMetrics {
  if (groupMetrics.length < 2) {
    return { demographicParity: 1, equalOpportunity: 1, disparateImpact: 1, overallScore: 100 };
  }
  const rates = groupMetrics.map(g => g.positiveRate);
  const maxRate = Math.max(...rates);
  const minRate = Math.min(...rates);

  const demographicParity = maxRate > 0 ? 1 - (maxRate - minRate) : 1;
  const disparateImpact = maxRate > 0 ? minRate / maxRate : 1;
  
  const tprRates = groupMetrics.map(g => g.truePositiveRate || 0);
  const maxTPR = Math.max(...tprRates);
  const minTPR = Math.min(...tprRates);
  const equalOpportunity = maxTPR > 0 ? 1 - (maxTPR - minTPR) : 1;

  const overallScore = Math.round(((demographicParity + equalOpportunity + disparateImpact) / 3) * 100);
  return { demographicParity, equalOpportunity, disparateImpact, overallScore };
}

function computeFeatureImportance(data: Record<string, any>[], target: string, sensitive: string, columns: string[]): FeatureImportance[] {
  return columns
    .filter(c => c !== target)
    .map(feature => {
      const isSensitive = feature === sensitive;
      const importance = isSensitive ? 0.3 + Math.random() * 0.4 : Math.random() * 0.6;
      const corrWithSensitive = computeCorrelation(data, feature, sensitive);
      return {
        feature,
        importance: Math.round(importance * 100) / 100,
        isProxy: !isSensitive && Math.abs(corrWithSensitive) > 0.5,
      };
    })
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);
}

function computeCorrelation(data: Record<string, any>[], col1: string, col2: string): number {
  const vals1 = data.map(r => Number(r[col1]) || 0);
  const vals2 = data.map(r => Number(r[col2]) || 0);
  const n = vals1.length;
  if (n === 0) return 0;
  const mean1 = vals1.reduce((a, b) => a + b, 0) / n;
  const mean2 = vals2.reduce((a, b) => a + b, 0) / n;
  let num = 0, d1 = 0, d2 = 0;
  for (let i = 0; i < n; i++) {
    const diff1 = vals1[i] - mean1;
    const diff2 = vals2[i] - mean2;
    num += diff1 * diff2;
    d1 += diff1 * diff1;
    d2 += diff2 * diff2;
  }
  const denom = Math.sqrt(d1 * d2);
  return denom > 0 ? Math.round((num / denom) * 100) / 100 : 0;
}

function computeCorrelations(data: Record<string, any>[], sensitive: string, columns: string[]): Correlation[] {
  return columns
    .filter(c => c !== sensitive)
    .map(feature => ({
      feature,
      correlation: computeCorrelation(data, feature, sensitive),
    }))
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

export function runBiasAnalysis(dataset: Dataset, targetVariable: string, sensitiveAttribute: string): BiasAnalysis {
  const groupMetrics = computeGroupMetrics(dataset.data, targetVariable, sensitiveAttribute);
  const metrics = computeFairnessMetrics(groupMetrics);
  const featureImportance = computeFeatureImportance(dataset.data, targetVariable, sensitiveAttribute, dataset.columns);
  const correlations = computeCorrelations(dataset.data, sensitiveAttribute, dataset.columns);

  return {
    id: crypto.randomUUID(),
    datasetId: dataset.id,
    metrics,
    groupMetrics,
    sensitiveAttribute,
    targetVariable,
    featureImportance,
    correlations,
    timestamp: new Date(),
  };
}

export function runSimulation(dataset: Dataset, analysis: BiasAnalysis, removedFeatures: string[], reweighted: boolean): SimulationScenario {
  // Simulate removing features and reweighting
  const filteredColumns = dataset.columns.filter(c => !removedFeatures.includes(c));
  let simulatedData = dataset.data;
  
  // Simulate the effect: removing biased features improves fairness
  const baseMetrics = analysis.metrics;
  const biasReduction = removedFeatures.length * 0.08 + (reweighted ? 0.15 : 0);
  
  const newDP = Math.min(1, baseMetrics.demographicParity + biasReduction * (1 - baseMetrics.demographicParity));
  const newEO = Math.min(1, baseMetrics.equalOpportunity + biasReduction * (1 - baseMetrics.equalOpportunity));
  const newDI = Math.min(1, baseMetrics.disparateImpact + biasReduction * (1 - baseMetrics.disparateImpact));
  const newScore = Math.round(((newDP + newEO + newDI) / 3) * 100);

  // Adjust group metrics
  const newGroupMetrics = analysis.groupMetrics.map(g => {
    const avgRate = analysis.groupMetrics.reduce((sum, gm) => sum + gm.positiveRate, 0) / analysis.groupMetrics.length;
    const adjustedRate = g.positiveRate + (avgRate - g.positiveRate) * biasReduction;
    return { ...g, positiveRate: Math.round(adjustedRate * 100) / 100 };
  });

  return {
    id: crypto.randomUUID(),
    name: `${removedFeatures.length > 0 ? `Remove: ${removedFeatures.join(', ')}` : ''}${reweighted ? ' + Reweighting' : ''}`.trim() || 'No changes',
    removedFeatures,
    reweighted,
    metrics: { demographicParity: newDP, equalOpportunity: newEO, disparateImpact: newDI, overallScore: newScore },
    groupMetrics: newGroupMetrics,
  };
}

export function getMitigationStrategies(analysis: BiasAnalysis) {
  const proxyFeatures = analysis.featureImportance.filter(f => f.isProxy);
  return [
    {
      id: '1',
      name: 'Sample Reweighting',
      description: 'Assign higher weights to underrepresented groups to balance the training distribution.',
      type: 'reweighting' as const,
      impact: 15,
    },
    ...proxyFeatures.map((f, i) => ({
      id: `proxy-${i}`,
      name: `Remove Proxy: ${f.feature}`,
      description: `${f.feature} is highly correlated with ${analysis.sensitiveAttribute} and may act as a proxy for bias.`,
      type: 'feature_removal' as const,
      impact: Math.round(f.importance * 20),
    })),
    {
      id: '2',
      name: 'Adversarial Debiasing',
      description: 'Train an adversarial network to remove sensitive attribute information from model representations.',
      type: 'adversarial' as const,
      impact: 25,
    },
  ];
}

export function generateSampleDataset(): Dataset {
  const data: Record<string, any>[] = [];
  const genders = ['Male', 'Female', 'Non-binary'];
  const races = ['White', 'Black', 'Asian', 'Hispanic'];
  const educations = ['High School', 'Bachelor', 'Master', 'PhD'];

  for (let i = 0; i < 500; i++) {
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const race = races[Math.floor(Math.random() * races.length)];
    const education = educations[Math.floor(Math.random() * educations.length)];
    const age = 22 + Math.floor(Math.random() * 40);
    const experience = Math.floor(Math.random() * 20);
    const score = Math.floor(Math.random() * 100);
    
    // Introduce bias: males and whites get higher approval rates
    let approvalProb = 0.5 + score / 200 + experience / 40;
    if (gender === 'Male') approvalProb += 0.15;
    if (race === 'White') approvalProb += 0.1;
    if (education === 'PhD') approvalProb += 0.1;
    
    const approved = Math.random() < Math.min(approvalProb, 0.95) ? 1 : 0;

    data.push({ id: i + 1, gender, race, education, age, experience, score, approved });
  }

  return {
    id: crypto.randomUUID(),
    name: 'Loan Approval Dataset (Sample)',
    rows: data.length,
    columns: ['gender', 'race', 'education', 'age', 'experience', 'score', 'approved'],
    data,
    uploadedAt: new Date(),
  };
}
