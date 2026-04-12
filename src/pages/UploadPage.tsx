import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiClient } from "@/api/client";
import { useNavigate } from "react-router-dom";

export function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [labelColumn, setLabelColumn] = useState("");
  const [protectedAttrs, setProtectedAttrs] = useState("");
  const [domain, setDomain] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploadedDataset, setUploadedDataset] = useState<any>(null);

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

      const response = await ApiClient.uploadDataset(formData);
      setUploadedDataset(response);
      setSuccess(true);
      setFile(null);
      setLabelColumn("");
      setProtectedAttrs("");

      // Auto-redirect to analysis after 2 seconds
      setTimeout(() => {
        navigate(`/analysis?dataset_id=${response.id}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">EquityLens</h1>
          <p className="text-lg text-gray-600">Upload your dataset to run bias audits</p>
        </div>

        <Card className="p-8 shadow-lg">
          <div className="space-y-6">
            {/* Success Message */}
            {success && uploadedDataset && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Upload successful!</p>
                  <p className="text-sm text-green-700">
                    Dataset "{uploadedDataset.name}" uploaded with {uploadedDataset.row_count} rows.
                  </p>
                  <p className="text-xs text-green-600 mt-1">Redirecting to analysis...</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* File Upload Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">CSV File *</label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                    file
                      ? "border-green-300 bg-green-50"
                      : "border-gray-300 hover:border-blue-300 bg-gray-50"
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
                      <>
                        <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="font-semibold text-green-700">{file.name}</p>
                        <p className="text-xs text-green-600">({(file.size / 1024).toFixed(1)} KB)</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-700 mb-1">Click to upload or drag and drop</p>
                        <p className="text-sm text-gray-500">CSV files (100 MB max)</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Dataset Name */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Dataset Name *</label>
                <Input
                  placeholder="e.g., Hiring Dataset Q1 2026"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Label Column */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Label/Outcome Column *
                </label>
                <Input
                  placeholder="e.g., hired, approved, admitted"
                  value={labelColumn}
                  onChange={(e) => setLabelColumn(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The binary outcome column (0/1 or True/False)
                </p>
              </div>

              {/* Protected Attributes */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Protected Attributes (comma-separated) *
                </label>
                <Input
                  placeholder="e.g., gender, race, age"
                  value={protectedAttrs}
                  onChange={(e) => setProtectedAttrs(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Column names for sensitive attributes to check for bias
                </p>
              </div>

              {/* Domain */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Business Domain (optional)
                </label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white outline-none"
                >
                  <option value="general">General</option>
                  <option value="hiring">Hiring / Recruitment</option>
                  <option value="lending">Lending / Credit</option>
                  <option value="healthcare">Healthcare</option>
                </select>
              </div>
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!file || !labelColumn || !protectedAttrs || loading}
              className="w-full py-6 text-lg font-semibold"
              size="lg"
            >
              {loading ? "Uploading & Analyzing..." : "Upload & Start Audit"}
            </Button>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Your data is processed securely. Only metadata and audit results are stored.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
