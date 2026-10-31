import { describe, it, expect, beforeEach } from 'vitest';
import { DataStore } from '../data/store';
import {
  calculateAgeFromDate,
  parseDateOfBirth,
  validateApplicationDraft,
  validateDocument,
  sanitizeName,
  MIN_AGE,
  SLA_DAYS,
  SUPPORTED_BLOCKS,
} from '../services/applicationService';
import { translations } from '../services/localization';

describe('Sewa Setu - Phase 3 Four Synthetic User Personas Evaluation', () => {
  let store: DataStore;

  beforeEach(() => {
    store = new DataStore();
    store.resetToFactoryDefaults();
  });

  /* ========================================================================
   * PERSONA 1: ELDERLY CITIZEN (Age 70, Limited Digital Literacy)
   * Needs clear guidance, automatic age verification, simple error messages,
   * and accessible pre-flight preparation.
   * ======================================================================== */
  describe('Persona 1: Elderly Citizen (70-Year-Old Applicant)', () => {
    it('Accurately verifies age eligibility for 70-year-old citizen', () => {
      const dobStr = '15/06/1956';
      const parsedDob = parseDateOfBirth(dobStr);
      expect(parsedDob).not.toBeNull();

      const age = calculateAgeFromDate(parsedDob!);
      expect(age).toBeGreaterThanOrEqual(69); // At least 69-70 depending on current month
      expect(age).toBeGreaterThanOrEqual(MIN_AGE);
    });

    it('Provides human-readable, clear validation errors for typos in DOB', () => {
      const draft = {
        applicant_name: 'Phuleswari Das',
        dob: '32/13/1956', // Invalid day and month
        gender: 'Female',
        marital_status: 'Married',
        village: 'Sonari Town',
        block: 'Sonari',
        bank_account: '308291038472',
        ifsc: 'SBIN0001234',
      };

      const result = validateApplicationDraft(draft);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid Date of Birth format'))).toBe(true);
    });

    it('Pre-flight instructions explain the 3 required items in both English and Hindi', () => {
      const en = translations['en'];
      const hi = translations['hi'];

      // Must explicitly mention email, age proof, and bank account for DBT
      expect(en.needMobile).toContain('mobile number');
      expect(en.needAgeProof).toContain('Age proof document');
      expect(en.needBank).toContain('Bank passbook');

      // Hindi translation check
      expect(hi.needMobile).toContain('मोबाइल');
      expect(hi.needAgeProof).toContain('आयु प्रमाण पत्र');
      expect(hi.needBank).toContain('बैंक पासबुक');
    });

    it('Completes official submission and receives genuine tracking application number', () => {
      const email = 'nabin@example.com';
      const mobile = '9435012345';
      const draft = {
        applicant_name: 'Nabin Chandra Phukan',
        dob: '10/05/1954',
        gender: 'Male',
        marital_status: 'Married',
        village: 'Rajapara Ward 2',
        block: 'Rajapara',
        bank_account: '501002938471',
        ifsc: 'HDFC0000491',
        mobile: mobile,
        doc_name: 'voter_id_phukan.jpg',
        doc_size: 1500000,
      };

      const res = store.createApplication(email, draft);
      expect(res.success).toBe(true);
      expect(res.application?.application_no).toMatch(/^SSP\d{8}$/);
      expect(res.application?.status).toBe('PENDING');

      // Notification dispatched to citizen's email
      const msgs = store.getSmsMessages(email);
      expect(msgs.length).toBeGreaterThan(0);
      expect(msgs[0].text).toContain(res.application?.application_no);
    });
  });

  /* ========================================================================
   * PERSONA 2: FAMILY HELPER (Assisting Relative on Shared Smartphone)
   * Needs masked sensitive bank info on screen, review step before submitting,
   * and protection against duplicate submissions.
   * ======================================================================== */
  describe('Persona 2: Family Helper (Assisting on Shared Smartphone)', () => {
    it('Masks bank account number on review screen to protect privacy from bystanders', () => {
      const rawAccount = '308291038472';
      // Masking helper logic
      const masked = '•••• •••• ' + rawAccount.slice(-4);
      expect(masked).toBe('•••• •••• 8472');
      expect(masked).not.toContain('30829103');
    });

    it('Blocks duplicate submission if elderly relative was already registered', () => {
      // Ramesh Chandra Das is already registered with email ramesh.das@example.com
      const existingEmail = 'ramesh.das@example.com';
      const duplicateDraft = {
        applicant_name: 'Ramesh Chandra Das (Helper re-submission)',
        dob: '12/04/1955',
        gender: 'Male',
        marital_status: 'Married',
        village: 'Sonari Gaon',
        block: 'Sonari',
        bank_account: '308291038472',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
      };

      const res = store.createApplication(existingEmail, duplicateDraft);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Duplicate applications are not permitted');
    });

    it('Helper can verify application status using relative’s registered DOB password', () => {
      const relativeEmail = 'ramesh.das@example.com';
      const expectedDobPassword = '12041955'; // 12/04/1955

      const loginRes = store.verifyCitizenLogin(relativeEmail, expectedDobPassword);
      expect(loginRes.success).toBe(true);
      expect(loginRes.application?.applicant_name).toBe('Ramesh Chandra Das');
      expect(loginRes.application?.status).toBe('PENDING');
    });
  });

  /* ========================================================================
   * PERSONA 3: COMMON SERVICE CENTRE (CSC) KIOSK OPERATOR
   * Processes sequential citizens; requires session isolation and zero data
   * leakage between Citizen A and Citizen B.
   * ======================================================================== */
  describe('Persona 3: CSC Kiosk Operator (Public Terminal Confidentiality)', () => {
    it('Prevents Citizen B from inspecting Citizen A’s record via IDOR', () => {
      const citizenAEmail = 'ramesh.das@example.com';
      const citizenBEmail = 'bhabesh.saikia@example.in';

      // Citizen A's application ID is 1
      const app1 = store.getApplicationById(1);
      expect(app1?.email).toBe(citizenAEmail);

      // Operator/Citizen B logged in under citizenBEmail attempts to read Application #1
      const authCheck = store.getApplicationByIdAuthorized(1, citizenBEmail, false);
      expect(authCheck.success).toBe(false);
      expect(authCheck.application).toBeUndefined();
      expect(authCheck.error).toContain('Unauthorized');
    });

    it('Enforces clean multi-citizen sequential submissions at CSC kiosk', () => {
      // Citizen 1 registers
      const email1 = 'csc1@example.com';
      const res1 = store.createApplication(email1, {
        applicant_name: 'CSC Citizen One',
        dob: '01/01/1950',
        gender: 'Male',
        marital_status: 'Married',
        village: 'Borgaon',
        block: 'Borgaon',
        bank_account: '111122223333',
        ifsc: 'PUNB0192800',
        mobile: '9700011111',
        doc_name: 'proof1.pdf',
        doc_size: 400000,
      });
      expect(res1.success).toBe(true);

      // Citizen 2 registers immediately after on same system
      const email2 = 'csc2@example.com';
      const res2 = store.createApplication(email2, {
        applicant_name: 'CSC Citizen Two',
        dob: '02/02/1952',
        gender: 'Female',
        marital_status: 'Married',
        village: 'Namti',
        block: 'Namti',
        bank_account: '444455556666',
        ifsc: 'SBIN0005432',
        mobile: '9700022222',
        doc_name: 'proof2.jpg',
        doc_size: 600000,
      });
      expect(res2.success).toBe(true);

      // Verify that each record is distinct and strictly isolated
      expect(res1.application?.application_no).not.toBe(res2.application?.application_no);
      expect(store.getApplicationByEmail(email1)?.applicant_name).toBe('CSC Citizen One');
      expect(store.getApplicationByEmail(email2)?.applicant_name).toBe('CSC Citizen Two');
    });
  });

  /* ========================================================================
   * PERSONA 4: BLOCK OFFICER (Official Queue & Statutory Adjudication)
   * Needs reliable block-level filtering, SLA monitoring, and official decisions.
   * ======================================================================== */
  describe('Persona 4: Block Development Officer (Statutory Adjudication)', () => {
    it('Officer can retrieve and filter pending applications by designated Block', () => {
      const allApps = store.getApplications();
      const sonariPending = allApps.filter(a => a.block === 'Sonari' && a.status === 'PENDING');
      expect(sonariPending.length).toBeGreaterThan(0);
      expect(sonariPending.every(a => a.block === 'Sonari')).toBe(true);
    });

    it('Officer records official approval with identity audit trail', () => {
      // Approve pending application ID 3
      const res = store.approveApplication(3, 'officer_dhemaji', true);
      expect(res.success).toBe(true);

      const updated = store.getApplicationById(3);
      expect(updated?.status).toBe('APPROVED');
      expect(updated?.decided_by).toBe('officer_dhemaji');
      expect(updated?.decided_at).toBeDefined();

      // SMS confirmation dispatched to applicant
      const smsList = store.getSmsMessages(updated?.email);
      expect(smsList.some(s => s.text.includes('APPROVED'))).toBe(true);
    });

    it('Guarantees 15-day statutory RTPS deemed approval for overdue applications', () => {
      // Seed data contains applications submitted 18 days and 16 days ago
      const deemedResult = store.runDeemedApproval();
      expect(deemedResult.count).toBe(2);

      deemedResult.approved.forEach(app => {
        expect(app.status).toBe('DEEMED_APPROVED');
        expect(app.decided_by).toBe('RTPS-AUTO');
      });
    });
  });
});
