import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { store, INITIAL_APPLICATIONS, INITIAL_USERS, INITIAL_SMS } from './src/data/store';
import { initDbStorage, saveDbStorage, createDatabaseBackup } from './src/data/dbPersistence';
import { createCitizenMcpServer } from './src/mcp/citizenServer';
import { createOfficerMcpServer } from './src/mcp/officerServer';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';
const OFFICER_MCP_TOKEN = process.env.OFFICER_MCP_TOKEN || 'officer-secret-key-purvanchal-2026';

// 1. Initialize persistent storage
const snapshot = initDbStorage(INITIAL_APPLICATIONS, INITIAL_USERS, INITIAL_SMS);
store.loadFromSnapshot(snapshot);
store.subscribe(() => {
  saveDbStorage(store.getSnapshot());
});
console.log(`[Persistence] Loaded ${store.getApplications().length} applications from persistent storage.`);

const app = express();
app.use(cors());

// Parse JSON for API routes (MCP SSE endpoints manage their own streams)
app.use('/api', express.json());

/* ---------------------------------------------------------------------------
 * Health Check & System Status
 * --------------------------------------------------------------------------- */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    service: 'Sewa Setu Full-Stack Portal & MCP Gateway',
    environment: IS_PROD ? 'production' : 'development',
    applications_count: store.getApplications().length,
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/* ---------------------------------------------------------------------------
 * Background RTPS Statutory Deemed Approval Scheduler
 * --------------------------------------------------------------------------- */
function triggerDeemedApprovalJob() {
  try {
    const res = store.runDeemedApproval();
    if (res.count > 0) {
      console.log(`[RTPS Scheduler] Processed ${res.count} overdue applications under RTPS statutory deemed approval.`);
    }
  } catch (err) {
    console.error('[RTPS Scheduler] Error executing deemed approval batch:', err);
  }
}

// Run once on startup and schedule hourly
triggerDeemedApprovalJob();
setInterval(triggerDeemedApprovalJob, 60 * 60 * 1000);

/* ---------------------------------------------------------------------------
 * Remote Citizen MCP Server (SSE Transport)
 * --------------------------------------------------------------------------- */
const citizenTransports = new Map<string, SSEServerTransport>();

app.get(['/mcp/citizen', '/mcp/citizen/sse'], async (req: Request, res: Response) => {
  console.log('[MCP Citizen] New client SSE connection request.');
  const transport = new SSEServerTransport('/mcp/citizen/messages', res);
  citizenTransports.set(transport.sessionId, transport);

  const server = createCitizenMcpServer();
  await server.connect(transport);

  req.on('close', () => {
    console.log(`[MCP Citizen] Client disconnected (session: ${transport.sessionId})`);
    citizenTransports.delete(transport.sessionId);
  });
});

app.post(['/mcp/citizen', '/mcp/citizen/messages'], async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId || !citizenTransports.has(sessionId)) {
    res.status(404).json({ error: 'Session not found or expired' });
    return;
  }
  const transport = citizenTransports.get(sessionId)!;
  await transport.handlePostMessage(req, res);
});

/* ---------------------------------------------------------------------------
 * Remote Officer MCP Server (Protected SSE Transport with Bearer Authentication)
 * --------------------------------------------------------------------------- */
const officerTransports = new Map<string, SSEServerTransport>();

import { authenticateOfficerToken, OfficerProfile } from './src/mcp/officerAuth';

// Officer Auth Middleware
function requireOfficerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const tokenQuery = req.query.token as string;

  let providedToken = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.slice(7).trim();
  } else if (tokenQuery) {
    providedToken = tokenQuery.trim();
  }

  const officer = authenticateOfficerToken(providedToken);
  if (!officer) {
    res.status(401).json({
      error: 'Unauthorized: Invalid or missing Officer MCP Bearer Token.',
      hint: 'Include Authorization: Bearer <OFFICER_MCP_TOKEN> in request headers.',
    });
    return;
  }
  (req as any).officer = officer;
  next();
}

app.get(['/mcp/officer', '/mcp/officer/sse'], requireOfficerAuth, async (req: Request, res: Response) => {
  const officer = (req as any).officer as OfficerProfile;
  console.log(`[MCP Officer] Authenticated officer SSE connection: ${officer.officer_id} (${officer.name})`);
  const transport = new SSEServerTransport('/mcp/officer/messages', res);
  officerTransports.set(transport.sessionId, transport);

  const server = createOfficerMcpServer(officer);
  await server.connect(transport);

  req.on('close', () => {
    console.log(`[MCP Officer] Officer disconnected (session: ${transport.sessionId})`);
    officerTransports.delete(transport.sessionId);
  });
});

