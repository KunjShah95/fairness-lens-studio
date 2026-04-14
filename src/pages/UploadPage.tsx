import { useState } from "react";
import { AlertCircle, CheckCircle2, Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiClient } from "@/api/client";
import { useNavigate } from "react-router-dom";

interface UploadedDataset {
  id: string;
  name: string;
  row_count: number;
}

export function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [labelColumn, setLabelColumn] = useState("");
  const [protectedAttrs, setProtectedAttrs] = useState("");
  const [domain, setDomain] = useState("healthcare");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploadedDataset, setUploadedDataset] = useState<UploadedDataset | null>(null);

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
      setUploadedDataset(response);
      setSuccess(true);
      setFile(null);
      setLabelColumn("");
      setProtectedAttrs("");

      setTimeout(() => {
        const params = new URLSearchParams({
          dataset_id: response.id,
          label: labelColumn,
          protected: protectedAttrs,
          domain,
        });
        navigate(`/analysis?${params.toString()}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-background" />

      <div className="container py-12 max-w-2xl">
        <Card className="card-warm border-border/30">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl gradient-warm flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-display">Upload Dataset</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Upload your clinical data to run fairness audits</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Success Message */}
            {success && uploadedDataset && (
              <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex gap-3">
                <CheckCircle2 className="text-success flex-shrink-0 mt-0.5 w-5 h-5" />
                <div>
                  <p className="font-semibold text-foreground">Upload successful!</p>
                  <p className="text-sm text-muted-foreground">
                    "{uploadedDataset.name}" — {uploadedDataset.row_count} records loaded.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Redirecting to analysis...</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex gap-3">
                <AlertCircle className="text-destructive flex-shrink-0 mt-0.5 w-5 h-5" />
                <div>
                  <p className="font-semibold text-foreground">Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            )}

            {/* File Drop Zone */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">CSV File *</label>
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  file
                    ? "border-success bg-success/5"
                    : "border-border hover:border-primary/50 bg-muted/30"
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  {file ? (
                    <div className="space-y-2">
                      <FileSpreadsheet className="w-10 h-10 text-success mx-auto" />
                      <p className="font-semibold text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                      <p className="font-medium text-foreground">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">CSV files (100 MB max)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Dataset Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Dataset Name *</label>
              <Input
                placeholder="e.g., Healthcare Triage Q1 2026"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Label Column */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Label/Outcome Column *
              </label>
              <Input
                placeholder="e.g., triaged, admitted, approved"
                value={labelColumn}
                onChange={(e) => setLabelColumn(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Binary outcome column (0/1 or True/False)
              </p>
            </div>

            {/* Protected Attributes */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Protected Attributes *
              </label>
              <Input
                placeholder="e.g., gender, age_group, zip_code"
                value={protectedAttrs}
                onChange={(e) => setProtectedAttrs(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated column names for sensitive attributes
              </p>
            </div>

            {/* Domain */}
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Business Domain</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="healthcare">Healthcare</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!file || !labelColumn || !protectedAttrs || loading}
              className="w-full py-6 text-base font-medium rounded-full btn-warm-primary"
            >
              {loading ? "Uploading & Running Audit..." : "Upload & Start Audit"}
            </Button>

            {/* Info Box */}
            <div className="bg-secondary/10 rounded-xl p-4 border border-secondary/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Note:</strong> Your data is processed securely. Only metadata and audit results are stored.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}