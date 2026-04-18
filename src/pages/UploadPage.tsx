import { useState, useEffect } from "react";
import { 
  CloudUpload, File, CheckCircle2, AlertCircle, X, Brain, 
  Database, Shield, BarChart3, PieChart as PieChartIcon, Upload, FileSpreadsheet, Clock, ChevronRight, FileText
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { ApiClient } from "@/api/client";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import Papa from "papaparse";

interface UploadedDataset {
  id: string;
  name: string;
  row_count: number;
}

export function UploadPage() {
  const navigate = useNavigate();
  const { datasets, addDataset, setCurrentDataset, currentDataset } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{name: string, value: number}[]>([]);
  const [datasetName, setDatasetName] = useState("");
  const [labelColumn, setLabelColumn] = useState("");
  const [protectedAttrs, setProtectedAttrs] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [domain, setDomain] = useState("healthcare");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setDatasetName(selectedFile.name.replace(".csv", ""));
      setSuccess(false);
      setProtectedAttrs([]);
      setLabelColumn("");
      
      // Parse data for preview
      Papa.parse(selectedFile, {
        header: true,
        preview: 100,
        complete: (results) => {
          if (results.meta.fields && results.meta.fields.length > 0) {
            setColumns(results.meta.fields);
            
            // Generate distribution data for first column
            const firstCol = results.meta.fields[0];
            const colValues: Record<string, number> = {};
            results.data.forEach((row: any) => {
              const val = String(row[firstCol] || 'N/A');
              colValues[val] = (colValues[val] || 0) + 1;
            });
            setPreviewData(Object.entries(colValues).map(([name, value]) => ({ name, value })).slice(0, 10));
          }
        }
      });
    }
  };

  const toggleProtectedAttr = (attr: string) => {
    setProtectedAttrs(prev => 
      prev.includes(attr) ? prev.filter(a => a !== attr) : [...prev, attr]
    );
  };

  const handleUpload = async () => {
    if (!file || !labelColumn || protectedAttrs.length === 0) {
      setError("Please select a file, a label column, and at least one protected attribute");
      return;
    }

    setLoading(true);
    setError("");
    console.log("Starting upload process...");

    try {
      // 1. Check if backend is available
      const isBackendUp = await ApiClient.healthCheck();
      
      if (isBackendUp) {
        console.log("Backend detected. Uploading to server...");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", datasetName);
        formData.append("label_column", labelColumn);
        formData.append("protected_attributes", protectedAttrs.join(","));
        formData.append("domain", domain);

        const response = (await ApiClient.uploadDataset(formData)) as UploadedDataset;
        
        const newDataset = {
          id: response.id,
          name: response.name,
          rows: response.row_count,
          columns: columns,
          data: [], // Full data stays on server for remote analysis
          uploadedAt: new Date(),
          targetVariable: labelColumn,
          sensitiveAttributes: protectedAttrs,
        };
        
        addDataset(newDataset);
        setCurrentDataset(newDataset);
        setSuccess(true);
        
        const params = new URLSearchParams({
          dataset_id: response.id,
          label: labelColumn,
          protected: protectedAttrs.join(","),
          domain,
        });
        navigate(`/analysis?${params.toString()}`);
      } else {
        // 2. Local Fallback
        console.warn("Backend unavailable (Failed to fetch). Proceeding with local data processing...");
        
        // Use PapaParse to get all data for local processing
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newDataset = {
              id: localId,
              name: datasetName,
              rows: results.data.length,
              columns: columns,
              data: results.data as any[],
              uploadedAt: new Date(),
              targetVariable: labelColumn,
              sensitiveAttributes: protectedAttrs,
            };

            addDataset(newDataset);
            setCurrentDataset(newDataset);
            setSuccess(true);

            const params = new URLSearchParams({
              dataset_id: localId,
              label: labelColumn,
              protected: protectedAttrs.join(","),
              domain,
              local: "true"
            });
            
            navigate(`/analysis?${params.toString()}`);
          },
          error: (error) => {
            console.error("Local PapaParse Error:", error);
            setError(`Local processing failed: ${error.message}`);
          }
        });
      }
    } catch (err) {
      console.error("Upload process error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Upload Dataset" subtitle="Upload your clinical data to begin fairness audits">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Upload New Dataset
              </CardTitle>
              <CardDescription>Upload a CSV file to run fairness analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {success && (
                <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex gap-3">
                  <CheckCircle2 className="text-success flex-shrink-0 mt-0.5 w-5 h-5" />
                  <div>
                    <p className="font-semibold text-foreground">Upload successful!</p>
                    <p className="text-sm text-muted-foreground">Redirecting to analysis...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex gap-3">
                  <AlertCircle className="text-destructive flex-shrink-0 mt-0.5 w-5 h-5" />
                  <div>
                    <p className="font-semibold text-foreground">Error</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">CSV File *</label>
                <div className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  file ? "border-success bg-success/5" : "border-border hover:border-primary/50 bg-muted/30"
                }`}>
                  <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="file-input" />
                  <label htmlFor="file-input" className="cursor-pointer">
                    {file ? (
                      <div className="space-y-2">
                        <FileSpreadsheet className="w-10 h-10 text-success mx-auto" />
                        <p className="font-semibold">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        {columns.length > 0 && <p className="text-xs text-success">{columns.length} columns detected</p>}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-muted-foreground">CSV files (100 MB max)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {file && columns.length > 0 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-foreground">Dataset Name</label>
                      <Input placeholder="e.g., Healthcare Triage" value={datasetName} onChange={(e) => setDatasetName(e.target.value)} className="rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-foreground">Label Column (Target) *</label>
                      <select
                        value={labelColumn}
                        onChange={(e) => setLabelColumn(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="">Select target variable...</option>
                        {columns.map(col => <option key={col} value={col}>{col}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Protected Attributes *</label>
                    <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-border/40 bg-muted/20">
                      {columns.map(col => (
                        <Badge 
                          key={col} 
                          variant={protectedAttrs.includes(col) ? "default" : "outline"}
                          className={`cursor-pointer px-3 py-1 rounded-full transition-all ${
                            protectedAttrs.includes(col) ? "bg-primary text-primary-foreground" : "hover:border-primary/50"
                          }`}
                          onClick={() => toggleProtectedAttr(col)}
                        >
                          {col}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Select one or more columns that contain sensitive information (e.g., gender, race)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Business Domain</label>
                    <select
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="healthcare">Healthcare</option>
                      <option value="finance">Finance</option>
                      <option value="hiring">Hiring</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <Button onClick={handleUpload} disabled={!file || !labelColumn || protectedAttrs.length === 0 || loading} className="w-full py-6 rounded-full btn-warm-primary">
                    {loading ? "Processing..." : "Upload & Analyze"} <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Existing Datasets */}
        <div>
          <Card className="card-warm border-border/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Existing Datasets
              </CardTitle>
              <CardDescription>Your uploaded datasets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {datasets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No datasets yet</p>
              ) : (
                datasets.slice(0, 5).map((ds) => (
                  <div 
                    key={ds.id} 
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${currentDataset?.id === ds.id ? 'border-primary bg-primary/5' : 'border-border/30 hover:border-border'}`}
                    onClick={() => setCurrentDataset(ds)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{ds.name}</p>
                      {currentDataset?.id === ds.id && <Badge variant="secondary" className="text-xs">Active</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {ds.rows.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {ds.columns?.length || 0} cols</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ds.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}