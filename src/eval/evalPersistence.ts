import fs from 'node:fs';
import path from 'node:path';
import { EvalRunRecord, EvalRunSummary } from './types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const EVAL_FILE = path.join(DATA_DIR, 'evaluations.json');

// In-memory cache
let inMemoryRuns: EvalRunRecord[] = [];

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[EvalPersistence] Failed to ensure data directory:', err);
  }
}

export function loadEvaluationHistory(): EvalRunRecord[] {
  ensureDataDir();
  try {
    if (fs.existsSync(EVAL_FILE)) {
      const data = fs.readFileSync(EVAL_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        inMemoryRuns = parsed;
        return inMemoryRuns;
      }
    }
  } catch (err) {
    console.warn('[EvalPersistence] Could not read evaluations.json, using in-memory state:', err);
  }
  return inMemoryRuns;
}

export function saveEvaluationRun(record: EvalRunRecord): void {
  ensureDataDir();
  loadEvaluationHistory();

  // Add new run at the beginning, limit history to last 20 runs
  inMemoryRuns = [record, ...inMemoryRuns.filter(r => r.summary.runId !== record.summary.runId)].slice(0, 20);

  try {
    const tmpFile = EVAL_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(inMemoryRuns, null, 2), 'utf-8');
    fs.renameSync(tmpFile, EVAL_FILE);
  } catch (err) {
    console.warn('[EvalPersistence] Could not write evaluations.json to disk:', err);
  }
}

export function getLatestEvaluationRun(): EvalRunRecord | null {
  const history = loadEvaluationHistory();
  return history.length > 0 ? history[0] : null;
}

export function getEvaluationHistory(): EvalRunSummary[] {
  const history = loadEvaluationHistory();
  return history.map(r => r.summary);
}

export function getEvaluationRunById(runId: string): EvalRunRecord | null {
  const history = loadEvaluationHistory();
  return history.find(r => r.summary.runId === runId) || null;
}
