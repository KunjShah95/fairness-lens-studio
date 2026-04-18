import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAppStore } from '@/lib/store';
import { FairnessGauge } from '@/components/FairnessGauge';
import { BiasNutritionLabel } from '@/components/BiasNutritionLabel';
import { generatePDFReport } from '@/lib/report-generator';
import { Download, Share2, FileText, Calendar, Eye, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const TransparencyPage: React.FC = () => {
  const { currentDataset, currentAnalysis, simulations } = useAppStore();
  const [reportGenerating, setReportGenerating] = useState(false);

  const score = currentAnalysis?.metrics.overallScore || 78;
  const bestSim = simulations.length > 0 
    ? simulations.reduce((a, b) => a.metrics.overallScore > b.metrics.overallScore ? a : b) 
    : null;

  const handleDownloadReport = async () => {
    if (!currentAnalysis) {
      toast({
        title: 'Analysis Required',
        description: 'Please run an analysis before generating a report.',
        variant: 'destructive',
      });
      return;
    }

    setReportGenerating(true);
    console.log('Triggering PDF Generation for audit:', currentAnalysis.id);
    
    try {
      await generatePDFReport({
        dataset: currentDataset,
        analysis: currentAnalysis,
        simulations: simulations,
      });
      
      toast({
        title: 'Report Generated',
        description: 'The intelligence audit has been saved as a PDF.',
        className: 'bg-success text-success-foreground border-success',
      });
    } catch (error) {
      console.error('TransparencyPage: PDF Generation Failed', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred during PDF creation.',
        variant: 'destructive',
      });
    } finally {
      setReportGenerating(false);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/public/model/${currentDataset?.id || 'default'}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copied',
      description: 'Public model card link copied to clipboard',
      className: 'bg-success text-success-foreground border-success',
    });
  };

  return (
    <DashboardLayout title="Reports" subtitle="Transparency and compliance reports">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Report */}
        <div className="lg:col-span-2 space-y-6">
          {/* Public Model Card Preview */}
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                Public Model Card
              </CardTitle>
              <CardDescription>Shareable transparency report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border/20">
                <div>
                  <h2 className="text-xl font-display font-bold">{currentDataset?.name || 'Healthcare Model'}</h2>
                  <p className="text-sm text-muted-foreground">Fairness Audit Report</p>
                </div>
                <Badge variant={score >= 80 ? 'secondary' : 'outline'} className={score >= 80 ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
                  Score: {score}
                </Badge>
              </div>

              {/* Fairness Score */}
              <div className="flex justify-center py-4">
                <FairnessGauge score={score} size={160} />
              </div>

              {/* Metrics Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-card/50">
                  <p className="text-2xl font-display font-bold text-primary">{currentAnalysis?.metrics.demographicParity.toFixed(2) || '0.78'}</p>
                  <p className="text-xs text-muted-foreground">Demographic Parity</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/50">
                  <p className="text-2xl font-display font-bold text-primary">{currentAnalysis?.metrics.equalOpportunity.toFixed(2) || '0.82'}</p>
                  <p className="text-xs text-muted-foreground">Equal Opportunity</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-card/50">
                  <p className="text-2xl font-display font-bold text-primary">{currentAnalysis?.metrics.disparateImpact.toFixed(2) || '0.75'}</p>
                  <p className="text-xs text-muted-foreground">Disparate Impact</p>
                </div>
              </div>

              {/* Sensitive Attributes */}
              <div className="p-4 rounded-xl bg-card/50">
                <p className="text-sm font-medium mb-2">Audited Attributes</p>
                <div className="flex flex-wrap gap-2">
                  {(currentDataset?.sensitiveAttributes || ['gender', 'age_group']).map((attr, i) => (
                    <Badge key={i} variant="outline">{attr}</Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={handleCopyLink}>
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>
                <Button className="flex-1 rounded-xl btn-warm-primary" onClick={handleDownloadReport} disabled={reportGenerating}>
                  {reportGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Download className="w-4 h-4 mr-2" /> Download PDF</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Nutrition Label */}
          {currentAnalysis && currentDataset && (
            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Bias Nutrition Label
                </CardTitle>
                <CardDescription>Standardized fairness summary</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <BiasNutritionLabel 
                  metrics={currentAnalysis.metrics} 
                  sensitiveAttribute={currentAnalysis.sensitiveAttribute}
                  datasetName={currentDataset.name}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Report Info */}
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="text-base">Report Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Generated
                </span>
                <span className="text-sm">{currentAnalysis ? new Date(currentAnalysis.timestamp).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Status
                </span>
                <Badge variant="secondary" className="text-success">Completed</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Simulations</span>
                <span className="text-sm font-medium">{simulations.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Best Simulation */}
          {bestSim && (
            <Card className="card-warm border-border/20">
              <CardHeader>
                <CardTitle className="text-base">Best Mitigation</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-3xl font-display font-bold text-success">{bestSim.metrics.overallScore}</p>
                <p className="text-sm text-muted-foreground">{bestSim.name}</p>
                <p className="text-xs text-success mt-2 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3" /> +{bestSim.metrics.overallScore - score} pts
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TransparencyPage;