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

describe('Sewa Setu - Handout Reference: 10 Core Evaluation Scenarios', () => {
  let citizenClient: Client;
  let sonariOfficerClient: Client;
  let rajaparaOfficerClient: Client;

  beforeEach(async () => {
    store.resetToFactoryDefaults();
    tokenManager.clearAll();

    // Citizen MCP client
    const citizenServer = createCitizenMcpServer();
    const [cCitizen, sCitizen] = InMemoryTransport.createLinkedPair();
    await citizenServer.connect(sCitizen);
    citizenClient = new Client({ name: 'handout-citizen-client', version: '1.0.0' }, { capabilities: {} });
    await citizenClient.connect(cCitizen);

    // BDO Sonari client
    const sonariOfficer = OFFICER_REGISTRY['tok_officer_sonari'];
    const sonariServer = createOfficerMcpServer(sonariOfficer);
    const [cSonari, sSonari] = InMemoryTransport.createLinkedPair();
    await sonariServer.connect(sSonari);
    sonariOfficerClient = new Client({ name: 'handout-bdo-sonari', version: '1.0.0' }, { capabilities: {} });
    await sonariOfficerClient.connect(cSonari);

    // BDO Rajapara client
    const rajaparaOfficer = OFFICER_REGISTRY['tok_officer_rajapara'];
    const rajaparaServer = createOfficerMcpServer(rajaparaOfficer);
    const [cRajapara, sRajapara] = InMemoryTransport.createLinkedPair();
    await rajaparaServer.connect(sRajapara);
    rajaparaOfficerClient = new Client({ name: 'handout-bdo-rajapara', version: '1.0.0' }, { capabilities: {} });
    await rajaparaOfficerClient.connect(cRajapara);
  });

  /* -------------------------------------------------------------------------
   * Scenario 1: Kamala Devi (Age 68, Disangmukh, Sonari) - Eligibility & Submission
   * ------------------------------------------------------------------------- */
  it('Scenario 1 [Kamala Devi]: Eligible citizen submits application -> PENDING in Sonari', async () => {
    const email = 'kamala.devi@example.com';
    const mobile = '9854011223';

    // 1. Start application & OTP
    const startRes = await citizenClient.callTool({
      name: 'start_application',
      arguments: { email },
    });
    const { session_id } = getJsonContent(startRes);

    const otp = store.getLatestOtpForEmail(email)!.code;
    const verifyRes = await citizenClient.callTool({
      name: 'verify_email_otp',
      arguments: { session_id, email, otp_code: otp },
    });
    const { verification_token } = getJsonContent(verifyRes);

    // 2. Submit application
    const submitRes = await citizenClient.callTool({
      name: 'submit_application',
      arguments: {
        verification_token,
        consent_agreed: true,
        draft: {
          applicant_name: 'Kamala Devi',
          dob: '10/05/1958', // 68 years old
          gender: 'Female',
          marital_status: 'Widowed',
          husband_name: 'Late Bhupen Devi',
          village: 'Disangmukh',
          block: 'Sonari',
          bank_account: '203948576102',
          ifsc: 'SBIN0001234',
          mobile: mobile,
          doc_name: 'voter_card_kamala.pdf',
          doc_size: 210000,
        },
      },
    });

    const submitData = getJsonContent(submitRes);
    expect(submitData.confirmed).toBe(true);
    expect(submitData.application_no).toMatch(/^SSP\d{8}$/);

    // Database verification: record exists with status='PENDING' and block='Sonari'
    const app = store.getApplicationByEmail(email);
    expect(app).toBeDefined();
    expect(app?.applicant_name).toBe('Kamala Devi');
    expect(app?.status).toBe('PENDING');
    expect(app?.block).toBe('Sonari');
  });

  /* -------------------------------------------------------------------------
   * Scenario 2: Bhaben Bora (Age 58, Borgaon Bazar, Borgaon) - Age Boundary Check
   * ------------------------------------------------------------------------- */
  it('Scenario 2 [Bhaben Bora]: Underage applicant (58 < 60) is rejected; 0 records created', async () => {
    const res = await citizenClient.callTool({
      name: 'validate_application_draft',
      arguments: {
        applicant_name: 'Bhaben Bora',
        dob: '14/02/1968', // 58 years old
        gender: 'Male',
        marital_status: 'Married',
        village: 'Borgaon Bazar',
        block: 'Borgaon',
        bank_account: '998877665544',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
      },
    });

    const data = getJsonContent(res);
    expect(data.valid).toBe(false);
    expect(data.eligible_by_age).toBe(false);
    expect(data.errors.some((e: string) => e.includes('at least 60 years of age'))).toBe(true);

    // Database verification: 0 records created
    const app = store.getApplicationByEmail('bhaben@example.com');
    expect(app).toBeUndefined();
  });

  /* -------------------------------------------------------------------------
   * Scenario 3: Tarali Chaliha (Age 64, Moranhat, Dibrugarh Rural) - Jurisdictional Boundary
   * ------------------------------------------------------------------------- */
  it('Scenario 3 [Tarali Chaliha]: Unsupported block outside Purvanchal is rejected; 0 records', async () => {
    const res = await citizenClient.callTool({
      name: 'validate_application_draft',
      arguments: {
        applicant_name: 'Tarali Chaliha',
        dob: '05/03/1962', // 64 years old
        gender: 'Female',
        marital_status: 'Widowed',
        husband_name: 'Late Husband',
        village: 'Moranhat',
        block: 'Dibrugarh Rural', // Not supported
        bank_account: '556677889900',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
      },
    });

    const data = getJsonContent(res);
    expect(data.valid).toBe(false);
    expect(data.supported_block).toBe(false);
    expect(data.errors.some((e: string) => e.includes('supported Block'))).toBe(true);
  });

  /* -------------------------------------------------------------------------
   * Scenario 4: Bipul Kalita (Age 66, Khelua Gaon, Khelua) - Missing Age Proof Document
   * ------------------------------------------------------------------------- */
  it('Scenario 4 [Bipul Kalita]: Missing age proof document is rejected; 0 records created', async () => {
    const res = await citizenClient.callTool({
      name: 'validate_application_draft',
      arguments: {
        applicant_name: 'Bipul Kalita',
        dob: '12/11/1960', // 66 years old
        gender: 'Male',
        marital_status: 'Married',
        village: 'Khelua Gaon',
        block: 'Khelua',
        bank_account: '334455667788',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
        // Omit doc_name and doc_size
      },
    });

    const data = getJsonContent(res);
    expect(data.valid).toBe(false);
    expect(data.errors.some((e: string) => e.includes('Age proof document is required'))).toBe(true);
  });

  /* -------------------------------------------------------------------------
   * Scenario 5: Kamala Devi (Duplicate Attempt) - Data Integrity & Constraints
   * ------------------------------------------------------------------------- */
  it('Scenario 5 [Kamala Devi Duplicate]: Exactly 1 active application; second submission blocked', async () => {
    const email = 'kamala.dup@example.com';
    const mobile = '9854099887';

    // Submit first application
    const res1 = store.createApplication(email, {
      applicant_name: 'Kamala Devi',
      dob: '10/05/1958',
      gender: 'Female',
      marital_status: 'Widowed',
      husband_name: 'Late Bhupen',
      village: 'Disangmukh',
      block: 'Sonari',
      bank_account: '203948576102',
      ifsc: 'SBIN0001234',
      mobile: mobile,
      doc_name: 'voter_card.pdf',
      doc_size: 200000,
    });
    expect(res1.success).toBe(true);

    // Attempt second submission with same email
    const res2 = store.createApplication(email, {
      applicant_name: 'Kamala Devi',
      dob: '10/05/1958',
      gender: 'Female',
      marital_status: 'Widowed',
      husband_name: 'Late Bhupen',
      village: 'Disangmukh',
      block: 'Sonari',
      bank_account: '203948576102',
      ifsc: 'SBIN0001234',
      mobile: mobile,
      doc_name: 'voter_card.pdf',
      doc_size: 200000,
    });

    expect(res2.success).toBe(false);
    expect(res2.error).toContain('Duplicate applications are not permitted');

    // Exactly 1 active application in database
    const matching = store.getApplications().filter(a => a.email === email);
    expect(matching.length).toBe(1);
  });

  /* -------------------------------------------------------------------------
   * Scenario 6: Unauthorized Citizen (Ramen Gogoi) - Authorization & Privacy
   * ------------------------------------------------------------------------- */
  it('Scenario 6 [Ramen Gogoi]: Citizen B cannot inspect Citizen A application (found=false)', async () => {
    // Citizen A: Ramesh Chandra Das (email: ramesh.das@example.com, DOB: 12/04/1955)
    // Citizen B: Ramen Gogoi (email: ramen@example.com, DOB: 01/01/1964)
    const res = await citizenClient.callTool({
      name: 'get_my_application_status',
      arguments: {
        email: 'ramesh.das@example.com', // Ramesh's email
        password_dob: '01011964', // Ramen's DOB (invalid password for Ramesh)
      },
    });

    expect(res.isError).toBe(true);
    const data = getJsonContent(res);
    expect(data.error_code).toBe('AUTHENTICATION_REQUIRED');
  });

  /* -------------------------------------------------------------------------
   * Scenario 7: Malicious / Misconfigured Citizen Assistant - Access Control (RBAC)
   * ------------------------------------------------------------------------- */
  it('Scenario 7 [Malicious Citizen]: Citizen assistant has no officer tools; DB status remains PENDING', async () => {
    const citizenTools = await citizenClient.listTools();
    const toolNames = citizenTools.tools.map(t => t.name);

    // The citizen MCP server MUST NOT have record_officer_decision
    expect(toolNames).not.toContain('record_officer_decision');
    expect(toolNames).not.toContain('get_officer_queue');

    // Direct store attempt without officer session is rejected
    const sonariPending = store.getApplications().find(a => a.block === 'Sonari' && a.status === 'PENDING')!;
    const directRes = store.approveApplication(sonariPending.id, 'attacker', false); // isOfficerSession = false
    expect(directRes.success).toBe(false);
    expect(directRes.error).toContain('Forbidden');
    expect(store.getApplicationById(sonariPending.id)?.status).toBe('PENDING');
  });

  /* -------------------------------------------------------------------------
   * Scenario 8: Block Development Officer (Sonari) - Officer Decision & Audit (Approval)
   * ------------------------------------------------------------------------- */
  it('Scenario 8 [BDO Sonari Approval]: Review and approve application -> APPROVED with audit entry', async () => {
    const sonariPending = store.getApplications().find(a => a.block === 'Sonari' && a.status === 'PENDING')!;

    const res = await sonariOfficerClient.callTool({
      name: 'record_officer_decision',
      arguments: {
        application_id: sonariPending.id,
        decision: 'APPROVE',
        remarks: 'Physical age proof verified by Panchayat Secretary',
        confirm_explicit: true,
      },
    });

    expect(res.isError).toBeFalsy();
    const data = getJsonContent(res);
    expect(data.status).toBe('confirmed');
    expect(data.new_status).toBe('APPROVED');
    expect(data.decided_by).toBe('bdo_sonari');
    expect(data.audit_record.action).toBe('APPROVED');
    expect(data.audit_record.actor).toBe('bdo_sonari');

    const appInDb = store.getApplicationById(sonariPending.id)!;
    expect(appInDb.status).toBe('APPROVED');
    expect(appInDb.decided_by).toBe('bdo_sonari');
  });

  /* -------------------------------------------------------------------------
   * Scenario 9: Block Development Officer (Rajapara) - Officer Decision & Audit (Rejection)
   * ------------------------------------------------------------------------- */
  it('Scenario 9 [BDO Rajapara Rejection]: Reject application with reason -> REJECTED with recorded reason', async () => {
    const rajaparaPending = store.getApplications().find(a => a.block === 'Rajapara' && a.status === 'PENDING')!;

    const reason = 'Document illegible and unverified by Gaonburah';
    const res = await rajaparaOfficerClient.callTool({
      name: 'record_officer_decision',
      arguments: {
        application_id: rajaparaPending.id,
        decision: 'REJECT',
        remarks: reason,
        confirm_explicit: true,
      },
    });

    expect(res.isError).toBeFalsy();
    const data = getJsonContent(res);
    expect(data.new_status).toBe('REJECTED');
    expect(data.decision_reason).toBe(reason);
    expect(data.decided_by).toBe('bdo_rajapara');

    const appInDb = store.getApplicationById(rajaparaPending.id)!;
    expect(appInDb.status).toBe('REJECTED');
    expect(appInDb.decision_reason).toBe(reason);
    expect(appInDb.audit_trail?.some(e => e.action === 'REJECTED' && e.reason === reason)).toBe(true);
  });

  /* -------------------------------------------------------------------------
   * Scenario 10: Moniram Saikia (SLA Breach Case) - Statutory SLA Enforcement
   * ------------------------------------------------------------------------- */
  it('Scenario 10 [Moniram Saikia SLA]: 19d overdue -> DEEMED_APPROVED (RTPS-AUTO); 10d -> PENDING; 20d rejected -> REJECTED', () => {
    // 1. Create 19-day overdue case (Moniram Saikia)
    const email1 = 'moniram@example.com';
    store.createApplication(email1, {
      applicant_name: 'Moniram Saikia',
      dob: '01/01/1953',
      gender: 'Male',
      marital_status: 'Married',
      village: 'Silapathar',
      block: 'Dhemaji Pathar',
      bank_account: '887766554433',
      ifsc: 'SBIN0001234',
      mobile: '9854088771',
      doc_name: 'age_proof_moniram.pdf',
      doc_size: 150000,
    });
    const overdueApp = store.getApplicationByEmail(email1)!;
    // Set submitted_at to 19 days ago
    overdueApp.submitted_at = new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString();

    // 2. Create 10-day pending case
    const email2 = 'recent@example.com';
    store.createApplication(email2, {
      applicant_name: 'Recent Applicant',
      dob: '01/01/1955',
      gender: 'Female',
      marital_status: 'Married',
      village: 'Namti Chariali',
      block: 'Namti',
      bank_account: '776655443322',
      ifsc: 'SBIN0001234',
      mobile: '9854088772',
      doc_name: 'age_proof.pdf',
      doc_size: 150000,
    });
    const recentApp = store.getApplicationByEmail(email2)!;
    recentApp.submitted_at = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    // 3. Existing 20-day rejected case
    const rejectedApp = store.getApplications().find(a => a.status === 'REJECTED')!;

    // Run RTPS Deemed Approval Job
    const result = store.runDeemedApproval();
    expect(result.count).toBeGreaterThanOrEqual(1);

    // Verify 19-day case transitioned to DEEMED_APPROVED with RTPS-AUTO
    const overdueAfter = store.getApplicationById(overdueApp.id)!;
    expect(overdueAfter.status).toBe('DEEMED_APPROVED');
    expect(overdueAfter.decided_by).toBe('RTPS-AUTO');

    // Verify 10-day case remains PENDING
    const recentAfter = store.getApplicationById(recentApp.id)!;
    expect(recentAfter.status).toBe('PENDING');

    // Verify prior REJECTED decision preserved
    const rejectedAfter = store.getApplicationById(rejectedApp.id)!;
    expect(rejectedAfter.status).toBe('REJECTED');
  });
});
