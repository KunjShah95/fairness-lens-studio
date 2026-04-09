import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { generateSampleDataset } from '@/lib/bias-engine';
import type { Dataset } from '@/lib/types';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { addDataset, setCurrentDataset } = useAppStore();
  const [dragging, setDragging] = React.useState(false);

  const handleFile = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, any>[];
        const columns = results.meta.fields || [];
        const dataset: Dataset = {
          id: crypto.randomUUID(),
          name: file.name,
          rows: data.length,
          columns,
          data,
          uploadedAt: new Date(),
        };
        addDataset(dataset);
        setCurrentDataset(dataset);
        navigate('/analysis');
      },
    });
  }, [addDataset, setCurrentDataset, navigate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
  }, [handleFile]);

  const handleSample = () => {
    const dataset = generateSampleDataset();
    addDataset(dataset);
    setCurrentDataset(dataset);
    navigate('/analysis');
  };

  return (
    <div className="container py-12 max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Upload Dataset</h1>
        <p className="text-muted-foreground mt-2">Upload a CSV file to begin bias analysis</p>
      </div>

      <Card className="shadow-elevated">
        <CardContent className="p-8">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Drop your CSV file here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
            <input
              id="file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">Don't have a dataset?</p>
        <Button variant="outline" onClick={handleSample} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Use Sample Loan Dataset
        </Button>
      </div>

      <Card className="mt-8 shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Expected Format
          </CardTitle>
          <CardDescription>Your CSV should include a target variable (e.g., approved) and sensitive attributes (e.g., gender, race)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
            <pre>gender,race,age,score,approved{'\n'}Male,White,35,82,1{'\n'}Female,Black,28,75,0{'\n'}Male,Asian,42,90,1</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadPage;
