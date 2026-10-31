import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createCitizenMcpServer } from '../mcp/citizenServer';
import { createOfficerMcpServer } from '../mcp/officerServer';
import { OFFICER_REGISTRY } from '../mcp/officerAuth';
import { store, INITIAL_APPLICATIONS, INITIAL_USERS, INITIAL_SMS } from '../data/store';
import { initDbStorage, saveDbStorage, createDatabaseBackup } from '../data/dbPersistence';
import { SLA_DAYS } from '../services/applicationService';

function getTextContent(res: any): string {
  if (Array.isArray(res?.content) && res.content[0]?.text) {
    return res.content[0].text;
  }
  return '';
}

function getJsonContent(res: any): any {
  const text = getTextContent(res);
  return text ? JSON.parse(text) : {};
}

describe('Sewa Setu - Phase 7 Production Deployment & Remote MCP Smoke Tests', () => {
  let citizenClient: Client;
  let officerClient: Client;
  let citizenServerTransport: any;
  let citizenClientTransport: any;
  let officerServerTransport: any;
  let officerClientTransport: any;

  beforeEach(async () => {
    store.resetToFactoryDefaults();
    const snapshot = store.getSnapshot();
    saveDbStorage(snapshot);
    store.loadFromSnapshot(snapshot);
    store.subscribe(() => {
      saveDbStorage(store.getSnapshot());
    });

    // 1. Citizen MCP client setup
    const citizenServer = createCitizenMcpServer();
    [citizenClientTransport, citizenServerTransport] = InMemoryTransport.createLinkedPair();
    await citizenServer.connect(citizenServerTransport);
    citizenClient = new Client({ name: 'test-citizen-remote', version: '1.0.0' }, { capabilities: {} });
    await citizenClient.connect(citizenClientTransport);

    // 2. Officer MCP client setup (District Magistrate with supervisory access)
    const officerProfile = OFFICER_REGISTRY['tok_dm_purvanchal'];
    const officerServer = createOfficerMcpServer(officerProfile);
    [officerClientTransport, officerServerTransport] = InMemoryTransport.createLinkedPair();
    await officerServer.connect(officerServerTransport);
    officerClient = new Client({ name: 'test-officer-remote', version: '1.0.0' }, { capabilities: {} });
    await officerClient.connect(officerClientTransport);
  });

  /* ========================================================================
   * 1. DATABASE PERSISTENCE, BACKUP & RESTART INTEGRITY
   * ======================================================================== */
  it('Persists records to disk and preserves state across simulated service restarts', () => {
    const initialCount = store.getApplications().length;

    // Create a new application
    const newEmail = 'persistent.test@example.com';
    const createRes = store.createApplication(newEmail, {
      applicant_name: 'Persistent Citizen Test',
      dob: '01/01/1953',
      gender: 'Male',
      marital_status: 'Married',
      village: 'Sonari Town',
      block: 'Sonari',
      bank_account: '998877665544',
      ifsc: 'SBIN0001234',
      mobile: '9876500999',
      doc_name: 'voter_id.pdf',
      doc_size: 150000,
    });

    expect(createRes.success).toBe(true);
    const newAppNo = createRes.application?.application_no;

    // Simulate database backup
    const backupRes = createDatabaseBackup();
    expect(backupRes.success).toBe(true);

    // Simulate service restart: load snapshot from file
    const freshSnapshot = initDbStorage(INITIAL_APPLICATIONS, INITIAL_USERS, INITIAL_SMS);
    expect(freshSnapshot.applications.length).toBe(initialCount + 1);

    const reloaded = freshSnapshot.applications.find(a => a.email === newEmail);
    expect(reloaded).toBeDefined();
    expect(reloaded?.application_no).toBe(newAppNo);
    expect(reloaded?.applicant_name).toBe('Persistent Citizen Test');
  });

  /* ========================================================================
   * 2. OFFICER MCP TOOLS & PRIVILEGED CAPABILITIES
   * ======================================================================== */
  it('Officer MCP discovers all 6 privileged administrative tools', async () => {
    const res = await officerClient.listTools();
    const names = res.tools.map(t => t.name);

    expect(names).toContain('get_officer_queue');
    expect(names).toContain('get_application_summary');
    expect(names).toContain('get_application_evidence');
    expect(names).toContain('check_processing_deadline');
    expect(names).toContain('record_officer_decision');
    expect(names).toContain('get_decision_history');
    expect(names.length).toBe(6);
  });

  it('Officer MCP retrieves officer queue with days pending and SLA status', async () => {
    const res = await officerClient.callTool({
      name: 'get_officer_queue',
      arguments: {},
    });

    const data = getJsonContent(res);
    expect(data.queue_count).toBeGreaterThan(0);
    expect(data.officer.id).toBe('dm_purvanchal');
    expect(data.applications[0].days_pending).toBeDefined();
  });

  it('Officer MCP checks statutory processing deadline under RTPS Act', async () => {
    // App #1 (Ramesh Chandra Das) was submitted 18 days ago
    const res = await officerClient.callTool({
      name: 'check_processing_deadline',
      arguments: { application_id: 1 },
    });

    const data = getJsonContent(res);
    expect(data.statutory_sla_days).toBe(SLA_DAYS);
    expect(data.is_overdue).toBe(true);
    expect(data.deemed_approval_applicable).toBe(true);
  });

  /* ========================================================================
   * 3. END-TO-END CITIZEN MCP -> PORTAL -> OFFICER MCP WORKFLOW
   * ======================================================================== */
  it('E2E: Citizen submits via MCP, record appears in portal, Officer approves via MCP', async () => {
    const citizenEmail = 'ananta@example.com';
    const citizenMobile = '9435019283';

    // 1. Citizen MCP starts application
    const startRes = await citizenClient.callTool({
      name: 'start_application',
      arguments: { email: citizenEmail },
    });
    const sessionId = getJsonContent(startRes).session_id;

    // 2. Citizen verifies OTP
    const otp = store.getLatestOtpForEmail(citizenEmail)!.code;
    const verifyRes = await citizenClient.callTool({
      name: 'verify_email_otp',
      arguments: { session_id: sessionId, email: citizenEmail, otp_code: otp },
    });
    const token = getJsonContent(verifyRes).verification_token;

    // 3. Citizen submits application via MCP
    const submitRes = await citizenClient.callTool({
      name: 'submit_application',
      arguments: {
        verification_token: token,
        consent_agreed: true,
        draft: {
          applicant_name: 'Ananta Saikia',
          dob: '25/12/1951', // 74 years old
          gender: 'Male',
          marital_status: 'Married',
          village: 'Borgaon Chariali',
          block: 'Borgaon',
          bank_account: '409281726354',
          ifsc: 'PUNB0192800',
          mobile: citizenMobile,
          doc_name: 'voter_id_ananta.pdf',
          doc_size: 320000,
        },
      },
    });

    const submitData = getJsonContent(submitRes);
    expect(submitData.confirmed).toBe(true);
    const appId = submitData.application_id;
    const appNo = submitData.application_no;

    // 4. Verify record appears immediately in portal store
    const portalRecord = store.getApplicationById(appId);
    expect(portalRecord).toBeDefined();
    expect(portalRecord?.application_no).toBe(appNo);
    expect(portalRecord?.status).toBe('PENDING');

    // 5. Officer inspects dossier via Officer MCP
    const summaryRes = await officerClient.callTool({
      name: 'get_application_summary',
      arguments: { application_id: appId },
    });
    const summaryData = getJsonContent(summaryRes);
    expect(summaryData.applicant_name).toBe('Ananta Saikia');
    expect(summaryData.status).toBe('PENDING');

    // 6. Officer approves application via Officer MCP
    const adjudicateRes = await officerClient.callTool({
      name: 'record_officer_decision',
      arguments: {
        application_id: appId,
        decision: 'APPROVE',
        remarks: 'All documents verified and eligible under Purvanchal RTPS rules.',
        confirm_explicit: true,
      },
    });

    const adjData = getJsonContent(adjudicateRes);
    expect(adjData.status).toBe('confirmed');
    expect(adjData.new_status).toBe('APPROVED');
    expect(adjData.decided_by).toBe('dm_purvanchal');

    // 7. Verify portal reflects approval and officer audit trail
    const updatedPortal = store.getApplicationById(appId);
    expect(updatedPortal?.status).toBe('APPROVED');
    expect(updatedPortal?.decided_by).toBe('dm_purvanchal');

    // 8. Citizen checks status via Citizen MCP
    const statusRes = await citizenClient.callTool({
      name: 'get_my_application_status',
      arguments: {
        email: citizenEmail,
        password_dob: '25121951',
      },
    });
    const statusData = getJsonContent(statusRes);
    expect(statusData.official_status).toBe('APPROVED');
    expect(statusData.decided_by).toBe('dm_purvanchal');
    expect(statusData.bank_account_masked).toBe('•••• •••• 6354');
  });

  /* ========================================================================
   * 4. DECISION HISTORY & AUDIT TRAIL RETRIEVAL
   * ======================================================================== */
  it('Officer MCP retrieves immutable decision history and audit trail', async () => {
    const res = await officerClient.callTool({
      name: 'get_decision_history',
      arguments: { limit: 10 },
    });

    const data = getJsonContent(res);
    expect(data.officer_id).toBe('dm_purvanchal');
    expect(data.history).toBeDefined();
  });
});
