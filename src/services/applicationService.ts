import { Application, ApplicationStatus, FormDataState, PortalUser, OtpRecord, SmsMessage } from '../types';

export const SUPPORTED_BLOCKS = [
  "Sonari",
  "Rajapara",
  "Dhemaji Pathar",
  "Borgaon",
  "Namti",
  "Khelua"
] as const;

export const BLOCKS = SUPPORTED_BLOCKS;
export type SupportedBlock = typeof SUPPORTED_BLOCKS[number];

/**
 * Official Purvanchal Scheme Directory - Mapped Villages/Towns per Supported Block
 */
export const BLOCK_VILLAGE_DIRECTORY: Record<SupportedBlock, string[]> = {
  Sonari: [
    "Sonari Gaon",
    "Sonari Town Ward 1",
    "Sonari Town Ward 2",
    "Sonari Town Ward 3",
    "Silsako Village",
    "Bhatbari Gaon",
    "Jaboka Village",
  ],
  Rajapara: [
    "Rajapara Char",
    "Rajapara Ward 1",
    "Rajapara Ward 2",
    "Rajapara Ward 3",
    "Khatkhati Gaon",
    "Niz Rajapara",
  ],
  "Dhemaji Pathar": [
    "Dhemaji Pathar Town",
    "Dhemaji Pathar Gaon",
    "Bordoloni Ward 1",
    "Bordoloni Ward 2",
    "Ghilamara Village",
  ],
  Borgaon: [
    "Borgaon Pathar",
    "Borgaon Gaon",
    "Borgaon Central",
    "Niz Borgaon",
    "Jamuguri Village",
  ],
  Namti: [
    "Namti Chariali",
    "Namti Town",
    "Namti Kakoti Gaon",
    "Namti Dulia Gaon",
    "Bihubar Village",
  ],
  Khelua: [
    "Khelua Gaon",
    "Khelua Town",
    "Khelua Central",
    "Salkathoni Village",
    "Nafuk Gaon",
  ],
};

export function getVillagesForBlock(blockName: string | undefined | null): string[] {
  if (!blockName) return [];
  const cleanBlock = blockName.trim();
  if (SUPPORTED_BLOCKS.includes(cleanBlock as SupportedBlock)) {
    return [...BLOCK_VILLAGE_DIRECTORY[cleanBlock as SupportedBlock]];
  }
  return [];
}

export function isValidVillageForBlock(
  blockName: string | undefined | null,
  villageName: string | undefined | null,
  allowManualEntry: boolean = true
): boolean {
  if (!blockName || !villageName) return false;
  const cleanBlock = blockName.trim();
  const cleanVillage = villageName.trim();
  if (!cleanVillage || cleanVillage.length < 2) return false;

  if (!SUPPORTED_BLOCKS.includes(cleanBlock as SupportedBlock)) {
    return false;
  }

  const mappedVillages = BLOCK_VILLAGE_DIRECTORY[cleanBlock as SupportedBlock] || [];
  if (mappedVillages.includes(cleanVillage)) {
    return true;
  }

  // If manual entry ("Other"), allow as long as it is non-empty valid string
  return allowManualEntry && cleanVillage.length >= 2;
}

export const MIN_AGE = 60;
export const SLA_DAYS = 15;
export const OTP_VALIDITY_SECONDS = 300; // 5 minutes
export const OTP_RESEND_COOLDOWN_SECONDS = 15; // 15-second resend cooldown
export const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_DOC_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
export const MAX_OTP_ATTEMPTS = 5;

/**
 * Normalizes Indian mobile number to clean 10-digit format starting with 6-9.
 * Strips '+91', '91' prefix, leading '0', spaces, hyphens, and brackets.
 * Returns null if malformed or invalid Indian mobile number.
 */
export function normalizeIndianMobile(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let cleaned = String(raw).trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

export function isValidIndianMobile(raw: string | undefined | null): boolean {
  return normalizeIndianMobile(raw) !== null;
}

// Scheme deadline: 31 October 2026 23:59
export const SCHEME_DEADLINE = new Date("2026-10-31T23:59:59");

/**
 * DEFECT 3 FIX: Sanitize input without byte-slicing Unicode / Indian-language strings.
 * Previous buggy implementation sliced raw bytes: `value.encode("utf-8")[:20]`,
 * which mutilated Hindi, Assamese, and other Indic multibyte characters.
 */
export function sanitizeName(value: string | undefined | null, maxChars: number = 100): string {
  if (!value) return '';
  // Trim surrounding whitespace and normalize unicode
  const normalized = value.trim().normalize('NFC');
  // Enforce character limit without byte-chopping
  return Array.from(normalized).slice(0, maxChars).join('');
}

/**
 * Lenient Date Parser that correctly extracts DD, MM, YYYY
 * Supports DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
 */
export function parseDateOfBirth(dobStr: string): Date | null {
  if (!dobStr) return null;
  const clean = dobStr.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return d;
      }
    }
  }

  // YYYY-MM-DD
  const yyyymmddMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10) - 1;
    const day = parseInt(yyyymmddMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return d;
      }
    }
  }

  return null;
}

