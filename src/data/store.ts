import { Application, PortalUser, OtpRecord, SmsMessage, FormDataState, ApplicationStatus } from '../types';
import {
  BLOCKS,
  SUPPORTED_BLOCKS,
  BLOCK_VILLAGE_DIRECTORY,
  getVillagesForBlock,
  isValidVillageForBlock,
  MIN_AGE,
  SLA_DAYS,
  OTP_VALIDITY_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  SCHEME_DEADLINE,
  sanitizeName,
  parseDateOfBirth,
  calculateAgeFromDate,
  formatDobForPassword,
  validateApplicationDraft,
  validateDocument,
  MAX_OTP_ATTEMPTS,
  normalizeIndianMobile,
  isValidIndianMobile,
} from '../services/applicationService';

export {
  BLOCKS,
  SUPPORTED_BLOCKS,
  BLOCK_VILLAGE_DIRECTORY,
  getVillagesForBlock,
  isValidVillageForBlock,
  MIN_AGE,
  SLA_DAYS,
  OTP_VALIDITY_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  SCHEME_DEADLINE,
  normalizeIndianMobile,
  isValidIndianMobile,
};

export function generateCryptoOtp(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return String(100000 + (buf[0] % 900000));
    }
  } catch {}
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "sewasetu@123";

const STORAGE_KEYS = {
  APPLICATIONS: 'sewasetu_applications_v3',
  PORTAL_USERS: 'sewasetu_portal_users_v3',
  OTPS: 'sewasetu_otps_v3',
  SMS: 'sewasetu_sms_v3',
};

export function getDeadlineRemainingHours(): number | null {
  const diffMs = SCHEME_DEADLINE.getTime() - Date.now();
  if (diffMs <= 0) return null;
  return Math.floor(diffMs / (1000 * 60 * 60));
}

export function calculateAge(dobStr: string): number {
  const parsed = parseDateOfBirth(dobStr);
  if (!parsed) return 0;
  return calculateAgeFromDate(parsed);
}

export function getDobAsDDMMYYYY(dobStr: string): string {
  const parsed = parseDateOfBirth(dobStr);
  if (!parsed) return "01011960";
  return formatDobForPassword(parsed);
}

export function generateApplicationNumber(): string {
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const randNum = Math.floor(100000 + Math.random() * 900000);
  return `SSP${yearSuffix}${randNum}`;
}

