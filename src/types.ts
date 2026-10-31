export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DEEMED_APPROVED';

export interface AuditEntry {
  timestamp: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DEEMED_APPROVED';
  actor: string;
  reason?: string | null;
  details?: string;
}

export interface Application {
  id: number;
  application_no: string;
  applicant_name: string;
  mobile: string;
  email?: string;
  dob: string; // YYYY-MM-DD or DD/MM/YYYY
  gender: 'Male' | 'Female' | 'Other' | string;
  marital_status: 'Married' | 'Unmarried' | 'Widowed' | string;
  is_widow?: 'Yes' | 'No' | string;
  husband_name?: string;
  husband_employer?: string;
  village: string;
  block: string;
  bank_account: string;
  ifsc: string;
  doc_path?: string;
  doc_name?: string;
  doc_size?: number;
  doc_data?: string;
  status: ApplicationStatus;
  submitted_at: string; // ISO string or human string
  decided_at?: string | null;
  decided_by?: string | null;
  decision_reason?: string | null;
  audit_trail?: AuditEntry[];
}

export interface PortalUser {
  mobile: string;
  email?: string;
  password_hash?: string;
  dob?: string;
  verified_at?: string;
}

export interface OtpRecord {
  id: number;
  mobile: string;
  email?: string;
  code: string;
  created_at: number; // timestamp ms
  expires_at?: number;
  attempts?: number;
  consumed?: boolean;
  purpose?: 'APPLICATION' | 'STATUS_LOGIN' | 'STATUS_CHECK' | 'GENERAL';
}

export interface SmsMessage {
  id: number;
  to: string; // Mobile or Email
  text: string;
  type: 'SMS' | 'EMAIL';
  sent_at: number; // timestamp seconds
  delivery_at: number; // timestamp seconds
  delivered: boolean;
}

export interface FormDataState {
  applicant_name?: string;
  dob?: string;
  gender?: string;
  marital_status?: string;
  is_widow?: string;
  husband_name?: string;
  husband_employer?: string;
  village?: string;
  block?: string;
  bank_account?: string;
  ifsc?: string;
  mobile?: string;
  email?: string;
  doc_name?: string;
  doc_size?: number;
  doc_data?: string;
}