export function calculateAgeFromDate(dob: Date, referenceDate: Date = new Date()): number {
  let age = referenceDate.getFullYear() - dob.getFullYear();
  const m = referenceDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function calculateAge(dobStr: string): number {
  const parsed = parseDateOfBirth(dobStr);
  if (!parsed) return 0;
  return calculateAgeFromDate(parsed);
}

export function formatDobForPassword(dob: Date): string {
  const day = String(dob.getDate()).padStart(2, '0');
  const month = String(dob.getMonth() + 1).padStart(2, '0');
  const year = String(dob.getFullYear());
  return `${day}${month}${year}`;
}

export function validateDocument(fileName: string, fileSize: number): { valid: boolean; error?: string } {
  if (!fileName) {
    return { valid: false, error: 'Age proof document is required.' };
  }

  const lower = fileName.toLowerCase();
  const hasValidExt = ALLOWED_DOC_EXTENSIONS.some(ext => lower.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: `Invalid file format. Accepted formats are JPG, JPEG, PNG, or PDF.`
    };
  }

  if (fileSize > MAX_DOC_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 5 MB limit (file size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB).`
    };
  }

  return { valid: true };
}

export function validateApplicationDraft(data: FormDataState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Applicant Name
  const cleanName = sanitizeName(data.applicant_name);
  if (!cleanName || cleanName.length < 2) {
    errors.push('Full Name of Applicant must be at least 2 characters.');
  }

  // 2. Date of Birth & Minimum Age (60)
  if (!data.dob) {
    errors.push('Date of Birth is required.');
  } else {
    const parsedDob = parseDateOfBirth(data.dob);
    if (!parsedDob) {
      errors.push('Invalid Date of Birth format. Please use DD/MM/YYYY or YYYY-MM-DD.');
    } else {
      const age = calculateAgeFromDate(parsedDob);
      if (age < MIN_AGE) {
        errors.push(`Applicant must be at least ${MIN_AGE} years of age to be eligible. Current calculated age: ${age} years.`);
      }
    }
  }

  // 3. Gender
  if (!data.gender || !['Male', 'Female', 'Other'].includes(data.gender)) {
    errors.push('Please select a valid Gender (Male, Female, or Other).');
  }

  // 4. Marital Status & Widowed Rule
  if (!data.marital_status || !['Married', 'Unmarried', 'Widowed'].includes(data.marital_status)) {
    errors.push('Please select a valid Marital Status.');
  } else if (data.marital_status === 'Widowed') {
    // DEFECT 5 FIX: In original code, both husband_name and husband_employer were strictly required
    // which caused widows whose husbands passed away long ago to be rejected if employer was unknown.
    if (!data.husband_name || data.husband_name.trim().length === 0) {
      errors.push("Deceased Husband's Name is required for widowed applicants.");
    }
  }

  // 5. Address Details & Supported Block
  if (!data.block || !SUPPORTED_BLOCKS.includes(data.block as SupportedBlock)) {
    errors.push(`Please select a supported Block within Purvanchal (${SUPPORTED_BLOCKS.join(', ')}).`);
  }

  if (!data.village || data.village.trim().length === 0) {
    errors.push('Village / Town name is required.');
  } else if (data.village.trim().length < 2) {
    errors.push('Village / Town name must be at least 2 characters.');
  }

  // 6. Bank Account & IFSC
  if (!data.bank_account || !/^\d{9,18}$/.test(data.bank_account.trim())) {
    errors.push('Bank Account Number must be between 9 and 18 numeric digits.');
  }

  if (!data.ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(data.ifsc.trim())) {
    errors.push('IFSC code must be an 11-character code matching RBI standards (e.g., SBIN0001234).');
  }

  // 7. Document Upload
  if (data.doc_name) {
    const docCheck = validateDocument(data.doc_name, data.doc_size || 1024);
    if (!docCheck.valid) {
      errors.push(docCheck.error || 'Invalid document.');
    }
  } else {
    errors.push('Age proof document is required.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
