export type EvalStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN';

export type EvalCategory =
  | 'CATEGORY_A' // Eligibility & Application Submission
  | 'CATEGORY_B' // Citizen MCP
  | 'CATEGORY_C' // Officer MCP
  | 'CATEGORY_D' // System of Record & Database Consistency
  | 'CATEGORY_E' // 15-Day Deemed Approval
  | 'CATEGORY_F' // Security & Privacy
  | 'CATEGORY_G' // Elderly-Citizen Usability
  | 'CATEGORY_H'; // MCP & Tool Integration

export interface EvalScenarioDefinition {
  id: string; // e.g. 'A01'
  category: EvalCategory;
  categoryLabel: string;
  name: string;
  description: string;
  persona?: string;
  expectedOutcome: string;
}

export interface EvalScenarioResult {
  id: string;
  category: EvalCategory;
  categoryLabel: string;
  name: string;
  description: string;
  persona?: string;
  testInput?: Record<string, any>;
  expectedOutcome: string;
  actualOutcome: string;
  status: EvalStatus;
  executionTimestamp: string;
  durationMs: number;
  explanation: string;
  errorDetails?: string;
  evidence?: {
    recordId?: string | number;
    applicationNo?: string;
    details?: string;
    checksPassed?: string[];
  };
}

export interface EvalRunSummary {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalScenarios: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  passRate: number; // percentage (0-100)
  timezone: string;
}

export interface EvalRunRecord {
  summary: EvalRunSummary;
  results: EvalScenarioResult[];
}
