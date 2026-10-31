import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createCitizenMcpServer } from '../mcp/citizenServer';
import { tokenManager } from '../mcp/tokenManager';
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

describe('Sewa Setu - Phase 4 Official Citizen MCP Server Test Suite', () => {
  let client: Client;
  let serverTransport: any;
  let clientTransport: any;

  beforeEach(async () => {
    store.resetToFactoryDefaults();
    tokenManager.clearAll();

    const server = createCitizenMcpServer();
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);

    client = new Client(
      { name: 'test-citizen-assistant', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(clientTransport);
  });

  afterEach(async () => {
    try {
      await client.close();
    } catch {
      // ignore
    }
  });

  /* ========================================================================
   * 1. TOOL DISCOVERY
   * ======================================================================== */
  it('Discovers all 8 official citizen tools with strict schemas', async () => {
    const res = await client.listTools();
    const toolNames = res.tools.map(t => t.name);

    expect(toolNames).toContain('get_scheme_information');
    expect(toolNames).toContain('get_supported_blocks');
    expect(toolNames).toContain('get_application_requirements');
    expect(toolNames).toContain('start_application');
    expect(toolNames).toContain('verify_email_otp');
    expect(toolNames).toContain('validate_application_draft');
    expect(toolNames).toContain('submit_application');
    expect(toolNames).toContain('get_my_application_status');
    expect(toolNames.length).toBeGreaterThanOrEqual(8);
  });

  /* ========================================================================
   * 2. STATUTORY SCHEME RULES & BLOCKS TOOLS
   * ======================================================================== */
  it('get_scheme_information returns authoritative rules from backend', async () => {
    const res = await client.callTool({
      name: 'get_scheme_information',
      arguments: {},
    });

    expect(res.isError).toBeFalsy();
    const data = getJsonContent(res);
    expect(data.monthly_pension_amount).toContain('250');
    expect(data.statutory_minimum_age).toBe(60);
    expect(data.statutory_sla_days).toBe(15);
    expect(data.deemed_approval).toContain('RTPS');
  });

  it('get_supported_blocks returns official 6 notified blocks', async () => {
    const res = await client.callTool({
      name: 'get_supported_blocks',
      arguments: {},
    });

    const data = getJsonContent(res);
    expect(data.supported_blocks).toEqual([
      'Sonari',
      'Rajapara',
      'Dhemaji Pathar',
      'Borgaon',
      'Namti',
      'Khelua',
    ]);
  });

  /* ========================================================================
   * 3. IDENTITY, OTP DISPATCH & VERIFICATION
   * ======================================================================== */
  it('start_application dispatches OTP without leaking OTP to LLM content', async () => {
    const email = 'test.citizen@example.com';
    const res = await client.callTool({
      name: 'start_application',
      arguments: { email },
    });

    expect(res.isError).toBeFalsy();
    const data = getJsonContent(res);
    expect(data.status).toBe('otp_sent');
    expect(data.session_id).toMatch(/^ses_/);
    expect(data.validity_seconds).toBe(300);

    // SECURITY: The response text must NEVER include the 6-digit OTP code!
    expect(data.otp).toBeUndefined();
    expect(getTextContent(res)).not.toMatch(/\b\d{6}\b/);
  });

  it('start_application rejects duplicate email addresses already in database', async () => {
    // Ramesh Chandra Das is already registered with email ramesh.das@example.com
    const res = await client.callTool({
      name: 'start_application',
      arguments: { email: 'ramesh.das@example.com' },
    });

    expect(res.isError).toBe(true);
    const data = getJsonContent(res);
    expect(data.error_code).toBe('DUPLICATE_APPLICATION');
  });

  it('verify_email_otp validates server-side and issues verification token', async () => {
    const email = 'verify.me@example.com';
    // 1. Start application
    const startRes = await client.callTool({
      name: 'start_application',
      arguments: { email },
    });
    const startData = getJsonContent(startRes);
    const sessionId = startData.session_id;

    // 2. Retrieve genuine OTP code from authoritative store
    const latestOtp = store.getLatestOtpForEmail(email);
    expect(latestOtp).toBeDefined();
    const correctCode = latestOtp!.code;

    // 3. Verify OTP
    const verifyRes = await client.callTool({
      name: 'verify_email_otp',
      arguments: {
        session_id: sessionId,
        email,
        otp_code: correctCode,
      },
    });

    expect(verifyRes.isError).toBeFalsy();
    const verifyData = getJsonContent(verifyRes);
    expect(verifyData.verified).toBe(true);
    expect(verifyData.verification_token).toMatch(/^tok_/);
  });

  it('verify_email_otp rejects incorrect OTP code', async () => {
    const email = 'wrong.otp@example.com';
    const startRes = await client.callTool({
      name: 'start_application',
      arguments: { email },
    });
    const sessionId = getJsonContent(startRes).session_id;

    const verifyRes = await client.callTool({
      name: 'verify_email_otp',
      arguments: {
        session_id: sessionId,
        email,
        otp_code: '000000', // wrong code
      },
    });

    expect(verifyRes.isError).toBe(true);
    const data = getJsonContent(verifyRes);
    expect(data.error_code).toBe('INVALID_OTP');
  });

  /* ========================================================================
   * 4. DRAFT VALIDATION TOOL
   * ======================================================================== */
  it('validate_application_draft rejects applicant younger than 60 years old', async () => {
    const res = await client.callTool({
      name: 'validate_application_draft',
      arguments: {
        applicant_name: 'Anup Bordoloi',
        dob: '01/01/1985', // 41 years old
        gender: 'Male',
        marital_status: 'Married',
        village: 'Sonari Block',
        block: 'Sonari',
        bank_account: '123456789012',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
      },
    });

    const data = getJsonContent(res);
    expect(data.valid).toBe(false);
    expect(data.eligible_by_age).toBe(false);
    expect(data.errors.some((e: string) => e.includes('at least 60 years of age'))).toBe(true);
  });

  it('validate_application_draft rejects unsupported blocks outside Purvanchal', async () => {
    const res = await client.callTool({
      name: 'validate_application_draft',
      arguments: {
        applicant_name: 'Elderly Citizen',
        dob: '01/01/1952',
        gender: 'Male',
        marital_status: 'Married',
        village: 'External Village',
        block: 'Unknown Block', // Invalid
        bank_account: '123456789012',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
      },
    });

    const data = getJsonContent(res);
    expect(data.valid).toBe(false);
    expect(data.supported_block).toBe(false);
    expect(data.errors.some((e: string) => e.includes('supported Block'))).toBe(true);
  });

  /* ========================================================================
   * 5. OFFICIAL SUBMISSION & SINGLE SYSTEM OF RECORD
   * ======================================================================== */
  it('submit_application creates real record visible immediately in portal', async () => {
    const email = 'pratima@example.com';
    const mobile = '9435555666';

    // 1. Start & Verify
    const startRes = await client.callTool({
      name: 'start_application',
      arguments: { email },
    });
    const sessionId = getJsonContent(startRes).session_id;
    const otp = store.getLatestOtpForEmail(email)!.code;

    const verifyRes = await client.callTool({
      name: 'verify_email_otp',
      arguments: { session_id: sessionId, email, otp_code: otp },
    });
    const token = getJsonContent(verifyRes).verification_token;

    // 2. Submit Application via MCP
    const submitRes = await client.callTool({
      name: 'submit_application',
      arguments: {
        verification_token: token,
        consent_agreed: true,
        draft: {
          applicant_name: 'Pratima Hazarika',
          dob: '14/02/1955',
          gender: 'Female',
          marital_status: 'Married',
          village: 'Namti Chariali',
          block: 'Namti',
          bank_account: '987654321098',
          ifsc: 'SBIN0005432',
          mobile: mobile,
          doc_name: 'voter_id_pratima.pdf',
          doc_size: 400000,
        },
      },
    });

    expect(submitRes.isError).toBeFalsy();
    const submitData = getJsonContent(submitRes);
    expect(submitData.confirmed).toBe(true);
    expect(submitData.application_no).toMatch(/^SSP\d{8}$/);
    expect(submitData.official_status).toBe('PENDING');

    // CRITICAL: Must exist in the official backend database/store immediately!
    const portalApp = store.getApplicationByEmail(email);
    expect(portalApp).toBeDefined();
    expect(portalApp?.application_no).toBe(submitData.application_no);
    expect(portalApp?.applicant_name).toBe('Pratima Hazarika');
    expect(portalApp?.block).toBe('Namti');
  });

  it('submit_application rejects unverified or fabricated tokens', async () => {
    const submitRes = await client.callTool({
      name: 'submit_application',
      arguments: {
        verification_token: 'tok_fabricated_fake_token_123',
        consent_agreed: true,
        draft: {
          applicant_name: 'Fake Applicant',
          dob: '01/01/1950',
          gender: 'Male',
          marital_status: 'Married',
          village: 'Sonari',
          block: 'Sonari',
          bank_account: '123456789012',
          ifsc: 'SBIN0001234',
          mobile: '9876543210',
          doc_name: 'proof.pdf',
          doc_size: 100000,
        },
      },
    });

    expect(submitRes.isError).toBe(true);
    const data = getJsonContent(submitRes);
    expect(data.error_code).toBe('UNAUTHORIZED');
  });

  /* ========================================================================
   * 6. APPLICATION STATUS & CROSS-CITIZEN PRIVACY PROTECTION
   * ======================================================================== */
  it('get_my_application_status retrieves website-created application using DOB password', async () => {
    // Ramesh Chandra Das (created in seed) has email ramesh.das@example.com, DOB 12/04/1955
    const res = await client.callTool({
      name: 'get_my_application_status',
      arguments: {
        email: 'ramesh.das@example.com',
        password_dob: '12041955', // DDMMYYYY password
      },
    });

    expect(res.isError).toBeFalsy();
    const data = getJsonContent(res);
    expect(data.status).toBe('found');
    expect(data.applicant_name).toBe('Ramesh Chandra Das');
    expect(data.official_status).toBe('PENDING');
    expect(data.bank_account_masked).toBe('•••• •••• 8472'); // Masked for confidentiality!
  });

  it('get_my_application_status rejects access without authentication credentials', async () => {
    const res = await client.callTool({
      name: 'get_my_application_status',
      arguments: {
        email: 'ramesh.das@example.com',
        // No password and no token provided
      },
    });

    expect(res.isError).toBe(true);
    const data = getJsonContent(res);
    expect(data.error_code).toBe('AUTHENTICATION_REQUIRED');
  });
});
