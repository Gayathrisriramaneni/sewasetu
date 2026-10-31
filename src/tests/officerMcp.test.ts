import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createOfficerMcpServer } from '../mcp/officerServer';
import { createCitizenMcpServer } from '../mcp/citizenServer';
import { OFFICER_REGISTRY } from '../mcp/officerAuth';
import { store } from '../data/store';

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

describe('Sewa Setu - Phase 5 Officer MCP Server & RBAC Test Suite', () => {
  let sonariClient: Client;
  let rajaparaClient: Client;
  let dmClient: Client;
  let unauthClient: Client;
  let citizenClient: Client;

  beforeEach(async () => {
    store.resetToFactoryDefaults();

    // 1. Sonari BDO client (Assigned only to Sonari)
    const sonariOfficer = OFFICER_REGISTRY['tok_officer_sonari'];
    const sonariServer = createOfficerMcpServer(sonariOfficer);
    const [cSonari, sSonari] = InMemoryTransport.createLinkedPair();
    await sonariServer.connect(sSonari);
    sonariClient = new Client({ name: 'test-sonari-bdo', version: '1.0.0' }, { capabilities: {} });
    await sonariClient.connect(cSonari);

    // 2. Rajapara BDO client (Assigned only to Rajapara)
    const rajaparaOfficer = OFFICER_REGISTRY['tok_officer_rajapara'];
    const rajaparaServer = createOfficerMcpServer(rajaparaOfficer);
    const [cRajapara, sRajapara] = InMemoryTransport.createLinkedPair();
    await rajaparaServer.connect(sRajapara);
    rajaparaClient = new Client({ name: 'test-rajapara-bdo', version: '1.0.0' }, { capabilities: {} });
    await rajaparaClient.connect(cRajapara);

    // 3. District Magistrate client (Supervisory access to all blocks)
    const dmOfficer = OFFICER_REGISTRY['tok_dm_purvanchal'];
    const dmServer = createOfficerMcpServer(dmOfficer);
    const [cDm, sDm] = InMemoryTransport.createLinkedPair();
    await dmServer.connect(sDm);
    dmClient = new Client({ name: 'test-dm', version: '1.0.0' }, { capabilities: {} });
    await dmClient.connect(cDm);

    // 4. Unauthenticated officer server (No officer context provided)
    const unauthServer = createOfficerMcpServer(undefined);
    const [cUnauth, sUnauth] = InMemoryTransport.createLinkedPair();
    await unauthServer.connect(sUnauth);
    unauthClient = new Client({ name: 'test-unauth', version: '1.0.0' }, { capabilities: {} });
    await unauthClient.connect(cUnauth);

    // 5. Citizen MCP client (to verify strict separation)
    const citizenServer = createCitizenMcpServer();
    const [cCitizen, sCitizen] = InMemoryTransport.createLinkedPair();
    await citizenServer.connect(sCitizen);
    citizenClient = new Client({ name: 'test-citizen', version: '1.0.0' }, { capabilities: {} });
    await citizenClient.connect(cCitizen);
  });

  /* ========================================================================
   * 1. TOOL DISCOVERY & STRICT PRIVILEGE SEPARATION
   * ======================================================================== */
  it('Officer MCP discovers all 6 administrative tools', async () => {
    const res = await sonariClient.listTools();
    const toolNames = res.tools.map(t => t.name);

    expect(toolNames).toContain('get_officer_queue');
    expect(toolNames).toContain('get_application_summary');
    expect(toolNames).toContain('get_application_evidence');
    expect(toolNames).toContain('check_processing_deadline');
    expect(toolNames).toContain('record_officer_decision');
    expect(toolNames).toContain('get_decision_history');
    expect(toolNames.length).toBe(6);
  });

  it('Citizen MCP does NOT expose any officer adjudication tools', async () => {
    const res = await citizenClient.listTools();
    const toolNames = res.tools.map(t => t.name);

    expect(toolNames).not.toContain('record_officer_decision');
    expect(toolNames).not.toContain('get_officer_queue');
    expect(toolNames).not.toContain('get_application_evidence');
    expect(toolNames).not.toContain('get_decision_history');
  });

  /* ========================================================================
   * 2. BLOCK-LEVEL ACCESS CONTROL (RBAC)
   * ======================================================================== */
  it('BDO Sonari queue only contains applications from Sonari block', async () => {
    const res = await sonariClient.callTool({
      name: 'get_officer_queue',
      arguments: {},
    });

    const data = getJsonContent(res);
    expect(data.officer.id).toBe('bdo_sonari');
    expect(data.queue_count).toBeGreaterThan(0);
    // Every application in Sonari BDO queue must belong to Sonari
    expect(data.applications.every((a: any) => a.block.toLowerCase() === 'sonari')).toBe(true);
  });

  it('BDO Sonari is rejected when attempting to access a Rajapara application', async () => {
    // App #3 (Bhabesh Saikia) belongs to Rajapara block
    const rajaparaApp = store.getApplications().find(a => a.block === 'Rajapara');
    expect(rajaparaApp).toBeDefined();

    const res = await sonariClient.callTool({
      name: 'get_application_summary',
      arguments: { application_id: rajaparaApp!.id },
    });

    expect(res.isError).toBe(true);
    const data = getJsonContent(res);
    expect(data.error_code).toBe('BLOCK_ACCESS_DENIED');
    expect(data.message).toContain('not authorized to access applications from Block');
  });

  it('District Magistrate can access applications from any block', async () => {
    // App #1 is Sonari, App #3 is Rajapara
    const sonariApp = store.getApplications().find(a => a.block === 'Sonari')!;
    const rajaparaApp = store.getApplications().find(a => a.block === 'Rajapara')!;

    const res1 = await dmClient.callTool({
      name: 'get_application_summary',
      arguments: { application_id: sonariApp.id },
    });
    expect(res1.isError).toBeFalsy();

    const res2 = await dmClient.callTool({
      name: 'get_application_summary',
      arguments: { application_id: rajaparaApp.id },
    });
    expect(res2.isError).toBeFalsy();
  });

  it('Unauthenticated officer call is rejected with AUTHENTICATION_REQUIRED', async () => {
    const res = await unauthClient.callTool({
      name: 'get_officer_queue',
      arguments: {},
    });

    expect(res.isError).toBe(true);
    const data = getJsonContent(res);
    expect(data.error).toContain('AUTHENTICATION_REQUIRED');
  });

  /* ========================================================================
   * 3. OFFICIAL ADJUDICATION & IMMUTABLE AUDIT TRAIL
   * ======================================================================== */
  it('Approves pending application with explicit confirmation and binds trusted officer identity', async () => {
    const sonariApp = store.getApplications().find(a => a.block === 'Sonari' && a.status === 'PENDING')!;
    expect(sonariApp).toBeDefined();

    const res = await sonariClient.callTool({
      name: 'record_officer_decision',
      arguments: {
        application_id: sonariApp.id,
        decision: 'APPROVE',
        remarks: 'Physical age proof verified by Panchayat Secretary',
        confirm_explicit: true,
      },
    });

    expect(res.isError).toBeFalsy();
    const data = getJsonContent(res);
    expect(data.status).toBe('confirmed');
    expect(data.new_status).toBe('APPROVED');
    // Officer identity must be bound from server session (bdo_sonari), never forged!
    expect(data.decided_by).toBe('bdo_sonari');
    expect(data.audit_record.action).toBe('APPROVED');
    expect(data.audit_record.actor).toBe('bdo_sonari');

    // Portal store must immediately reflect the approval
    const portalApp = store.getApplicationById(sonariApp.id)!;
    expect(portalApp.status).toBe('APPROVED');
    expect(portalApp.decided_by).toBe('bdo_sonari');
  });

  it('Rejection strictly requires a statutory reason of at least 5 characters', async () => {
    const sonariApp = store.getApplications().find(a => a.block === 'Sonari' && a.status === 'PENDING')!;

    // Attempt rejection with empty reason
    const failRes = await sonariClient.callTool({
      name: 'record_officer_decision',
      arguments: {
        application_id: sonariApp.id,
        decision: 'REJECT',
        remarks: 'No', // Too short
        confirm_explicit: true,
      },
    });

    expect(failRes.isError).toBe(true);
    const failData = getJsonContent(failRes);
    expect(failData.error_code).toBe('REJECTION_REASON_REQUIRED');

    // Valid rejection
    const passRes = await sonariClient.callTool({
      name: 'record_officer_decision',
      arguments: {
        application_id: sonariApp.id,
        decision: 'REJECT',
        remarks: 'Bank account name does not match Voter ID age proof',
        confirm_explicit: true,
      },
    });

    expect(passRes.isError).toBeFalsy();
    const passData = getJsonContent(passRes);
    expect(passData.new_status).toBe('REJECTED');
    expect(passData.decision_reason).toContain('Bank account name does not match');
  });

  it('Protects terminal states: already-decided application cannot be overwritten', async () => {
    // App #5 is already REJECTED in initial seed data
    const rejectedApp = store.getApplications().find(a => a.status === 'REJECTED')!;

    const res = await dmClient.callTool({
      name: 'record_officer_decision',
      arguments: {
        application_id: rejectedApp.id,
        decision: 'APPROVE',
        confirm_explicit: true,
      },
    });

    expect(res.isError).toBe(true);
    const data = getJsonContent(res);
    expect(data.error_code).toBe('TERMINAL_STATE');
  });

  /* ========================================================================
   * 4. STATUTORY SLA DEADLINE & RTPS DEEMED APPROVAL
   * ======================================================================== */
  it('check_processing_deadline accurately identifies 15-day SLA timeline and overdue status', async () => {
    // App #1 (Ramesh Chandra Das) was submitted 18 days ago
    const rameshApp = store.getApplicationById(1)!;

    const res = await sonariClient.callTool({
      name: 'check_processing_deadline',
      arguments: { application_id: rameshApp.id },
    });

    const data = getJsonContent(res);
    expect(data.statutory_sla_days).toBe(15);
    expect(data.days_elapsed).toBeGreaterThanOrEqual(18);
    expect(data.is_overdue).toBe(true);
    expect(data.deemed_approval_applicable).toBe(true);
  });
});