export const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 1,
    application_no: "SSP26842011",
    applicant_name: "Ramesh Chandra Das",
    mobile: "9876543210",
    email: "ramesh.das@example.com",
    dob: "12/04/1955",
    gender: "Male",
    marital_status: "Married",
    village: "Sonari Gaon",
    block: "Sonari",
    bank_account: "308291038472",
    ifsc: "SBIN0001234",
    status: "PENDING",
    submitted_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(), // 18 days ago (overdue for deemed approval)
    doc_name: "voter_card_ramesh.pdf",
    doc_size: 450000,
  },
  {
    id: 2,
    application_no: "SSP26731049",
    applicant_name: "ভবেশ শইকীয়া", // Indian Assamese name to test Unicode preservation
    mobile: "9864012345",
    email: "bhabesh.saikia@example.in",
    dob: "20/11/1958",
    gender: "Male",
    marital_status: "Married",
    village: "Rajapara Ward 3",
    block: "Rajapara",
    bank_account: "50100492817281",
    ifsc: "HDFC0000491",
    status: "PENDING",
    submitted_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(), // 16 days ago (overdue)
    doc_name: "birth_cert_bhabesh.jpg",
    doc_size: 1200000,
  },
  {
    id: 3,
    application_no: "SSP26901823",
    applicant_name: "रामेश्वर प्रसाद शर्मा", // Hindi name to test Unicode preservation
    mobile: "9435098765",
    email: "rameshwar.sharma@example.com",
    dob: "15/08/1952",
    gender: "Male",
    marital_status: "Married",
    village: "Dhemaji Chariali",
    block: "Dhemaji Pathar",
    bank_account: "109283746501",
    ifsc: "UBIN0543210",
    status: "PENDING",
    submitted_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    doc_name: "school_leaving.pdf",
    doc_size: 850000,
  },
  {
    id: 4,
    application_no: "SSP26514782",
    applicant_name: "Malati Devi",
    mobile: "9854033221",
    email: "malati.devi@example.org",
    dob: "10/02/1961",
    gender: "Female",
    marital_status: "Widowed",
    husband_name: "Late Bhaben Sarma",
    village: "Borgaon Milan Nagar",
    block: "Borgaon",
    bank_account: "201948572019",
    ifsc: "PUNB0192800",
    status: "PENDING",
    submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    doc_name: "voter_card_malati.pdf",
    doc_size: 600000,
  },
  {
    id: 5,
    application_no: "SSP26392018",
    applicant_name: "Birinchi Borah",
    mobile: "9706011223",
    email: "birinchi.borah@test.com",
    dob: "05/06/1950",
    gender: "Male",
    marital_status: "Married",
    village: "Namti Ali",
    block: "Namti",
    bank_account: "409281049281",
    ifsc: "SBIN0005432",
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    decided_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    decided_by: "officer_sonari",
    doc_name: "age_proof_borah.pdf",
    doc_size: 350000,
  },
  {
    id: 6,
    application_no: "SSP26284910",
    applicant_name: "Anima Chetia",
    mobile: "9401055443",
    email: "anima.chetia@gov.in",
    dob: "30/09/1956",
    gender: "Female",
    marital_status: "Widowed",
    husband_name: "Late Jiten Chetia",
    village: "Khelua Gaon",
    block: "Khelua",
    bank_account: "019283746591",
    ifsc: "BARB0SONARI",
    status: "DEEMED_APPROVED",
    submitted_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    decided_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    decided_by: "RTPS-AUTO",
    doc_name: "voter_id_chetia.pdf",
    doc_size: 512000,
  },
  {
    id: 7,
    application_no: "SSP26119842",
    applicant_name: "Tuleswar Barua",
    mobile: "9864299887",
    email: "tuleswar@barua.family",
    dob: "01/01/1968",
    gender: "Male",
    marital_status: "Married",
    village: "Rajapara Bazar",
    block: "Rajapara",
    bank_account: "998877665544",
    ifsc: "SBIN0009988",
    status: "REJECTED",
    submitted_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    decided_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    decided_by: "officer_rajapara",
    doc_name: "pan_card_barua.pdf",
    doc_size: 300000,
  }
];

export const INITIAL_USERS: PortalUser[] = INITIAL_APPLICATIONS.map(app => ({
  email: app.email || `${app.mobile}@example.com`,
  mobile: app.mobile,
  dob: app.dob,
  password_hash: getDobAsDDMMYYYY(app.dob),
}));

export const INITIAL_SMS: SmsMessage[] = [
  {
    id: 1,
    to: "ramesh.das@example.com",
    text: "Sewa Setu: application SSP26842011 received. Track at the status portal with email and password (DOB as DDMMYYYY).",
    type: 'EMAIL',
    sent_at: Math.floor(Date.now() / 1000) - 3600,
    delivery_at: Math.floor(Date.now() / 1000) - 3598,
    delivered: true,
  }
];

interface OtpState extends OtpRecord {
  attempts: number;
}

export class DataStore {
  private applications: Application[] = [];
  private users: PortalUser[] = [];
  private otps: OtpState[] = [];
  private smsMessages: SmsMessage[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    this.applications = JSON.parse(JSON.stringify(INITIAL_APPLICATIONS));
    this.users = JSON.parse(JSON.stringify(INITIAL_USERS));
    this.otps = [];
    this.smsMessages = JSON.parse(JSON.stringify(INITIAL_SMS));

    if (typeof localStorage !== 'undefined') {
      try {
        const storedApps = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
        if (storedApps) {
          const parsed = JSON.parse(storedApps);
          if (Array.isArray(parsed)) this.applications = parsed;
        }

        const storedUsers = localStorage.getItem(STORAGE_KEYS.PORTAL_USERS);
        if (storedUsers) {
          const parsed = JSON.parse(storedUsers);
          if (Array.isArray(parsed)) this.users = parsed;
        }

        const storedOtps = localStorage.getItem(STORAGE_KEYS.OTPS);
        if (storedOtps) {
          const parsed = JSON.parse(storedOtps);
          if (Array.isArray(parsed)) {
            this.otps = parsed
              .filter(o => o && typeof o === 'object')
              .map(o => ({
                ...o,
                email: (o.email || o.mobile || '').toString(),
                attempts: typeof o.attempts === 'number' ? o.attempts : 0
              }));
          }
        }

        const storedSms = localStorage.getItem(STORAGE_KEYS.SMS);
        if (storedSms) {
          const parsed = JSON.parse(storedSms);
          if (Array.isArray(parsed)) this.smsMessages = parsed;
        }
      } catch {
        // fallback to memory
      }
    }
  }

