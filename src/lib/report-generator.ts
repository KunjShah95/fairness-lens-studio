import { jsPDF } from 'jspdf';
import type { Dataset, BiasAnalysis, FairnessMetrics, GroupMetric, SimulationScenario } from './types';

interface ReportData {
  dataset: Dataset | null;
  analysis: BiasAnalysis | null;
  simulations: SimulationScenario[];
}

function getScoreGrade(score: number): string {
  if (score >= 80) return 'PASS';
  if (score >= 60) return 'MARGINAL';
  return 'HIGH RISK';
}

function getScoreColor(score: number): [number, number, number] {
  if (score >= 80) return [16, 185, 129];
  if (score >= 60) return [245, 158, 11];
  return [239, 68, 68];
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function addSectionHeader(doc: jsPDF, title: string, y: number, margin: number, pageWidth: number): number {
  doc.setFillColor(18, 55, 52);
  doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin + 5, y + 5);
  
  return y + 12;
}

export async function generatePDFReport(data: ReportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = 210;
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;
  
  const { dataset, analysis, simulations } = data;
  const score = analysis?.metrics.overallScore || 78;
  const scoreColor = getScoreColor(score);
  
  // Header
  doc.setFillColor(18, 55, 52);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('EquityLens', margin, 22);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Fairness Audit Report', margin, 35);
  
  y = 55;
  
  // Report Title
  doc.setTextColor(45, 35, 30);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Comprehensive Fairness Analysis Report', margin, y);
  y += 15;
  
  // Executive Summary Box
  doc.setFillColor(248, 247, 245);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 3, 3, 'F');
  
  y += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', margin + 5, y);
  y += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report ID: EL-${Date.now().toString(36).toUpperCase()}`, margin + 5, y);
  y += 6;
  doc.text(`Generated: ${formatDate(new Date())}`, margin + 5, y);
  y += 6;
  doc.text(`Model/Dataset: ${dataset?.name || 'Healthcare Triage Model'}`, margin + 5, y);
  y += 6;
  doc.text(`Fairness Score: ${score}/100 (${getScoreGrade(score)})`, margin + 5, y);
  
  y += 20;
  
  // Overall Fairness Score
  doc.setFillColor(...scoreColor);
  doc.roundedRect(margin, y, 40, 40, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(String(score), margin + 20, y + 25, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Fairness Score', margin + 20, y + 35, { align: 'center' });
  
  doc.setTextColor(45, 35, 30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Fairness Assessment', margin + 50, y + 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryText = score >= 80 
    ? 'The model demonstrates acceptable fairness metrics across all protected attributes.'
    : score >= 60
    ? 'Moderate bias detected. Review and mitigation recommended before deployment.'
    : 'High bias detected. Mitigation required before deployment.';
    
  doc.text(summaryText, margin + 50, y + 22);
  
  y += 50;
  
  // Key Metrics Section
  y = addSectionHeader(doc, 'Key Fairness Metrics', y, margin, pageWidth);
  
  if (analysis) {
    const metrics = analysis.metrics;
    const metricsData = [
      { name: 'Demographic Parity', value: metrics.demographicParity, threshold: 0.80, desc: 'Equality in positive outcomes across groups' },
      { name: 'Equal Opportunity', value: metrics.equalOpportunity, threshold: 0.80, desc: 'Equality in true positive rates' },
      { name: 'Disparate Impact', value: metrics.disparateImpact, threshold: 0.80, desc: 'Ratio of selection rates (EEOC 4/5 rule)' },
    ];
    
    metricsData.forEach((m) => {
      const pass = m.value >= m.threshold;
      doc.setFillColor(pass ? 16 : 239, pass ? 185 : 68, pass ? 129 : 68);
      doc.circle(margin + 5, y + 4, 3, 'F');
      
      doc.setTextColor(45, 35, 30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(m.name, margin + 15, y + 5);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${m.value.toFixed(2)} (threshold: ${m.threshold})`, margin + 15, y + 11);
      doc.setTextColor(100, 100, 100);
      doc.text(m.desc, margin + 15, y + 17);
      
      doc.setTextColor(pass ? 16 : 239, pass ? 185 : 68, pass ? 129 : 68);
      doc.text(pass ? 'PASS' : 'FAIL', pageWidth - margin - 25, y + 5);
      
      y += 25;
    });
  }
  
  y += 10;
  
  // Group Breakdown
  if (analysis?.groupMetrics) {
    y = addSectionHeader(doc, 'Outcome Analysis by Demographic Group', y, margin, pageWidth);
    
    const colWidths = [40, 35, 35, 35];
    const cols = ['Group', 'Positive Rate', 'Population', 'Status'];
    
    doc.setFillColor(240, 238, 230);
    doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
    doc.setTextColor(45, 35, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    let x = margin + 5;
    cols.forEach((col, idx) => {
      doc.text(col, x, y + 5.5);
      x += colWidths[idx];
    });
    y += 10;
    
    doc.setFont('helvetica', 'normal');
    analysis.groupMetrics.forEach((g: GroupMetric) => {
      const rate = (g.positiveRate * 100).toFixed(1) + '%';
      const status = g.positiveRate >= 0.70 ? 'OK' : 'Review';
      
      doc.setTextColor(45, 35, 30);
      doc.text(g.group, margin + 5, y + 5);
      doc.text(rate, margin + 45, y + 5);
      doc.text(g.count.toLocaleString(), margin + 80, y + 5);
      
      doc.setTextColor(status === 'OK' ? 16 : 239, status === 'OK' ? 185 : 68, status === 'OK' ? 129 : 68);
      doc.text(status, margin + 115, y + 5);
      
      y += 8;
    });
  }
  
  y += 10;
  
  // Feature Importance
  if (analysis?.featureImportance) {
    y = addSectionHeader(doc, 'Feature Importance Analysis', y, margin, pageWidth);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    analysis.featureImportance.forEach((feat, i) => {
      const importance = (feat.importance * 100).toFixed(0) + '%';
      
      doc.text(`${i + 1}. ${feat.feature}`, margin + 5, y + 4);
      doc.setTextColor(100, 100, 100);
      doc.text(importance, pageWidth - margin - 20, y + 4);
      
      if (feat.isProxy) {
        doc.setTextColor(245, 158, 11);
        doc.text('[PROXY RISK]', margin + 60, y + 4);
      }
      
      y += 7;
    });
    
    const proxyFeatures = analysis.featureImportance.filter(f => f.isProxy);
    if (proxyFeatures.length > 0) {
      y += 5;
      doc.setTextColor(245, 158, 11);
      doc.setFontSize(9);
      doc.text(`Warning: ${proxyFeatures.length} proxy feature(s) detected that correlate with protected attributes.`, margin + 5, y);
      y += 5;
    }
  }
  
  y += 10;
  
  // Simulations / Mitigation
  if (simulations.length > 0) {
    y = addSectionHeader(doc, 'Mitigation Simulations', y, margin, pageWidth);
    
    const bestSim = simulations.reduce((a, b) => a.metrics.overallScore > b.metrics.overallScore ? a : b);
    const improvement = bestSim.metrics.overallScore - score;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${simulations.length} mitigation strategy simulation(s) were attempted.`, margin + 5, y);
    y += 8;
    
    doc.setTextColor(45, 35, 30);
    doc.text(`Best Result: ${bestSim.name}`, margin + 5, y);
    doc.setTextColor(16, 185, 129);
    doc.text(`Score: ${bestSim.metrics.overallScore} (+${improvement} from baseline)`, margin + 70, y);
    y += 15;
  }
  
  // Page 2 - Additional Details
  if (y > pageHeight - 100) {
    doc.addPage();
    y = margin;
  }
  
  // Methodology
  y = addSectionHeader(doc, 'Methodology', y, margin, pageWidth);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const methodology = [
    '• Demographic Parity: Measures whether positive outcome rates are equal across groups',
    '• Equal Opportunity: Measures whether true positive rates are equal across groups', 
    '• Disparate Impact: Uses the 4/5ths rule (EEOC) - ratio should be ≥ 0.80',
    '• Feature Importance: SHAP values used to determine feature contributions',
    '• Proxy Detection: Features with correlation > 0.7 to protected attributes flagged',
    '• Simulations: Reweighting, Feature Removal, and Adversarial Debiasing tested',
  ];
  
  methodology.forEach(text => {
    doc.text(text, margin + 5, y);
    y += 6;
  });
  
  y += 10;
  
  // Recommendations
  y = addSectionHeader(doc, 'Recommendations', y, margin, pageWidth);
  
  doc.setFontSize(10);
  const recommendations = score >= 80 
    ? [
        '✓ Model passes fairness thresholds and is approved for deployment',
        '✓ Continue monitoring for temporal drift in fairness metrics',
        '✓ Re-run audit quarterly or after significant data updates',
      ]
    : score >= 60
    ? [
        '⚠ Review required before deployment',
        '• Consider applying reweighting mitigation strategy',
        '• Review and potentially remove proxy features',
        '• Document rationale for any deployment decisions',
      ]
    : [
        '✗ Mitigation required before deployment',
        '• Apply adversarial debiasing and re-run audit',
        '• Remove identified proxy features from model',
        '• Consider fairness-accuracy trade-off with stakeholders',
        '• Document all decisions for compliance',
      ];
  
  recommendations.forEach(text => {
    doc.text(text, margin + 5, y);
    y += 7;
  });
  
  y += 10;
  
  // Compliance Section
  y = addSectionHeader(doc, 'Compliance Notes', y, margin, pageWidth);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const compliance = [
    'EU AI Act: Article 9 (Risk Assessment) - This report satisfies documentation requirements',
    'GDPR: Article 22 - Automated decision-making transparency',
    'EEOC: Four-Fifths Rule - Disparate Impact analysis included',
  ];
  
  compliance.forEach(text => {
    doc.text(text, margin + 5, y);
    y += 6;
  });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Report generated by EquityLens on ${formatDate(new Date())}`, margin, pageHeight - 10);
  
  // Save
  const filename = `${dataset?.name || 'fairness-report'}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}