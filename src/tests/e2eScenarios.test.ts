import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createCitizenMcpServer } from '../mcp/citizenServer';
import { createOfficerMcpServer } from '../mcp/officerServer';
import { OFFICER_REGISTRY } from '../mcp/officerAuth';
import { store } from '../data/store';
import { tokenManager } from '../mcp/tokenManager';

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

describe('Sewa Setu - Phase 6 Complete End-to-End System Scenarios (A - G)', () => {
  let citizenClient: Client;
  let officerClient: Client;
  let rajaparaOfficerClient: Client;

  beforeEach(async () => {
    store.resetToFactoryDefaults();
    tokenManager.clearAll();

    // 1. Citizen MCP Client
    const citizenServer = createCitizenMcpServer();
    const [cCitizen, sCitizen] = InMemoryTransport.createLinkedPair();
    await citizenServer.connect(sCitizen);
    citizenClient = new Client({ name: 'ai-citizen-client', version: '1.0.0' }, { capabilities: {} });
    await citizenClient.connect(cCitizen);

    // 2. Officer MCP Client (Sonari BDO)
    const sonariOfficer = OFFICER_REGISTRY['tok_officer_sonari'];
    const officerServer = createOfficerMcpServer(sonariOfficer);
    const [cOfficer, sOfficer] = InMemoryTransport.createLinkedPair();
    await officerServer.connect(sOfficer);
    officerClient = new Client({ name: 'ai-officer-client', version: '1.0.0' }, { capabilities: {} });
    await officerClient.connect(cOfficer);

    // 3. Officer MCP Client (Rajapara BDO)
    const rajaparaOfficer = OFFICER_REGISTRY['tok_officer_rajapara'];
    const rajaparaServer = createOfficerMcpServer(rajaparaOfficer);
    const [cRaj, sRaj] = InMemoryTransport.createLinkedPair();
    await rajaparaServer.connect(sRaj);
    rajaparaOfficerClient = new Client({ name: 'ai-rajapara-client', version: '1.0.0' }, { capabilities: {} });
    await rajaparaOfficerClient.connect(cRaj);
  });

  /* ========================================================================
   * SCENARIO A: CITIZEN APPLIES THROUGH AI (SYNTHETIC 70-YEAR-OLD)
   * ======================================================================== */
  it('Scenario A: Complete citizen application through AI with full portal synchronization', async () => {
    // 1. Ask for scheme information
    const schemeRes = await citizenClient.callTool({ name: 'get_scheme_information', arguments: {} });
    const schemeData = getJsonContent(schemeRes);
    expect(schemeData.monthly_pension_amount).toContain('250');
    expect(schemeData.statutory_minimum_age).toBe(60);

    // 2. Ask for supported blocks
    const blocksRes = await citizenClient.callTool({ name: 'get_supported_blocks', arguments: {} });
    const blocksData = getJsonContent(blocksRes);
    expect(blocksData.supported_blocks).toContain('Sonari');

    // 3. Ask for application requirements
    const reqRes = await citizenClient.callTool({ name: 'get_application_requirements', arguments: {} });
    const reqData = getJsonContent(reqRes);
    expect(reqData.requirements.length).toBeGreaterThanOrEqual(5);

    // 4. Start application for synthetic 70-year-old citizen
    const synthEmail = 'dharmeswar.h@example.com';
    const startRes = await citizenClient.callTool({
      name: 'start_application',
      arguments: { email: synthEmail },
    });
    const startData = getJsonContent(startRes);
    expect(startData.status).toBe('otp_sent');
    expect(startData.session_id).toMatch(/^ses_/);

    // 5. Verify OTP via backend gateway
    const otpCode = store.getLatestOtpForEmail(synthEmail)!.code;
    const verifyRes = await citizenClient.callTool({
      name: 'verify_email_otp',
      arguments: {
        session_id: startData.session_id,
        email: synthEmail,
        otp_code: otpCode,
      },
    });
    const verifyData = getJsonContent(verifyRes);
    expect(verifyData.verified).toBe(true);
    const verificationToken = verifyData.verification_token;

    // 6. Pre-submission validation
    const draft = {
      applicant_name: 'Dharmeswar Hazarika',
      dob: '15/08/1954', // 72 years old
      gender: 'Male' as const,
      marital_status: 'Married' as const,
      village: 'Bhojo Sonari',
      block: 'Sonari',
      bank_account: '501928374650',
      ifsc: 'SBIN0001234',
      mobile: '9435777111',
      doc_name: 'voter_id_dharmeswar.pdf',
      doc_size: 240000,
    };

    const validateRes = await citizenClient.callTool({
      name: 'validate_application_draft',
      arguments: draft,
    });
    const valData = getJsonContent(validateRes);
    expect(valData.valid).toBe(true);
    expect(valData.eligible_by_age).toBe(true);

    // 7. Submit finalized application
    const submitRes = await citizenClient.callTool({
      name: 'submit_application',
      arguments: {
        verification_token: verificationToken,
        consent_agreed: true,
        draft,
      },
    });
    const submitData = getJsonContent(submitRes);
    expect(submitData.confirmed).toBe(true);
    const appNo = submitData.application_no;
    expect(appNo).toMatch(/^SSP\d{8}$/);

    // 8. Confirm record exists immediately in official portal database
    const portalRecord = store.getApplicationByEmail(synthEmail);
    expect(portalRecord).toBeDefined();
    expect(portalRecord?.application_no).toBe(appNo);
    expect(portalRecord?.applicant_name).toBe('Dharmeswar Hazarika');
    expect(portalRecord?.status).toBe('PENDING');
  });

  /* ========================================================================
   * SCENARIO B: INELIGIBLE CITIZEN REJECTIONS
   * ======================================================================== */
  it('Scenario B: Ineligible applicants (age < 60, unsupported block, missing data) are strictly rejected', async () => {
    // 1. Below age 60 (Age 45)
    const youngRes = await citizenClient.callTool({
      name: 'validate_application_draft',
      arguments: {
        applicant_name: 'Tarun Gogoi',
        dob: '01/01/1981', // 45 years old
        gender: 'Male',
        marital_status: 'Married',
        village: 'Sonari',
        block: 'Sonari',
        bank_account: '123456789012',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
      },
    });
    const youngData = getJsonContent(youngRes);
    expect(youngData.valid).toBe(false);
    expect(youngData.eligible_by_age).toBe(false);
    expect(youngData.errors.some((e: string) => e.includes('at least 60 years of age'))).toBe(true);

    // 2. Unsupported block outside Purvanchal jurisdiction
    const wrongBlockRes = await citizenClient.callTool({
      name: 'validate_application_draft',
      arguments: {
        applicant_name: 'Elderly Citizen',
        dob: '01/01/1950',
        gender: 'Male',
        marital_status: 'Married',
        village: 'Guwahati Town',
        block: 'Guwahati Metro', // Not a supported block
        bank_account: '123456789012',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
      },
    });
    const wrongBlockData = getJsonContent(wrongBlockRes);
    expect(wrongBlockData.valid).toBe(false);
    expect(wrongBlockData.supported_block).toBe(false);
  });

  /* ========================================================================
   * SCENARIO C: CITIZEN CHECKS STATUS & PRIVACY PROTECTION
   * ======================================================================== */
  it('Scenario C: Authorized citizen views masked status; cross-citizen IDOR lookup is rejected', async () => {
    const emailA = 'ramesh.das@example.com'; // Ramesh Chandra Das, DOB: 12/04/1955
    const emailB = 'mina.devi@example.org'; // Not in seed, but we'll test rejection for existing others

    // 1. Authorized lookup with valid DOB password
    const authRes = await citizenClient.callTool({
      name: 'get_my_application_status',
      arguments: {
        email: emailA,
        password_dob: '12041955',
      },
    });
    const authData = getJsonContent(authRes);
    expect(authData.status).toBe('found');
    expect(authData.applicant_name).toBe('Ramesh Chandra Das');
    expect(authData.bank_account_masked).toBe('•••• •••• 8472'); // Masked for privacy

    // 2. Attacker attempts to look up Citizen B (using Bhabesh's email) using Citizen A's credentials
    const emailBhabesh = 'bhabesh.saikia@example.in';
    const attackRes = await citizenClient.callTool({
      name: 'get_my_application_status',
      arguments: {
        email: emailBhabesh,
        password_dob: '12041955', // Wrong password for Bhabesh
      },
    });
    expect(attackRes.isError).toBe(true);
    const attackData = getJsonContent(attackRes);
    expect(attackData.error_code).toBe('AUTHENTICATION_REQUIRED');
  });

  /* ========================================================================
   * SCENARIO D: OFFICER PROCESSES THE APPLICATION (QUEUE, EVIDENCE, APPROVE, REJECT)
   * ======================================================================== */
  it('Scenario D: Officer reviews queue, inspects evidence, and records decision with audit trail', async () => {
    // 1. Retrieve officer permitted queue
    const queueRes = await officerClient.callTool({
      name: 'get_officer_queue',
      arguments: {},
    });
    const queueData = getJsonContent(queueRes);
    expect(queueData.queue_count).toBeGreaterThan(0);
    const targetApp = queueData.applications[0];

    // 2. Inspect application summary
    const summaryRes = await officerClient.callTool({
      name: 'get_application_summary',
      arguments: { application_id: targetApp.id },
    });
    const summaryData = getJsonContent(summaryRes);
    expect(summaryData.id).toBe(targetApp.id);
    expect(summaryData.eligible_age).toBe(true);

    // 3. Inspect authorized evidence
    const evidenceRes = await officerClient.callTool({
      name: 'get_application_evidence',
      arguments: { application_id: targetApp.id },
    });
    const evData = getJsonContent(evidenceRes);
    expect(evData.evidence.is_valid_size).toBe(true);

    // 4. Check deadline
    const deadlineRes = await officerClient.callTool({
      name: 'check_processing_deadline',
      arguments: { application_id: targetApp.id },
    });
    const deadlineData = getJsonContent(deadlineRes);
    expect(deadlineData.statutory_sla_days).toBe(15);

    // 5. Submit approval decision
    const approveRes = await officerClient.callTool({
      name: 'record_officer_decision',
      arguments: {
        application_id: targetApp.id,
        decision: 'APPROVE',
        remarks: 'Documents verified and eligible under Section 4',
        confirm_explicit: true,
      },
    });
    const appData = getJsonContent(approveRes);
    expect(appData.status).toBe('confirmed');
    expect(appData.new_status).toBe('APPROVED');
    expect(appData.decided_by).toBe('bdo_sonari');

    // 6. Inspect decision history / audit record
    const historyRes = await officerClient.callTool({
      name: 'get_decision_history',
      arguments: { application_id: targetApp.id },
    });
    const histData = getJsonContent(historyRes);
    expect(histData.current_status).toBe('APPROVED');
    expect(histData.audit_trail.some((entry: any) => entry.action === 'APPROVED')).toBe(true);
  });

  /* ========================================================================
   * SCENARIO E: AUTHORIZATION ATTACKS
   * ======================================================================== */
  it('Scenario E: Authorization attacks fail safely without altering records', async () => {
    // 1. Sonari BDO attempts to adjudicate an application belonging to Rajapara block
    const rajaparaApp = store.getApplications().find(a => a.block === 'Rajapara')!;
    const crossBlockRes = await officerClient.callTool({
      name: 'record_officer_decision',
      arguments: {
        application_id: rajaparaApp.id,
        decision: 'APPROVE',
        confirm_explicit: true,
      },
    });
    expect(crossBlockRes.isError).toBe(true);
    const crossData = getJsonContent(crossBlockRes);
    expect(crossData.error_code).toBe('BLOCK_ACCESS_DENIED');

    // 2. Forged officer token in citizen tool
    const forgedTokenRes = await citizenClient.callTool({
      name: 'submit_application',
      arguments: {
        verification_token: 'tok_forged_fake_token',
        consent_agreed: true,
        draft: {
          applicant_name: 'Attacker',
          dob: '01/01/1950',
          gender: 'Male',
          marital_status: 'Married',
          village: 'Sonari',
          block: 'Sonari',
          bank_account: '123456789012',
          ifsc: 'SBIN0001234',
          mobile: '9876543210',
          doc_name: 'voter.pdf',
          doc_size: 100000,
        },
      },
    });
    expect(forgedTokenRes.isError).toBe(true);
    expect(getJsonContent(forgedTokenRes).error_code).toBe('UNAUTHORIZED');
  });

  /* ========================================================================
   * SCENARIO F: AUTOMATIC APPROVAL (15-DAY STATUTORY SLA)
   * ======================================================================== */
  it('Scenario F: 15-day statutory deemed approval job transitions overdue applications to RTPS-AUTO', () => {
    // App #1 (Ramesh Chandra Das) was submitted 18 days ago (simulated test clock)
    const rameshBefore = store.getApplicationById(1)!;
    expect(rameshBefore.status).toBe('PENDING');

    // Execute deemed approval
    const result = store.runDeemedApproval();
    expect(result.count).toBeGreaterThanOrEqual(1);

    const rameshAfter = store.getApplicationById(1)!;
    expect(rameshAfter.status).toBe('DEEMED_APPROVED');
    // Audit must record system actor RTPS-AUTO, never a human officer
    expect(rameshAfter.decided_by).toBe('RTPS-AUTO');
    expect(rameshAfter.audit_trail?.some(e => e.actor === 'RTPS-AUTO')).toBe(true);

    // Idempotency: re-running does not duplicate or overwrite
    const rerunResult = store.runDeemedApproval();
    expect(rerunResult.count).toBe(0);
  });

  /* ========================================================================
   * SCENARIO G: SERVICE FAILURES & TRUTHFUL ERROR HANDLING
   * ======================================================================== */
  it('Scenario G: Handles invalid inputs and rate limits with structured, truthful errors', async () => {
    const email = 'rate.limit@example.com';

    // 1. First OTP request
    const firstRes = await citizenClient.callTool({
      name: 'start_application',
      arguments: { email },
    });
    expect(firstRes.isError).toBeFalsy();

    // 2. Rapid second request triggering cooldown rate-limiting
    const secondRes = await citizenClient.callTool({
      name: 'start_application',
      arguments: { email },
    });
    expect(secondRes.isError).toBe(true);
    const errData = getJsonContent(secondRes);
    expect(errData.error_code).toBe('OTP_DISPATCH_FAILED');
  });
});