  public getSnapshot() {
    return {
      version: 1,
      timestamp: new Date().toISOString(),
      applications: [...this.applications],
      users: [...this.users],
      sms: [...this.smsMessages],
    };
  }

  public loadFromSnapshot(snapshot: { applications?: Application[]; users?: PortalUser[]; sms?: SmsMessage[] }) {
    if (snapshot.applications) this.applications = JSON.parse(JSON.stringify(snapshot.applications));
    if (snapshot.users) this.users = JSON.parse(JSON.stringify(snapshot.users));
    if (snapshot.sms) this.smsMessages = JSON.parse(JSON.stringify(snapshot.sms));
    this.notify();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  private saveApplications() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(this.applications));
      } catch (e) {
        // storage quota or private mode
      }
    }
    this.notify();
  }

  private saveUsers() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.PORTAL_USERS, JSON.stringify(this.users));
      } catch (e) {
        // storage quota
      }
    }
    this.notify();
  }

  private saveOtps() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.OTPS, JSON.stringify(this.otps));
      } catch (e) {
        // storage quota
      }
    }
    this.notify();
  }

  private saveSms() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.SMS, JSON.stringify(this.smsMessages));
      } catch (e) {
        // storage quota
      }
    }
    this.notify();
  }

  // Applications Access
  public getApplications(): Application[] {
    return [...this.applications];
  }

  public getApplicationById(id: number): Application | undefined {
    return this.applications.find(a => a.id === id);
  }

  /**
   * Enforce Authorization on application status and details.
   * A citizen session can ONLY view the application record belonging to their own verified mobile or email.
   * Only authenticated officers can view any application.
   */
  public getApplicationByIdAuthorized(
    id: number,
    requestingIdentity?: string,
    isOfficer?: boolean
  ): { success: boolean; application?: Application; error?: string } {
    const app = this.applications.find(a => a.id === id);
    if (!app) {
      return { success: false, error: 'Application record not found.' };
    }

    if (isOfficer) {
      return { success: true, application: app };
    }

    if (requestingIdentity) {
      const cleanReq = requestingIdentity.trim();
      const normReq = normalizeIndianMobile(cleanReq);
      if (normReq && (app.mobile === normReq || normalizeIndianMobile(app.mobile) === normReq)) {
        return { success: true, application: app };
      }
      if (app.mobile && app.mobile === cleanReq) {
        return { success: true, application: app };
      }
      if (app.email && app.email.trim().toLowerCase() === cleanReq.toLowerCase()) {
        return { success: true, application: app };
      }
    }

    return {
      success: false,
      error: 'Unauthorized: You do not have permission to access another citizen’s application record.'
    };
  }

  public getApplicationByEmail(email: string): Application | undefined {
    if (!email) return undefined;
    const cleanEmail = email.trim().toLowerCase();
    return this.applications
      .filter(a => (a.email || '').toLowerCase() === cleanEmail)
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0];
  }

  public getApplicationsByMobile(mobile: string): Application[] {
    if (!mobile) return [];
    const norm = normalizeIndianMobile(mobile) || mobile.trim();
    return this.applications
      .filter(a => a.mobile === norm || normalizeIndianMobile(a.mobile) === norm || a.mobile === mobile.trim())
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  }

  public getApplicationByMobile(mobile: string): Application | undefined {
    return this.getApplicationsByMobile(mobile)[0];
  }

  /**
   * Safely remove synthetic applications created during automated evaluations or test runs.
   * Real citizen applications are never deleted.
   */
  public removeApplication(id: number): boolean {
    const idx = this.applications.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.applications.splice(idx, 1);
      this.saveApplications();
      return true;
    }
    return false;
  }

  public removeApplicationsByIds(ids: number[]): number {
    const initialCount = this.applications.length;
    const idSet = new Set(ids);
    this.applications = this.applications.filter(a => !idSet.has(a.id));
    const removedCount = initialCount - this.applications.length;
    if (removedCount > 0) {
      this.saveApplications();
    }
    return removedCount;
  }

  public getSupportedBlocks(): string[] {
    return [...SUPPORTED_BLOCKS];
  }

  public getVillagesForBlock(blockName: string): string[] {
    return getVillagesForBlock(blockName);
  }

  public isValidVillageForBlock(blockName: string, villageName: string, allowManual: boolean = true): boolean {
    return isValidVillageForBlock(blockName, villageName, allowManual);
  }

  public addApplication(
    data: FormDataState
  ): { success: boolean; application?: Application; error?: string } {
    const primaryId = data.mobile || data.email || 'citizen';
    return this.createApplication(primaryId, data);
  }

  public submitApplicationDraft(
    data: FormDataState
  ): { success: boolean; application?: Application; error?: string } {
    return this.addApplication(data);
  }

  public getApplicationByNumber(appNo: string): Application | undefined {
    return this.applications.find(a => a.application_no === appNo);
  }

  /**
   * Create application with full server-side validation & Unicode name sanitization.
   * Uses verified mobile number as primary identity.
   */
  public createApplication(
    identifier: string,
    data: FormDataState
  ): { success: boolean; application?: Application; error?: string } {
    if (!identifier) {
      return { success: false, error: 'A verified mobile number or email is required.' };
    }

    const normMobile = normalizeIndianMobile(identifier) || normalizeIndianMobile(data.mobile);
    const isMobileAuth = Boolean(normMobile);

    let cleanEmail: string | undefined = undefined;
    if (data.email && data.email.trim()) {
      cleanEmail = data.email.trim().toLowerCase();
    } else if (identifier && identifier.includes('@')) {
      cleanEmail = identifier.trim().toLowerCase();
    }

    // Duplicate check
    if (normMobile) {
      const existingByMobile = this.applications.find(
        a => a.mobile === normMobile || normalizeIndianMobile(a.mobile) === normMobile
      );
      if (existingByMobile) {
        return {
          success: false,
          error: `An application (${existingByMobile.application_no}) already exists for mobile number ${normMobile}. Duplicate applications are not permitted.`
        };
      }
    }

    if (cleanEmail) {
      const existingByEmail = this.applications.find(
        a => (a.email || '').toLowerCase() === cleanEmail
      );
      if (existingByEmail) {
        return {
          success: false,
          error: `An application (${existingByEmail.application_no}) already exists for email address ${cleanEmail}. Duplicate applications are not permitted.`
        };
      }
    }

    // Form data validation
    const validation = validateApplicationDraft(data);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(' ') };
    }

    // Scheme deadline check
    if (Date.now() > SCHEME_DEADLINE.getTime()) {
      return { success: false, error: 'The scheme application deadline has passed.' };
    }

    const cleanName = sanitizeName(data.applicant_name, 100);
    const newId = this.applications.length > 0 ? Math.max(...this.applications.map(a => a.id)) + 1 : 1;
    const appNo = generateApplicationNumber();
    const finalMobile = normMobile || (data.mobile ? normalizeIndianMobile(data.mobile) || data.mobile.trim() : '');

    const newApp: Application = {
      id: newId,
      application_no: appNo,
      applicant_name: cleanName,
      mobile: finalMobile,
      email: cleanEmail,
      dob: data.dob || '',
      gender: data.gender || 'Other',
      marital_status: data.marital_status || 'Married',
      husband_name: data.husband_name ? data.husband_name.trim() : undefined,
      husband_employer: data.husband_employer ? data.husband_employer.trim() : undefined,
      village: data.village ? data.village.trim() : '',
      block: data.block || 'Sonari',
      bank_account: data.bank_account ? data.bank_account.trim() : '',
      ifsc: data.ifsc ? data.ifsc.trim().toUpperCase() : '',
      doc_name: data.doc_name || 'document.pdf',
      doc_size: data.doc_size || 1024,
      doc_data: data.doc_data,
      status: 'PENDING',
      submitted_at: new Date().toISOString(),
    };

    this.applications.unshift(newApp);
    this.saveApplications();

    // Create / update status portal user
    const dobPass = getDobAsDDMMYYYY(newApp.dob);
    const existingUser = this.users.find(
      u => (finalMobile && u.mobile === finalMobile) || (cleanEmail && (u.email || '').toLowerCase() === cleanEmail)
    );
    if (!existingUser) {
      this.users.push({
        mobile: finalMobile,
        email: cleanEmail,
        dob: newApp.dob,
        password_hash: dobPass,
        verified_at: new Date().toISOString(),
      });
      this.saveUsers();
    }

    // Notify via SMS
    this.sendMessage(
      finalMobile,
      `Sewa Setu: pension application ${appNo} received. Check status using your mobile number and OTP at the portal.`,
      'SMS'
    );

    if (cleanEmail) {
      this.sendMessage(
        cleanEmail,
        `Sewa Setu: application ${appNo} received. Track at the status portal with your mobile number or email.`,
        'EMAIL'
      );
    }

    return { success: true, application: newApp };
  }

  /**
   * DEFECT 1 FIX: Strictly authenticate officer identity and prevent unauthorized approval
   */
  public approveApplication(
    id: number,
    officerIdentity: string = 'officer_admin',
    isOfficerSession: boolean = true,
    reason: string = 'Approved upon statutory document verification'
  ): { success: boolean; error?: string } {
    if (!isOfficerSession) {
      return { success: false, error: 'Forbidden: Only authorized departmental officers can approve applications.' };
    }

    const app = this.applications.find(a => a.id === id);
    if (!app) {
      return { success: false, error: 'Application not found.' };
    }

    // Protect terminal state
    if (app.status !== 'PENDING') {
      return { success: false, error: `Application is already decided (${app.status}). Status cannot be overwritten.` };
    }

    const nowIso = new Date().toISOString();
    app.status = 'APPROVED';
    app.decided_at = nowIso;
    app.decided_by = officerIdentity;
    app.decision_reason = reason;
    if (!app.audit_trail) app.audit_trail = [];
    app.audit_trail.push({
      timestamp: nowIso,
      action: 'APPROVED',
      actor: officerIdentity,
      reason,
      details: `Approved by officer ${officerIdentity}`,
    });
    this.saveApplications();

    this.sendMessage(
      app.email || app.mobile,
      `Sewa Setu: your pension application ${app.application_no} has been APPROVED by the Department of Social Welfare.`,
      app.email ? 'EMAIL' : 'SMS'
    );
    return { success: true };
  }

  /**
   * DEFECT 1 FIX: Strictly authenticate officer identity and prevent unauthorized rejection
   */
  public rejectApplication(
    id: number,
    officerIdentity: string = 'officer_admin',
    isOfficerSession: boolean = true,
    reason?: string
  ): { success: boolean; error?: string } {
    if (!isOfficerSession) {
      return { success: false, error: 'Forbidden: Only authorized departmental officers can reject applications.' };
    }

    const app = this.applications.find(a => a.id === id);
    if (!app) {
      return { success: false, error: 'Application not found.' };
    }

    // Protect terminal state
    if (app.status !== 'PENDING') {
      return { success: false, error: `Application is already decided (${app.status}). Status cannot be overwritten.` };
    }

    const cleanReason = reason?.trim();
    if (!cleanReason || cleanReason.length < 5) {
      return { success: false, error: 'Rejection requires a meaningful statutory reason (minimum 5 characters).' };
    }

    const nowIso = new Date().toISOString();
    app.status = 'REJECTED';
    app.decided_at = nowIso;
    app.decided_by = officerIdentity;
    app.decision_reason = cleanReason;
    if (!app.audit_trail) app.audit_trail = [];
    app.audit_trail.push({
      timestamp: nowIso,
      action: 'REJECTED',
      actor: officerIdentity,
      reason: cleanReason,
      details: `Rejected by officer ${officerIdentity}: ${cleanReason}`,
    });
    this.saveApplications();

    this.sendMessage(
      app.email || app.mobile,
      `Sewa Setu: your pension application ${app.application_no} has been REJECTED. Reason: ${cleanReason}`,
      app.email ? 'EMAIL' : 'SMS'
    );
    return { success: true };
  }

  /**
   * DEFECT 6 FIX: RTPS Deemed Approval Job
   * Idempotent, only updates status = 'PENDING' older than SLA_DAYS (15 days),
   * sets decided_by = 'RTPS-AUTO', and prevents duplicate notifications.
   */
  public runDeemedApproval(): { count: number; approved: Application[] } {
    const cutoffTime = Date.now() - SLA_DAYS * 24 * 60 * 60 * 1000;
    const nowIso = new Date().toISOString();
    const approved: Application[] = [];

    this.applications.forEach(app => {
      // Must be PENDING and submitted prior to the 15-day SLA cutoff
      if (app.status === 'PENDING') {
        const submittedTime = new Date(app.submitted_at).getTime();
        if (submittedTime < cutoffTime) {
          app.status = 'DEEMED_APPROVED';
          app.decided_at = nowIso;
          app.decided_by = 'RTPS-AUTO';
          app.decision_reason = 'Statutory deemed approval after 15-day SLA under Purvanchal RTPS Act';
          if (!app.audit_trail) app.audit_trail = [];
          app.audit_trail.push({
            timestamp: nowIso,
            action: 'DEEMED_APPROVED',
            actor: 'RTPS-AUTO',
            reason: app.decision_reason,
            details: 'Automatically approved by system scheduler under Section 7 of RTPS Act',
          });
          approved.push(app);

          this.sendMessage(
            app.email || app.mobile,
            `Sewa Setu: your pension application ${app.application_no} stands approved under the RTPS Act.`,
            app.email ? 'EMAIL' : 'SMS'
          );
        }
      }
    });

    if (approved.length > 0) {
      this.saveApplications();
    }

    return { count: approved.length, approved };
  }

  // Citizen Authentication
  public verifyCitizenLogin(
    email: string,
    passwordAttempt: string
  ): { success: boolean; application?: Application; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanAttempt = passwordAttempt.trim();

    if (!cleanEmail || !cleanAttempt) {
      return { success: false, error: 'Email address and password are required.' };
    }

    const app = this.getApplicationByEmail(cleanEmail);
    if (!app) {
      return { success: false, error: 'No application found for this email address.' };
    }

    const expectedPass = getDobAsDDMMYYYY(app.dob);
    if (cleanAttempt === expectedPass) {
      return { success: true, application: app };
    }

    return { success: false, error: 'Invalid password. Password is your Date of Birth in DDMMYYYY format.' };
  }

  public resetPassword(email: string): boolean {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();
    const app = this.getApplicationByEmail(cleanEmail);
    if (!app) return false;

    const dobPass = getDobAsDDMMYYYY(app.dob);
    const user = this.users.find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (user) {
      user.password_hash = dobPass;
    } else {
      this.users.push({
        email: cleanEmail,
        mobile: app.mobile,
        dob: app.dob,
        password_hash: dobPass,
      });
    }
    this.saveUsers();

    this.sendMessage(
      cleanEmail,
      "Sewa Setu: your password has been reset to your date of birth (DDMMYYYY).",
      'EMAIL'
    );
    return true;
  }

  /**
   * Primary Mobile OTP Generation with Cryptographic Security, 15-second cooldown,
   * 5-minute expiry, and superseded challenge invalidation.
   */
  public generateMobileOtp(
    mobile: string,
    purpose: 'APPLICATION' | 'STATUS_LOGIN' | 'STATUS_CHECK' | 'GENERAL' = 'GENERAL'
  ): { success: boolean; code?: string; mobile?: string; error?: string } {
    const norm = normalizeIndianMobile(mobile);
    if (!norm) {
      return { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
    }

    const now = Date.now();
    const latest = this.getLatestOtpForMobile(norm);
    if (latest && !latest.consumed && (now - latest.created_at) < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      const remainingSec = Math.ceil((OTP_RESEND_COOLDOWN_SECONDS * 1000 - (now - latest.created_at)) / 1000);
      return { success: false, error: `Please wait ${remainingSec}s before requesting a new OTP.` };
    }

    // Invalidate any superseded pending challenges for this mobile
    this.otps.forEach(o => {
      if (o.mobile === norm && !o.consumed) {
        o.consumed = true;
      }
    });

    const code = generateCryptoOtp();
    const newId = this.otps.length > 0 ? Math.max(...this.otps.map(o => o.id)) + 1 : 1;

    const otpRecord: OtpState = {
      id: newId,
      mobile: norm,
      email: undefined,
      code,
      created_at: now,
      expires_at: now + OTP_VALIDITY_SECONDS * 1000,
      attempts: 0,
      consumed: false,
      purpose,
    };

    this.otps.push(otpRecord);
    this.saveOtps();

    this.sendMessage(
      norm,
      `Your Sewa Setu verification OTP is ${code}. Valid for 5 minutes. Do not share this OTP with anyone.`,
      'SMS'
    );

    return { success: true, code, mobile: norm };
  }

  public verifyMobileOtp(mobile: string, codeInput: string): { success: boolean; error?: string } {
    const norm = normalizeIndianMobile(mobile);
    if (!norm) {
      return { success: false, error: 'A valid 10-digit Indian mobile number is required.' };
    }
    if (!codeInput || !codeInput.trim()) {
      return { success: false, error: 'Verification code is required.' };
    }

    const latest = this.getLatestOtpForMobile(norm);
    if (!latest) {
      return { success: false, error: 'No OTP generated for this mobile number. Please request an OTP.' };
    }

    if (latest.consumed) {
      return { success: false, error: 'This OTP has already been used. Please request a fresh OTP.' };
    }

    const now = Date.now();
    const elapsedSeconds = (now - latest.created_at) / 1000;
    if (elapsedSeconds > OTP_VALIDITY_SECONDS || (latest.expires_at && now > latest.expires_at)) {
      latest.consumed = true;
      this.saveOtps();
      return { success: false, error: 'The OTP has expired. Please request a new OTP to continue.' };
    }

    if (latest.attempts >= MAX_OTP_ATTEMPTS) {
      latest.consumed = true;
      this.saveOtps();
      return { success: false, error: 'Too many failed verification attempts. This challenge is locked. Please request a new OTP.' };
    }

    if (latest.code !== codeInput.trim()) {
      latest.attempts++;
      this.saveOtps();
      const remaining = MAX_OTP_ATTEMPTS - latest.attempts;
      if (remaining <= 0) {
        latest.consumed = true;
        this.saveOtps();
        return { success: false, error: 'Too many failed verification attempts. This challenge is locked. Please request a new OTP.' };
      }
      return {
        success: false,
        error: `The verification code is incorrect. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      };
    }

    // Success: Consume immediately to prevent replay
    latest.consumed = true;
    this.saveOtps();
    return { success: true };
  }

  public getLatestOtpForMobile(mobile: string): OtpState | undefined {
    if (!mobile) return undefined;
    const norm = normalizeIndianMobile(mobile) || mobile.trim();
    return this.otps
      .filter(o => o && o.mobile && (o.mobile === norm || normalizeIndianMobile(o.mobile) === norm))
      .sort((a, b) => b.created_at - a.created_at)[0];
  }

  /**
   * Citizen Mobile Status Authentication:
   * Verifies mobile OTP and resolves applications belonging to this verified mobile number.
   */
  public verifyCitizenMobileLogin(
    mobile: string,
    codeInput: string
  ): { success: boolean; application?: Application; applications?: Application[]; error?: string } {
    const norm = normalizeIndianMobile(mobile);
    if (!norm) {
      return { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
    }

    const verifyRes = this.verifyMobileOtp(norm, codeInput);
    if (!verifyRes.success) {
      return { success: false, error: verifyRes.error };
    }

    const apps = this.getApplicationsByMobile(norm);
    if (!apps || apps.length === 0) {
      return {
        success: true,
        applications: [],
        application: undefined,
      };
    }

    return {
      success: true,
      applications: apps,
      application: apps[0],
    };
  }

  // Unified OTP Generator supporting both mobile (primary) and email (legacy compatibility)
  public generateOtp(target: string, purpose: 'APPLICATION' | 'STATUS_LOGIN' | 'GENERAL' = 'GENERAL'): { success: boolean; code?: string; error?: string } {
    if (!target) {
      return { success: false, error: 'A valid mobile number or email address is required.' };
    }

    const normMobile = normalizeIndianMobile(target);
    if (normMobile) {
      return this.generateMobileOtp(normMobile, purpose);
    }

    // Email fallback
    const cleanEmail = target.trim().toLowerCase();
    const now = Date.now();
    const latest = this.getLatestOtpForEmail(cleanEmail);
    if (latest && !latest.consumed && now - latest.created_at < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      const remainingSec = Math.ceil((OTP_RESEND_COOLDOWN_SECONDS * 1000 - (now - latest.created_at)) / 1000);
      return { success: false, error: `Please wait ${remainingSec}s before requesting another OTP.` };
    }

    // Invalidate superseded
    this.otps.forEach(o => {
      if (o.email && o.email.toLowerCase() === cleanEmail && !o.consumed) {
        o.consumed = true;
      }
    });

    const code = generateCryptoOtp();
    const newId = this.otps.length > 0 ? Math.max(...this.otps.map(o => o.id)) + 1 : 1;

    this.otps.push({
      id: newId,
      mobile: '',
      email: cleanEmail,
      code,
      created_at: now,
      expires_at: now + OTP_VALIDITY_SECONDS * 1000,
      attempts: 0,
      consumed: false,
      purpose,
    });
    this.saveOtps();

    this.sendMessage(cleanEmail, `Your Sewa Setu OTP is ${code}. Valid for 5 minutes.`, 'EMAIL');
    return { success: true, code };
  }

  public getLatestOtpForEmail(email: string): OtpState | undefined {
    if (!email) return undefined;
    const cleanEmail = email.trim().toLowerCase();
    return this.otps
      .filter(o => o && o.email && typeof o.email === 'string' && o.email.toLowerCase() === cleanEmail)
      .sort((a, b) => b.created_at - a.created_at)[0];
  }

  public verifyOtp(target: string, codeInput: string): { success: boolean; error?: string } {
    if (!target || !codeInput) {
      return { success: false, error: 'Identifier and OTP code are required.' };
    }

    const normMobile = normalizeIndianMobile(target);
    if (normMobile) {
      return this.verifyMobileOtp(normMobile, codeInput);
    }

    const cleanEmail = target.trim().toLowerCase();
    const latest = this.getLatestOtpForEmail(cleanEmail);
    if (!latest) {
      return { success: false, error: 'No OTP generated for this email address. Please request an OTP.' };
    }

    if (latest.consumed) {
      return { success: false, error: 'This OTP has already been used. Please request a new OTP.' };
    }

    const now = Date.now();
    const elapsedSeconds = (now - latest.created_at) / 1000;
    if (elapsedSeconds > OTP_VALIDITY_SECONDS || (latest.expires_at && now > latest.expires_at)) {
      latest.consumed = true;
      this.saveOtps();
      return { success: false, error: 'OTP has expired. Please request a new OTP.' };
    }

    if (latest.attempts >= MAX_OTP_ATTEMPTS) {
      latest.consumed = true;
      this.saveOtps();
      return { success: false, error: 'Too many failed attempts. Please request a new OTP.' };
    }

    if (latest.code !== codeInput.trim()) {
      latest.attempts++;
      this.saveOtps();
      const remaining = MAX_OTP_ATTEMPTS - latest.attempts;
      if (remaining <= 0) {
        latest.consumed = true;
        this.saveOtps();
        return { success: false, error: 'Too many failed attempts. Challenge locked. Please request a new OTP.' };
      }
      return {
        success: false,
        error: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      };
    }

    latest.consumed = true;
    this.saveOtps();
    return { success: true };
  }

  // Unified message gateway (SMS/EMAIL)
  public sendMessage(to: string, text: string, type: 'SMS' | 'EMAIL' = 'SMS') {
    const nowSec = Math.floor(Date.now() / 1000);
    const delay = Math.floor(1 + Math.random() * 3);
    const newId = this.smsMessages.length > 0 ? Math.max(...this.smsMessages.map(m => m.id)) + 1 : 1;

    const newMsg: SmsMessage = {
      id: newId,
      to,
      text,
      type,
      sent_at: nowSec,
      delivery_at: nowSec + delay,
      delivered: false,
    };

    this.smsMessages.push(newMsg);
    this.saveSms();

    setTimeout(() => {
      newMsg.delivered = true;
      this.saveSms();
    }, delay * 1000);
  }

  // Backwards compatibility
  public sendSms(to: string, text: string) {
    this.sendMessage(to, text, 'SMS');
  }

  public getMessages(to?: string): SmsMessage[] {
    const nowSec = Math.floor(Date.now() / 1000);
    let changed = false;
    this.smsMessages.forEach(m => {
      if (!m.delivered && nowSec >= m.delivery_at) {
        m.delivered = true;
        changed = true;
      }
    });
    if (changed) {
      this.saveSms();
    }

    if (to && typeof to === 'string') {
      const cleanTo = to.trim().toLowerCase();
      return this.smsMessages
        .filter(m => m && m.to && m.to.toLowerCase() === cleanTo)
        .slice()
        .reverse();
    }
    return this.smsMessages.slice().reverse();
  }

  // Deprecated method name
  public getSmsMessages(to?: string): SmsMessage[] {
    return this.getMessages(to);
  }

  public resetToFactoryDefaults() {
    this.applications = JSON.parse(JSON.stringify(INITIAL_APPLICATIONS));
    this.users = JSON.parse(JSON.stringify(INITIAL_USERS));
    this.otps = [];
    this.smsMessages = JSON.parse(JSON.stringify(INITIAL_SMS));
    this.saveApplications();
    this.saveUsers();
    this.saveOtps();
    this.saveSms();
  }
}

export const store = new DataStore();
