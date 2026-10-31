import { describe, it, expect, beforeEach } from 'vitest';
import { DataStore } from '../data/store';
import {
  sanitizeName,
  parseDateOfBirth,
  calculateAgeFromDate,
  validateDocument,
  validateApplicationDraft,
  SUPPORTED_BLOCKS,
  MIN_AGE,
  SLA_DAYS,
} from '../services/applicationService';

describe('Sewa Setu - Phase 2 Systematic Defect Regression Suite', () => {
  let store: DataStore;

  beforeEach(() => {
    // Fresh store instance for each test
    store = new DataStore();
    store.resetToFactoryDefaults();
  });

  /* ========================================================================
   * DEFECT 1: PRIVILEGE ESCALATION & AUTHORIZATION IN ADJUDICATION
   * Original Bug: app.py checked `if not session.get('logged_in')` instead of
   * `session.get('admin')`, allowing any citizen logged into status portal
   * to approve/reject any citizen's application!
   * ======================================================================== */
  describe('Defect 1: Privilege Escalation & Authorization Enforcement', () => {
    it('REGRESSION TEST: Rejects approval when requested by non-officer session', () => {
      // Find a pending application (ID #1)
      const app = store.getApplicationById(1);
      expect(app).toBeDefined();
      expect(app?.status).toBe('PENDING');

      // Attempt approval with isOfficerSession: false (simulating ordinary citizen session)
      const result = store.approveApplication(1, 'unauthorized_citizen', false);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');

      // Application status must remain PENDING
      const unchangedApp = store.getApplicationById(1);
      expect(unchangedApp?.status).toBe('PENDING');
      expect(unchangedApp?.decided_by).toBeUndefined();
    });

    it('REGRESSION TEST: Rejects rejection when requested by non-officer session', () => {
      const result = store.rejectApplication(1, 'unauthorized_citizen', false);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');

      const unchangedApp = store.getApplicationById(1);
      expect(unchangedApp?.status).toBe('PENDING');
    });

    it('PASS: Authorized officer can approve and records official audit trail', () => {
      const result = store.approveApplication(1, 'officer_sonari', true);
      expect(result.success).toBe(true);

      const approvedApp = store.getApplicationById(1);
      expect(approvedApp?.status).toBe('APPROVED');
      expect(approvedApp?.decided_by).toBe('officer_sonari');
      expect(approvedApp?.decided_at).toBeDefined();
    });

    it('PASS: Terminal state protection: Already decided application cannot be overwritten', () => {
      // Application #5 is already APPROVED in seed data
      const terminalApp = store.getApplicationById(5);
      expect(terminalApp?.status).toBe('APPROVED');

      // Attempting to reject an already approved application must fail
      const result = store.rejectApplication(5, 'officer_admin', true, 'Ineligible age criteria failure');
      expect(result.success).toBe(false);
      expect(result.error).toContain('already decided');

      // Must remain APPROVED
      expect(store.getApplicationById(5)?.status).toBe('APPROVED');
    });

    it('REGRESSION TEST: Rejection requires a meaningful statutory reason of at least 5 characters', () => {
      // Attempt rejection with short reason (< 5 chars)
      const shortRes = store.rejectApplication(1, 'officer_admin', true, 'Bad');
      expect(shortRes.success).toBe(false);
      expect(shortRes.error).toContain('minimum 5 characters');

      // Attempt rejection with missing reason
      const emptyRes = store.rejectApplication(1, 'officer_admin', true, '');
      expect(emptyRes.success).toBe(false);

      // Attempt rejection with valid meaningful reason
      const validRes = store.rejectApplication(1, 'officer_admin', true, 'Ineligible age: applicant is under 60 years based on verified birth certificate.');
      expect(validRes.success).toBe(true);

      const rejectedApp = store.getApplicationById(1);
      expect(rejectedApp?.status).toBe('REJECTED');
      expect(rejectedApp?.decision_reason).toContain('Ineligible age');
      expect(rejectedApp?.audit_trail?.some(a => a.action === 'REJECTED' && a.reason?.includes('Ineligible age'))).toBe(true);
    });
  });

  /* ========================================================================
   * DEFECT 2: INSECURE DIRECT OBJECT REFERENCE (IDOR) & CROSS-CITIZEN PRIVACY
   * Original Bug: In app.py /application/<id> and /ack/<id>.pdf, any logged-in
   * user could access any other citizen's details by changing the URL parameter.
   * ======================================================================== */
  describe('Defect 2: Insecure Direct Object Reference (IDOR) & Confidentiality', () => {
    it('REGRESSION TEST: Citizen A cannot view Citizen B’s application record', () => {
      // Citizen A has email ramesh.das@example.com (Application #1)
      // Citizen B has email bhabesh.saikia@example.in (Application #2)
      const citizenAEmail = 'ramesh.das@example.com';
      const citizenBAppId = 2;

      const accessResult = store.getApplicationByIdAuthorized(
        citizenBAppId,
        citizenAEmail,
        false // not an officer
      );

      expect(accessResult.success).toBe(false);
      expect(accessResult.application).toBeUndefined();
      expect(accessResult.error).toContain('Unauthorized');
    });

    it('PASS: Citizen can access their own registered application', () => {
      const citizenAEmail = 'ramesh.das@example.com';
      const citizenAAppId = 1;

      const accessResult = store.getApplicationByIdAuthorized(
        citizenAAppId,
        citizenAEmail,
        false
      );

      expect(accessResult.success).toBe(true);
      expect(accessResult.application).toBeDefined();
      expect(accessResult.application?.email).toBe(citizenAEmail);
    });

    it('PASS: Authorized officer can inspect any application for official adjudication', () => {
      const accessResult = store.getApplicationByIdAuthorized(
        2,
        undefined,
        true // isOfficer
      );

      expect(accessResult.success).toBe(true);
      expect(accessResult.application?.id).toBe(2);
    });
  });

  /* ========================================================================
   * DEFECT 3: INPUT SANITIZATION & INDIAN-LANGUAGE UNICODE PRESERVATION
   * Original Bug: `sanitize(value, maxlen=20)` sliced raw UTF-8 bytes:
   * `value.encode("utf-8")[:20].decode("utf-8", errors="ignore")`.
   * Multi-byte Indian characters (3 bytes each) were sliced mid-character
   * and discarded, mangling Hindi, Assamese, and Bengali names.
   * ======================================================================== */
  describe('Defect 3: Indian-Language Support & Unicode Integrity', () => {
    it('REGRESSION TEST: Preserves full Devanagari Hindi names without byte truncation', () => {
      const hindiName = 'रामेश्वर प्रसाद शर्मा'; // 21 characters, 61 UTF-8 bytes!
      // In original code, slicing at 20 bytes reduced this to only 6 characters: "रामेश्"
      const sanitized = sanitizeName(hindiName);

      expect(sanitized).toBe('रामेश्वर प्रसाद शर्मा');
      expect(sanitized.length).toBe(hindiName.length);
    });

    it('REGRESSION TEST: Preserves full Assamese/Bengali names faithfully', () => {
      const assameseName = 'ভবেশ শইকীয়া'; // 12 characters, 36 UTF-8 bytes
      const sanitized = sanitizeName(assameseName);

      expect(sanitized).toBe('ভবেশ শইকীয়া');
    });

    it('PASS: Application submission faithfully persists and retrieves Indian names', () => {
      const email = 'hindi.test@example.com';
      const hindiApplicant = 'सुमित्रा देवी';

      const res = store.createApplication(email, {
        applicant_name: hindiApplicant,
        dob: '01/01/1955',
        gender: 'Female',
        marital_status: 'Married',
        village: 'Sonari Block Ward 4',
        block: 'Sonari',
        bank_account: '394857201948',
        ifsc: 'SBIN0001234',
        mobile: '9811122233',
        doc_name: 'voter_id.pdf',
        doc_size: 200000,
      });

      expect(res.success).toBe(true);
      expect(res.application?.applicant_name).toBe('सुमित्रा देवी');

      // Verify retrieval
      const fetched = store.getApplicationByEmail(email);
      expect(fetched?.applicant_name).toBe('सुमित्रा देवी');
    });
  });

  /* ========================================================================
   * DEFECT 4: DOCUMENT UPLOAD 5MB & JPG/PDF SUPPORT (ERR_VAL_47 FIX)
   * Original Bug: upload.html told citizens "JPG or PDF, maximum size 5 MB",
   * but app.py line 221 strictly required `.endswith('.pdf')` and `len <= 102400`
   * (100 KB) and returned a cryptic "ERR_VAL_47"!
   * ======================================================================== */
  describe('Defect 4: Document Upload Restrictions & User-Friendly Errors', () => {
    it('REGRESSION TEST: Accepts 1.5 MB JPG photo of Voter ID (previously failed ERR_VAL_47)', () => {
      const fileName = 'voter_id_photo.jpg';
      const fileSize = 1.5 * 1024 * 1024; // 1.5 MB

      const validation = validateDocument(fileName, fileSize);
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('REGRESSION TEST: Accepts 4 MB PDF age proof document (previously failed ERR_VAL_47)', () => {
      const fileName = 'birth_certificate.pdf';
      const fileSize = 4 * 1024 * 1024; // 4 MB

      const validation = validateDocument(fileName, fileSize);
      expect(validation.valid).toBe(true);
    });

    it('PASS: Rejects files exceeding the configured 5 MB statutory limit with clear explanation', () => {
      const fileName = 'scanned_records.pdf';
      const fileSize = 6 * 1024 * 1024; // 6 MB

      const validation = validateDocument(fileName, fileSize);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('exceeds the 5 MB limit');
      expect(validation.error).not.toBe('ERR_VAL_47');
    });

    it('PASS: Rejects executable and unsupported file types with clear feedback', () => {
      const fileName = 'document.exe';
      const fileSize = 50000;

      const validation = validateDocument(fileName, fileSize);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('Accepted formats are JPG, JPEG, PNG, or PDF');
    });
  });

  /* ========================================================================
   * DEFECT 5: UNFAIR WIDOWED EMPLOYER REQUIREMENT BLOCKING SENIOR WIDOWS
   * Original Bug: app.py line 267 required both husband_name AND husband_employer
   * for widowed applicants. Senior citizens whose spouses had passed away long
   * ago could not provide a "current employer" and were blocked.
   * ======================================================================== */
  describe('Defect 5: Widowed Applicant Rules & Non-Blocking Employer Field', () => {
    it('REGRESSION TEST: Widowed applicant with deceased husband name is accepted without employer', () => {
      const draft = {
        applicant_name: 'Parbati Bora',
        dob: '12/03/1954',
        gender: 'Female',
        marital_status: 'Widowed',
        husband_name: 'Late Jogen Bora',
        husband_employer: '', // Deceased husband has no employer!
        village: 'Namti Gaon',
        block: 'Namti',
        bank_account: '918273645019',
        ifsc: 'SBIN0005432',
        mobile: '9876543210',
        doc_name: 'voter_id_parbati.pdf',
        doc_size: 150000,
      };

      const result = validateApplicationDraft(draft);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('PASS: Widowed applicant missing husband name receives clear requirement message', () => {
      const draft = {
        applicant_name: 'Parbati Bora',
        dob: '12/03/1954',
        gender: 'Female',
        marital_status: 'Widowed',
        husband_name: '', // Missing
        village: 'Namti Gaon',
        block: 'Namti',
        bank_account: '918273645019',
        ifsc: 'SBIN0005432',
      };

      const result = validateApplicationDraft(draft);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("Deceased Husband's Name"))).toBe(true);
    });
  });

  /* ========================================================================
   * DEFECT 6: RTPS 15-DAY DEEMED APPROVAL AUTOMATION & IDEMPOTENCY
   * Original Bug: deemed_approval.py crashed due to reading wrong settings.ini,
   * lacked atomic safeguards, and risked double-processing.
   * ======================================================================== */
  describe('Defect 6: RTPS 15-Day Statutory Deemed Approval Execution', () => {
    it('REGRESSION TEST: Automatically approves applications pending beyond 15 days', () => {
      // In seed data:
      // App #1 is submitted 18 days ago (PENDING) -> OVERDUE
      // App #2 is submitted 16 days ago (PENDING) -> OVERDUE
      // App #3 is submitted 4 days ago (PENDING) -> Within SLA
      // App #4 is submitted 2 days ago (PENDING) -> Within SLA

      const result = store.runDeemedApproval();
      expect(result.count).toBe(2);
      expect(result.approved.map(a => a.id)).toEqual(expect.arrayContaining([1, 2]));

      // Verify status change and audit record
      const app1 = store.getApplicationById(1);
      expect(app1?.status).toBe('DEEMED_APPROVED');
      expect(app1?.decided_by).toBe('RTPS-AUTO');
      expect(app1?.decided_at).toBeDefined();

      // Recent pending applications must remain PENDING
      const app3 = store.getApplicationById(3);
      expect(app3?.status).toBe('PENDING');
      expect(app3?.decided_by).toBeUndefined();
    });

    it('PASS: Deemed approval job is completely idempotent and safe on repeat runs', () => {
      // First run: processes overdue apps
      const firstRun = store.runDeemedApproval();
      expect(firstRun.count).toBe(2);

      // Second run immediately after: must process 0 applications
      const secondRun = store.runDeemedApproval();
      expect(secondRun.count).toBe(0);
      expect(secondRun.approved.length).toBe(0);
    });

    it('PASS: Rejected and Approved applications are NEVER overwritten by deemed approval', () => {
      // App #7 in seed is REJECTED
      const beforeApp7 = store.getApplicationById(7);
      expect(beforeApp7?.status).toBe('REJECTED');

      store.runDeemedApproval();

      const afterApp7 = store.getApplicationById(7);
      expect(afterApp7?.status).toBe('REJECTED');
      expect(afterApp7?.decided_by).toBe('officer_rajapara');
    });
  });

  /* ========================================================================
   * DEFECT 7: OTP RATE LIMITING, EXPIRY & LOCKOUT SECURITY
   * ======================================================================== */
  describe('Defect 7: OTP Verification & Rate Limiting', () => {
    it('REGRESSION TEST: Enforces maximum attempts lockout on incorrect OTP guesses', () => {
      const email = 'otp.test@example.com';
      const gen = store.generateOtp(email);
      expect(gen.success).toBe(true);

      // Attempt 5 wrong codes
      for (let i = 0; i < 5; i++) {
        const verifyRes = store.verifyOtp(email, '000000');
        expect(verifyRes.success).toBe(false);
      }

      // 6th attempt must be locked out
      const lockedRes = store.verifyOtp(email, gen.code!);
      expect(lockedRes.success).toBe(false);
      expect(lockedRes.error).toBeDefined();
    });

    it('PASS: Valid OTP within 5 minutes succeeds', () => {
      const email = 'valid.otp@example.com';
      const gen = store.generateOtp(email);
      expect(gen.success).toBe(true);
      expect(gen.code).toBeDefined();

      const verifyRes = store.verifyOtp(email, gen.code!);
      expect(verifyRes.success).toBe(true);
    });
  });

  /* ========================================================================
   * CITIZEN JOURNEYS & STATUTORY SCHEME RULES
   * ======================================================================== */
  describe('Statutory Scheme Rules & Eligibility Validation', () => {
    it('PASS: Rejects applicant younger than 60 years of age', () => {
      // Born in 1980 (46 years old)
      const draft = {
        applicant_name: 'Young Citizen',
        dob: '01/01/1980',
        gender: 'Male',
        marital_status: 'Married',
        village: 'Sonari Town',
        block: 'Sonari',
        bank_account: '123456789012',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
      };

      const result = validateApplicationDraft(draft);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least 60 years of age'))).toBe(true);
    });

    it('PASS: Rejects unsupported block outside Purvanchal jurisdiction', () => {
      const draft = {
        applicant_name: 'Senior Citizen',
        dob: '01/01/1950',
        gender: 'Male',
        marital_status: 'Married',
        village: 'Outside Village',
        block: 'Dispur Block', // NOT in SUPPORTED_BLOCKS!
        bank_account: '123456789012',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
      };

      const result = validateApplicationDraft(draft);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('supported Block'))).toBe(true);
    });

    it('PASS: Prevents duplicate applications for the same email address', () => {
      const existingEmail = 'ramesh.das@example.com'; // Already belongs to Ramesh Chandra Das

      const res = store.createApplication(existingEmail, {
        applicant_name: 'Duplicate Attempt',
        dob: '01/01/1950',
        gender: 'Male',
        marital_status: 'Married',
        village: 'Sonari Town',
        block: 'Sonari',
        bank_account: '123456789012',
        ifsc: 'SBIN0001234',
        mobile: '9876543210',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Duplicate applications are not permitted');
    });
  });

  /* ========================================================================
   * DEFECT 8: DOCUMENT VIEWER CANVAS & PROOF PREVIEW
   * Ensures documents (PDFs, images, generated official archive records)
   * provide explicit intrinsic dimensions and convert base64 data to Blobs.
   * ======================================================================== */
  describe('Defect 8: Document Viewer Canvas & Age Proof Preview', () => {
    it('REGRESSION TEST: Generated SVG has explicit pixel dimensions to prevent 0x0 canvas collapse', async () => {
      const { generateGovernmentProofDocumentSvg, isPdfDocument } = await import('../utils/documentViewerHelper');
      const svgUri = generateGovernmentProofDocumentSvg({
        applicantName: 'रामेश्वर प्रसाद शर्मा',
        applicationNo: 'SSP26901823',
        docName: 'school_leaving.pdf',
        dob: '15/08/1952',
        block: 'Sonari',
        village: 'Sonari Town',
      });

      expect(svgUri).toContain('data:image/svg+xml');
      // Root SVG MUST have explicit pixel width and height so browser img tags don't collapse
      expect(svgUri).toContain('width%3D%22800%22');
      expect(svgUri).toContain('height%3D%221050%22');
      expect(isPdfDocument('school_leaving.pdf')).toBe(true);
    });

    it('REGRESSION TEST: Converts base64 PDF data URIs into native Blobs for safe browser embedding', async () => {
      const { dataUriToBlob } = await import('../utils/documentViewerHelper');
      const dummyPdfDataUri = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==';
      const blob = dataUriToBlob(dummyPdfDataUri);

      expect(blob).not.toBeNull();
      expect(blob?.type).toBe('application/pdf');
      expect(blob?.size).toBeGreaterThan(0);
    });
  });
});

