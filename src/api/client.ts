import type { JsonValue, MitigationType } from '@/lib/types';

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8001');

export class ApiClient {
  private static headers = {
    'Content-Type': 'application/json',
  };

  static async request(method: string, path: string, body?: unknown, options?: RequestInit) {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  static async uploadDataset(formData: FormData) {
    const url = `${BASE_URL}/api/datasets/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  static listDatasets(skip = 0, limit = 50) {
    return this.request('GET', `/api/datasets?skip=${skip}&limit=${limit}`);
  }

  static getDataset(datasetId: string) {
    return this.request('GET', `/api/datasets/${datasetId}`);
  }

  static startAudit(datasetId: string, labelColumn: string, protectedAttributes: string[], domain: string) {
    return this.request('POST', '/api/audit/run', {
      dataset_id: datasetId,
      label_column: labelColumn,
      protected_attributes: protectedAttributes,
      domain,
    });
  }

  static getAuditResult(auditId: string) {
    return this.request('GET', `/api/audit/${auditId}`);
  }

  static listAudits(datasetId?: string, skip = 0, limit = 50) {
    const query = new URLSearchParams();
    if (datasetId) query.append('dataset_id', datasetId);
    query.append('skip', skip.toString());
    query.append('limit', limit.toString());
    return this.request('GET', `/api/audit?${query}`);
  }

  static applyMitigation(auditId: string, technique: 'reweighting' | 'feature_removal' | 'adversarial') {
    return this.request('POST', '/api/mitigation/apply', {
      audit_id: auditId,
      technique,
    });
  }

  static generateCounterfactuals(auditId: string, queryInstance: Record<string, JsonValue>) {
    return this.request('POST', '/api/simulator/counterfactuals', {
      audit_id: auditId,
      query_instance: queryInstance,
    });
  }

  static getPopulationImpact(auditId: string, intervention: MitigationType = 'reweighting') {
    return this.request('POST', '/api/simulator/population-impact', {
      audit_id: auditId,
      intervention,
    });
  }

  static modelScenario(auditId: string, scenarioType: string, params: Record<string, JsonValue>) {
    return this.request('POST', '/api/simulator/scenario', {
      audit_id: auditId,
      scenario_type: scenarioType,
      params,
    });
  }

  static portalExplain(auditId: string, profile: Record<string, JsonValue>) {
    return this.request('POST', '/api/portal/explain', {
      audit_id: auditId,
      profile,
    });
  }

  static submitAppeal(auditId: string, email: string, reason: string) {
    return this.request('POST', '/api/portal/appeal', {
      audit_id: auditId,
      email,
      reason,
    });
  }

  static getAppealStatus(appealId: string) {
    return this.request('GET', `/api/portal/appeal/${appealId}`);
  }

  static async generateAuditReport(auditId: string, format: 'json' | 'html' | 'pdf' = 'json') {
    return this.request('GET', `/api/reports/audit-report/${auditId}?format=${format}`);
  }

  static async getAuditReportHTML(auditId: string) {
    const url = `${BASE_URL}/api/reports/audit-report-html/${auditId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch report');
    return response.text();
  }

  static async generateModelCard(auditId: string, format: 'json' | 'markdown' = 'json') {
    return this.request('GET', `/api/reports/model-card/${auditId}?format=${format}`);
  }

  static async getModelCardMarkdown(auditId: string) {
    const url = `${BASE_URL}/api/reports/model-card-markdown/${auditId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch model card');
    return response.text();
  }

  static async getComplianceReport(auditId: string, jurisdiction: string = 'healthcare_hipaa', domain: string = 'healthcare') {
    return this.request('GET', `/api/governance/compliance/${auditId}?jurisdiction=${jurisdiction}&domain=${domain}`);
  }

  static async exportAuditData(auditId: string, exportType: 'summary' | 'metrics' | 'intersectional' | 'features' | 'full' = 'summary') {
    return this.request('GET', `/api/reports/export/${auditId}?export_type=${exportType}`);
  }

  static async getDashboardData(auditId: string) {
    return this.request('GET', `/api/reports/dashboard-data/${auditId}`);
  }

  static async healthCheck() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
      const result = await this.request('GET', '/health', undefined, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      console.log('Health check failed or timed out. Falling back to local engine.');
      return null;
    }
  }
}