app.post(['/mcp/officer', '/mcp/officer/messages'], async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId || !officerTransports.has(sessionId)) {
    res.status(404).json({ error: 'Officer session not found or expired' });
    return;
  }
  const transport = officerTransports.get(sessionId)!;
  await transport.handlePostMessage(req, res);
});

/* ---------------------------------------------------------------------------
 * REST APIs for Portal State & Interoperability
 * --------------------------------------------------------------------------- */
import { SUPPORTED_BLOCKS, getVillagesForBlock } from './src/services/applicationService';

app.get('/api/blocks', (req: Request, res: Response) => {
  res.json({ blocks: SUPPORTED_BLOCKS });
});

app.get('/api/blocks/:blockId/villages', (req: Request, res: Response) => {
  const rawBlock = req.params.blockId;
  const decodedBlock = decodeURIComponent(rawBlock).trim();

  if (!SUPPORTED_BLOCKS.includes(decodedBlock as any)) {
    res.status(400).json({
      error: `Unsupported development block '${decodedBlock}'. Must be one of: ${SUPPORTED_BLOCKS.join(', ')}`,
      supported_blocks: SUPPORTED_BLOCKS,
    });
    return;
  }

  const villages = getVillagesForBlock(decodedBlock);
  res.json({
    block: decodedBlock,
    villages,
  });
});

app.get('/api/applications', (req: Request, res: Response) => {
  res.json(store.getApplications());
});

app.get('/api/applications/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const appRecord = store.getApplicationById(id);
  if (!appRecord) {
    res.status(404).json({ error: 'Application not found' });
    return;
  }
  res.json(appRecord);
});

app.post('/api/admin/backup', (req: Request, res: Response) => {
  const backupRes = createDatabaseBackup();
  if (!backupRes.success) {
    res.status(500).json(backupRes);
    return;
  }
  res.json(backupRes);
});

/* ---------------------------------------------------------------------------
 * AI Agent Evaluation & Verification REST APIs
 * --------------------------------------------------------------------------- */
import { executeAllEvaluations, isEvaluationInProgress } from './src/eval/runner';
import { getLatestEvaluationRun, getEvaluationHistory, getEvaluationRunById } from './src/eval/evalPersistence';

app.get('/api/evaluations/status', (req: Request, res: Response) => {
  res.json({ inProgress: isEvaluationInProgress() });
});

app.get('/api/evaluations/latest', (req: Request, res: Response) => {
  const latest = getLatestEvaluationRun();
  if (!latest) {
    res.status(404).json({ error: 'No evaluations have been run yet.' });
    return;
  }
  res.json(latest);
});

app.get('/api/evaluations/history', (req: Request, res: Response) => {
  const history = getEvaluationHistory();
  res.json(history);
});

app.get('/api/evaluations/runs/:runId', (req: Request, res: Response) => {
  const run = getEvaluationRunById(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Evaluation run not found.' });
    return;
  }
  res.json(run);
});

app.get('/api/evaluations/runs/:runId/scenarios/:scenarioId', (req: Request, res: Response) => {
  const run = getEvaluationRunById(req.params.runId);
  if (!run) {
    res.status(404).json({ error: 'Evaluation run not found.' });
    return;
  }
  const scenario = run.results.find(s => s.id === req.params.scenarioId);
  if (!scenario) {
    res.status(404).json({ error: 'Scenario not found in specified evaluation run.' });
    return;
  }
  res.json(scenario);
});

app.post('/api/evaluations/run', async (req: Request, res: Response) => {
  if (isEvaluationInProgress()) {
    res.status(409).json({ error: 'An evaluation run is already in progress. Please wait.' });
    return;
  }

  try {
    const targetCategories = req.body?.categories;
    const result = await executeAllEvaluations(targetCategories);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Evaluation run failed unexpectedly.' });
  }
});

/* ---------------------------------------------------------------------------
 * Static Assets & Vite Middleware Routing
 * --------------------------------------------------------------------------- */
async function startServer() {
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get(/^(?!\/api|\/mcp|\/health).*/, (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('[Server] dist directory does not exist yet. Please run `npm run build`.');
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Server] Sewa Setu running at http://${HOST}:${PORT}`);
    console.log(`[Server] Citizen MCP SSE endpoint: http://${HOST}:${PORT}/mcp/citizen/sse`);
    console.log(`[Server] Protected Officer MCP SSE endpoint: http://${HOST}:${PORT}/mcp/officer/sse`);
  });
}

startServer().catch(err => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
