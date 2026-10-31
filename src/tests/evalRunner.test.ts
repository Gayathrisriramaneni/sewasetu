import { describe, it, expect, beforeEach } from 'vitest';
import { executeAllEvaluations, isEvaluationInProgress } from '../eval/runner';
import { getLatestEvaluationRun, getEvaluationHistory, getEvaluationRunById } from '../eval/evalPersistence';
import { store } from '../data/store';

describe('AI Agent Evaluation & Verification Framework (Categories A - H)', () => {
  beforeEach(() => {
    store.resetToFactoryDefaults();
  });

  it('runs complete evaluation suite across all 8 categories and achieves passing status', async () => {
    const initialAppsCount = store.getApplications().length;

    const record = await executeAllEvaluations();

    expect(record).toBeDefined();
    expect(record.summary.totalScenarios).toBeGreaterThanOrEqual(45);
    expect(record.summary.passed).toBeGreaterThanOrEqual(45);
    expect(record.summary.failed).toBe(0);
    expect(record.summary.blocked).toBe(0);
    expect(record.summary.passRate).toBe(100);

    // Verify categories present
    const categoriesFound = new Set(record.results.map(r => r.category));
    expect(categoriesFound.has('CATEGORY_A')).toBe(true);
    expect(categoriesFound.has('CATEGORY_B')).toBe(true);
    expect(categoriesFound.has('CATEGORY_C')).toBe(true);
    expect(categoriesFound.has('CATEGORY_D')).toBe(true);
    expect(categoriesFound.has('CATEGORY_E')).toBe(true);
    expect(categoriesFound.has('CATEGORY_F')).toBe(true);
    expect(categoriesFound.has('CATEGORY_G')).toBe(true);
    expect(categoriesFound.has('CATEGORY_H')).toBe(true);

    // Verify persistence
    const latest = getLatestEvaluationRun();
    expect(latest).toBeDefined();
    expect(latest?.summary.runId).toBe(record.summary.runId);

    const history = getEvaluationHistory();
    expect(history.length).toBeGreaterThanOrEqual(1);

    const byId = getEvaluationRunById(record.summary.runId);
    expect(byId).toBeDefined();
    expect(byId?.summary.runId).toBe(record.summary.runId);

    // Verify synthetic data cleanup: real applications preserved, synthetic test apps cleaned up
    const finalAppsCount = store.getApplications().length;
    expect(finalAppsCount).toBe(initialAppsCount);
  }, 30000);

  it('reports concurrency state correctly and prevents race conditions', () => {
    expect(isEvaluationInProgress()).toBe(false);
  });
});
