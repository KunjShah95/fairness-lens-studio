import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Dataset, BiasAnalysis, GroupMetric, SimulationScenario } from './types';

interface ReportData {
  dataset: Dataset | null;
  analysis: BiasAnalysis | null;
  simulations: SimulationScenario[];
}

function getScoreGrade(score: number): string {
  if (score >= 80) return 'OPTIMIZED';
  if (score >= 60) return 'AUDITED';
  return 'NON-COMPLIANT';
}

function getScoreColor(score: number): [number, number, number] {
  if (score >= 80) return [16, 185, 129]; // Success
  if (score >= 60) return [245, 158, 11]; // Warning
  return [239, 68, 68]; // Critical
}

function formatDate(date: any): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date().toLocaleDateString();
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return new Date().toLocaleDateString();
  }
}

export async function generatePDFReport(data: ReportData): Promise<void> {
  console.log('Initializing PDF Generation...', data);
  
  try {
    const { dataset, analysis, simulations } = data;
    if (!analysis) {
      console.error('PDF Generation Error: No analysis data provided');
      throw new Error("No analysis data available for report generation.");
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 0;

    // --- PAGE 1: HEADER & EXECUTIVE SUMMARY ---
    // Background Header
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, pageWidth, 50, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('EquityLens Intelligence', margin, 25);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Advanced Fairness Audit & Regulatory Compliance Report', margin, 35);
    
    const auditId = (analysis.id || 'AUDIT-001').slice(0, 8).toUpperCase();
    doc.text(`ID: ${auditId} | ${formatDate(analysis.timestamp || new Date())}`, pageWidth - margin, 35, { align: 'right' });

    y = 65;

    // Summary Title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Intelligence Summary', margin, y);
    y += 10;

    // Executive Summary Text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const summaryText = analysis.ai_insights?.executive_summary || "Analysis complete. Summary pending additional compute.";
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 2 * margin);
    doc.text(summaryLines, margin, y);
    y += (summaryLines.length * 5) + 10;

    // Score Card
    const score = analysis.fairness_score || analysis.metrics?.overallScore || 0;
    const color = getScoreColor(score);
    
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 2, 2, 'F');
    
    doc.setFillColor(...color);
    doc.circle(margin + 20, y + 17.5, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(String(score), margin + 20, y + 20, { align: 'center' });
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.text(`Fairness Posture: ${getScoreGrade(score)}`, margin + 40, y + 15);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const rowCount = dataset?.rows?.toLocaleString() || 'N/A';
    const featureCount = dataset?.columns?.length || 'N/A';
    doc.text(`Audit conducted on ${rowCount} rows across ${featureCount} features.`, margin + 40, y + 22);

    y += 45;

    // Primary Metrics Table
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Core Fairness Indicators', margin, y);
    y += 5;

    const metrics = analysis.metrics || { demographicParity: 0, equalOpportunity: 0, disparateImpact: 0 };
    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value', 'Status', 'Threshold']],
      body: [
        ['Demographic Parity', (metrics.demographicParity || 0).toFixed(3), (metrics.demographicParity || 0) >= 0.8 ? 'PASS' : 'FAIL', '0.800'],
        ['Equal Opportunity', (metrics.equalOpportunity || 0).toFixed(3), (metrics.equalOpportunity || 0) >= 0.8 ? 'PASS' : 'FAIL', '0.800'],
        ['Disparate Impact', (metrics.disparateImpact || 0).toFixed(3), (metrics.disparateImpact || 0) >= 0.8 ? 'PASS' : 'FAIL', '0.800'],
      ],
      headStyles: { fillColor: [15, 23, 42], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
      theme: 'striped',
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Subgroup Breakdown
    doc.setFontSize(13);
    doc.text(`Subgroup Analysis: ${analysis.sensitiveAttribute || 'Primary'}`, margin, y);
    y += 5;

    const groupMetrics = analysis.groupMetrics || [];
    const avgRate = groupMetrics.reduce((sum, g) => sum + (g.positiveRate || 0), 0) / (groupMetrics.length || 1);
    const subgroupRows = groupMetrics.map(g => [
      g.group || 'Unknown',
      `${((g.positiveRate || 0) * 100).toFixed(1)}%`,
      (g.count || 0).toLocaleString(),
      `${(((g.positiveRate || 0) - avgRate) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Group', 'Positive Rate', 'Sample Size', 'Disparity']],
      body: subgroupRows,
      headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });

    // --- PAGE 2: ADVANCED DIAGNOSTICS & COMPLIANCE ---
    doc.addPage();
    y = 25;

    doc.setFontSize(16);
    doc.text('Advanced Bias Diagnostics', margin, y);
    y += 10;

    // Intersectional Results
    if (analysis.intersectional_results && analysis.intersectional_results.length > 0) {
      doc.setFontSize(12);
      doc.text('Intersectional Disparity Matrix', margin, y);
      y += 5;

      autoTable(doc, {
        startY: y,
        head: [['Intersection', 'N', 'Positive Rate', 'Disparity', 'Risk']],
        body: analysis.intersectional_results.map(i => [
          i.group || 'N/A',
          i.n || 0,
          `${((i.positive_rate || 0) * 100).toFixed(1)}%`,
          `${((i.disparity_from_average || 0) * 100).toFixed(1)}%`,
          i.flagged ? 'HIGH' : 'LOW'
        ]),
        headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Proxy Features
    if (analysis.proxy_features && analysis.proxy_features.length > 0) {
      doc.setFontSize(12);
      doc.text('Latent Proxy Identification', margin, y);
      y += 5;

      autoTable(doc, {
        startY: y,
        head: [['Feature', 'Correlation', 'Severity', 'Recommended Action']],
        body: analysis.proxy_features.map(p => [
          p.feature || 'N/A',
          (p.correlation || 0).toFixed(3),
          (p.severity || 'low').toUpperCase(),
          'Adversarial Removal'
        ]),
        headStyles: { fillColor: [127, 29, 29], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Regulatory Compliance
    doc.setFontSize(16);
    doc.text('Regulatory Compliance Alignment', margin, y);
    y += 10;

    const frameworks = analysis.ai_insights?.compliance_frameworks || {};
    if (Object.keys(frameworks).length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Framework', 'Status', 'Requirement', 'Finding']],
        body: Object.entries(frameworks).map(([name, data]: [string, any]) => [
          name,
          data?.status || 'N/A',
          data?.requirement || 'N/A',
          data?.finding || 'N/A'
        ]),
        headStyles: { fillColor: [18, 55, 52], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          2: { cellWidth: 50 },
          3: { cellWidth: 60 }
        },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Mitigation Simulations
    if (simulations && simulations.length > 0) {
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('Mitigation Strategy Simulations', margin, y);
      y += 10;

      autoTable(doc, {
        startY: y,
        head: [['Strategy Name', 'Score', 'Improvement', 'Action Taken']],
        body: simulations.map(s => [
          s.name || 'Simulation',
          (s.metrics?.overallScore || 0).toString(),
          `+${(s.metrics?.overallScore || 0) - score}`,
          s.removedFeatures?.length > 0 ? `Removed: ${s.removedFeatures.join(', ')}` : 'Reweighting Applied'
        ]),
        headStyles: { fillColor: [5, 150, 105], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 15;
    }

    // Recommendations
    const recs = analysis.ai_insights?.recommendations || [];
    if (recs.length > 0) {
      doc.setFontSize(13);
      doc.text('Remediation Roadmap', margin, y);
      y += 5;

      recs.forEach((rec, idx) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${idx + 1}. ${rec.title || 'Recommendation'} [${(rec.severity || 'low').toUpperCase()}]`, margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(9);
        doc.text(`Insight: ${rec.insight || 'No detail available.'}`, margin + 5, y);
        y += 5;
        doc.text(`Action: ${rec.action || 'Contact compliance officer.'}`, margin + 5, y);
        y += 10;
      });
    }

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`EquityLens Intelligence Audit | Page ${i} of ${totalPages}`, pageWidth / 2, 285, { align: 'center' });
    }

    // Clean filename
    const rawName = dataset?.name || 'fairness_report';
    const cleanName = rawName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().getTime();
    const filename = `${cleanName}_audit_${timestamp}.pdf`;
    
    console.log(`Generating PDF: ${filename}`);
    doc.save(filename);
    console.log('PDF Generation Successful!');
    
  } catch (err) {
    console.error('CRITICAL FAILURE: PDF Generation crashed.', err);
    throw err;
  }
}