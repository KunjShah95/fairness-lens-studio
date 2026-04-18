import { useState } from "react";
import { AlertCircle, CheckCircle2, Upload, FileSpreadsheet, Database, FileText, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAppStore } from "@/lib/store";
import { ApiClient } from "@/api/client";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface UploadedDataset {
  id: string;
  name: string;
  row_count: number;
}

export function UploadPage() {
  const navigate = useNavigate();
  const { datasets, addDataset, setCurrentDataset, currentDataset } = useAppStore();
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [labelColumn, setLabelColumn] = useState("");
  const [protectedAttrs, setProtectedAttrs] = useState("");
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
    }
  };

  const handleUpload = async () => {
    if (!file || !labelColumn || !protectedAttrs) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", datasetName);
      formData.append("label_column", labelColumn);
      formData.append("protected_attributes", protectedAttrs);
      formData.append("domain", domain);

      const response = (await ApiClient.uploadDataset(formData)) as UploadedDataset;
      addDataset({
        id: response.id,
        name: response.name,
        rows: response.row_count,
        columns: [],
        data: [],
        uploadedAt: new Date(),
        targetVariable: labelColumn,
        sensitiveAttributes: protectedAttrs.split(',').map(s => s.trim()),
      });
      setCurrentDataset({
        id: response.id,
        name: response.name,
        rows: response.row_count,
        columns: [],
        data: [],
        uploadedAt: new Date(),
        targetVariable: labelColumn,
        sensitiveAttributes: protectedAttrs.split(',').map(s => s.trim()),
      });
      setSuccess(true);

      setTimeout(() => {
        const params = new URLSearchParams({
          dataset_id: response.id,
          label: labelColumn,
          protected: protectedAttrs,
          domain,
        });
        navigate(`/analysis?${params.toString()}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Upload Dataset" subtitle="Upload your clinical data to begin fairness audits">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upload Form */}
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

              {/* File Drop */}
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

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Dataset Name</label>
                  <Input placeholder="e.g., Healthcare Triage Q1 2026" value={datasetName} onChange={(e) => setDatasetName(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Label Column *</label>
                  <Input placeholder="e.g., approved, triaged" value={labelColumn} onChange={(e) => setLabelColumn(e.target.value)} className="rounded-xl" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Protected Attributes *</label>
                <Input placeholder="e.g., gender, age_group, race" value={protectedAttrs} onChange={(e) => setProtectedAttrs(e.target.value)} className="rounded-xl" />
                <p className="text-xs text-muted-foreground mt-1">Comma-separated sensitive attributes</p>
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

              <Button onClick={handleUpload} disabled={!file || !labelColumn || !protectedAttrs || loading} className="w-full py-6 rounded-full btn-warm-primary">
                {loading ? "Processing..." : "Upload & Analyze"} <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
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
                datasets.slice(0, 5).map((ds, i) => (
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
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {ds.columns.length} cols</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ds.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
              {datasets.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">+{datasets.length - 5} more datasets</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}