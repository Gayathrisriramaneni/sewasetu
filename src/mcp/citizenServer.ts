import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { store } from '../data/store';
import {
  SUPPORTED_BLOCKS,
  MIN_AGE,
  SLA_DAYS,
  SCHEME_DEADLINE,
  validateApplicationDraft,
  validateDocument,
  calculateAgeFromDate,
  parseDateOfBirth,
  formatDobForPassword,
  sanitizeName,
  normalizeIndianMobile,
} from '../services/applicationService';
import { tokenManager } from './tokenManager';

export function createCitizenMcpServer(): McpServer {
  const server = new McpServer({
    name: 'sewasetu-citizen-assistant',
    version: '1.0.0',
  });

  /* -------------------------------------------------------------------------
   * Tool 1: get_scheme_information
   * ------------------------------------------------------------------------- */
  server.tool(
    'get_scheme_information',
    'Retrieve authoritative statutory rules, monthly pension amount, minimum age, and SLA terms for the Purvanchal Old Age Pension Scheme.',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                scheme_name: 'Old Age Pension Scheme',
                authority: 'Department of Social Welfare, Government of Purvanchal',
                program: 'State Social Assistance Programme',
                monthly_pension_amount: 'Rs. 250 per month',
                disbursement_mode: 'Direct Benefit Transfer (DBT) to beneficiary bank account',
                statutory_minimum_age: MIN_AGE,
                statutory_sla_days: SLA_DAYS,
                deemed_approval: 'Applications not decided within the statutory 15-day period stand approved under the Purvanchal Right to Public Services Act (RTPS).',
                scheme_deadline: SCHEME_DEADLINE.toISOString(),
                application_limit: 'One application per eligible senior citizen. Duplicate applications on the same email address are strictly prohibited.',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  /* -------------------------------------------------------------------------
   * Tool 2: get_supported_blocks
   * ------------------------------------------------------------------------- */
  server.tool(
    'get_supported_blocks',
    'Retrieve the official list of supported development blocks within Purvanchal jurisdiction.',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                jurisdiction: 'Government of Purvanchal',
                supported_blocks: SUPPORTED_BLOCKS,
                total_blocks: SUPPORTED_BLOCKS.length,
                rule: 'Applicant must reside in a village or town within one of these 6 notified development blocks.',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  /* -------------------------------------------------------------------------
   * Tool 3: get_application_requirements
   * ------------------------------------------------------------------------- */
  server.tool(
    'get_application_requirements',
    'Retrieve the official checklist of information, documents, and banking details needed to complete an application.',
    {},
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                requirements: [
                  {
                    item: 'Active Indian Mobile Number',
                    description: 'A valid 10-digit Indian mobile number to receive verification OTPs and official SMS tracking updates.',
                  },
                  {
                    item: 'Personal Details',
                    description: 'Full name (as written on document), Date of Birth (applicant must be 60+), Gender, and Marital Status.',
                  },
                  {
                    item: 'Address in Purvanchal',
                    description: `Village/Town name and Block belonging to: ${SUPPORTED_BLOCKS.join(', ')}.`,
                  },
                  {
                    item: 'Bank Account for DBT',
                    description: 'Applicant bank account number and 11-character IFSC code for direct monthly credit of Rs. 250.',
                  },
                  {
                    item: 'Age Proof Document',
                    description: 'Birth Certificate, School Leaving Certificate, or Voter ID Card (formats: JPG, JPEG, PNG, or PDF; max size: 5 MB).',
                  },
                  {
                    item: 'Statutory Declaration',
                    description: 'Applicant must confirm that all details are true and correct under penalty of law.',
                  },
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  /* -------------------------------------------------------------------------
   * Tool 4A: start_mobile_application (Primary)
   * ------------------------------------------------------------------------- */
  server.tool(
    'start_mobile_application',
    'Start an application by requesting a 6-digit verification OTP to the citizen mobile number.',
    {
      mobile: z.string().describe('10-digit Indian mobile number (e.g. 9876543210)'),
    },
    async ({ mobile }) => {
      const norm = normalizeIndianMobile(mobile);
      if (!norm) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'INVALID_MOBILE',
                message: 'Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
              }),
            },
          ],
        };
      }

      // Check duplicate
      const existing = store.getApplicationByMobile(norm);
      if (existing) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'DUPLICATE_APPLICATION',
                message: `An application (${existing.application_no}) already exists for this mobile number. Duplicate submissions are not permitted.`,
              }),
            },
          ],
        };
      }

      const otpRes = store.generateMobileOtp(norm, 'APPLICATION');
      if (!otpRes.success) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'OTP_DISPATCH_FAILED',
                message: otpRes.error || 'Failed to dispatch OTP. Please wait a moment and try again.',
              }),
            },
          ],
        };
      }

      const sessionId = tokenManager.createMobileSession(norm);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'otp_sent',
              session_id: sessionId,
              mobile: norm,
              validity_seconds: 300,
              message: `A 6-digit verification code has been dispatched via SMS to ${norm}. The code is valid for 5 minutes. Ask the citizen for the code, then call verify_mobile_otp.`,
            }),
          },
        ],
      };
    }
  );

  /* -------------------------------------------------------------------------
   * Tool 4B: verify_mobile_otp (Primary)
   * ------------------------------------------------------------------------- */
  server.tool(
    'verify_mobile_otp',
    'Verify the 6-digit OTP code received by the citizen via SMS. The server strictly authenticates the code.',
    {
      session_id: z.string().min(1, 'Session ID is required'),
      mobile: z.string().describe('10-digit Indian mobile number'),
      otp_code: z.string().length(6, 'OTP must be 6 digits'),
    },
    async ({ session_id, mobile, otp_code }) => {
      const norm = normalizeIndianMobile(mobile);
      if (!norm) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'INVALID_MOBILE',
                message: 'Please provide a valid 10-digit Indian mobile number.',
              }),
            },
          ],
        };
      }

      const session = tokenManager.getSession(session_id);
      if (!session || (session.mobile && session.mobile !== norm)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'INVALID_SESSION',
                message: 'Invalid or expired session. Please start the application process again.',
              }),
            },
          ],
        };
      }

      const verifyRes = store.verifyMobileOtp(norm, otp_code);
      if (!verifyRes.success) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'INVALID_OTP',
                message: verifyRes.error || 'The OTP code is invalid or has expired.',
              }),
            },
          ],
        };
      }

      const token = tokenManager.issueToken(session_id);
      if (!token) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'TOKEN_GENERATION_FAILED',
                message: 'Internal error generating identity token.',
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'verified',
              verified: true,
              mobile: norm,
              verification_token: token,
              token_validity_minutes: 30,
              message: 'Mobile number verified successfully. You may now draft and submit the citizen’s application using this verification token.',
            }),
          },
        ],
      };
    }
  );

  /* -------------------------------------------------------------------------
   * Legacy Wrapper: start_application (Backward Compatibility)
   * ------------------------------------------------------------------------- */
  server.tool(
    'start_application',
    'Start an application by requesting a 6-digit verification OTP (supports email or mobile).',
    {
      email: z.string().describe('Citizen email address or 10-digit mobile number'),
    },
    async ({ email }) => {
      const normMobile = normalizeIndianMobile(email);
      const target = normMobile || email.trim();

      // Check duplicate
      const existing = normMobile ? store.getApplicationByMobile(normMobile) : store.getApplicationByEmail(target);
      if (existing) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'DUPLICATE_APPLICATION',
                message: `An application (${existing.application_no}) already exists for this applicant. Duplicate submissions are not permitted.`,
              }),
            },
          ],
        };
      }

      const otpRes = store.generateOtp(target);
      if (!otpRes.success) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'OTP_DISPATCH_FAILED',
                message: otpRes.error || 'Failed to dispatch OTP. Please wait a moment and try again.',
              }),
            },
          ],
        };
      }

      const sessionId = tokenManager.createSession(target);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'otp_sent',
              session_id: sessionId,
              email: target,
              mobile: normMobile || undefined,
              validity_seconds: 300,
              message: `A 6-digit verification code has been sent. The code is valid for 5 minutes. Ask the citizen for the code, then verify.`,
            }),
          },
        ],
      };
    }
  );

  /* -------------------------------------------------------------------------
   * Legacy Wrapper: verify_email_otp (Backward Compatibility)
   * ------------------------------------------------------------------------- */
  server.tool(
    'verify_email_otp',
    'Verify the 6-digit OTP code received by the citizen. The server strictly authenticates the code.',
    {
      session_id: z.string().min(1, 'Session ID is required'),
      email: z.string().describe('Citizen email or mobile number'),
      otp_code: z.string().length(6, 'OTP must be 6 digits'),
    },
    async ({ session_id, email, otp_code }) => {
      const normMobile = normalizeIndianMobile(email);
      const target = normMobile || email.trim().toLowerCase();

      const session = tokenManager.getSession(session_id);
      if (!session) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'INVALID_SESSION',
                message: 'Invalid or expired session. Please start the application process again.',
              }),
            },
          ],
        };
      }

      const verifyRes = store.verifyOtp(target, otp_code);
      if (!verifyRes.success) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'INVALID_OTP',
                message: verifyRes.error || 'The OTP code is invalid or has expired.',
              }),
            },
          ],
        };
      }

      const token = tokenManager.issueToken(session_id);
      if (!token) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'TOKEN_GENERATION_FAILED',
                message: 'Internal error generating identity token.',
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'verified',
              verified: true,
              email: target,
              verification_token: token,
              token_validity_minutes: 30,
              message: 'Identity verified successfully. You may now draft and submit the citizen’s application using this verification token.',
            }),
          },
        ],
      };
    }
  );

  /* -------------------------------------------------------------------------
   * Tool 6: validate_application_draft
   * Validates form fields without committing, explaining errors clearly.
   * ------------------------------------------------------------------------- */
  server.tool(
    'validate_application_draft',
    'Validate a complete or partial application draft against official eligibility rules (age, block, bank, document) and receive structured feedback.',
    {
      applicant_name: z.string().min(1, 'Applicant name is required'),
      dob: z.string().min(1, 'Date of birth is required (DD/MM/YYYY or YYYY-MM-DD)'),
      gender: z.enum(['Male', 'Female', 'Other']),
      marital_status: z.enum(['Married', 'Unmarried', 'Widowed']),
      husband_name: z.string().optional(),
      husband_employer: z.string().optional(),
      village: z.string().min(1, 'Village or town is required'),
      block: z.string().min(1, 'Block is required'),
      bank_account: z.string().min(1, 'Bank account is required'),
      ifsc: z.string().min(1, 'IFSC code is required'),
      mobile: z.string().regex(/^\d{10}$/, 'Must be a valid 10-digit contact mobile number'),
      doc_name: z.string().optional(),
      doc_size: z.number().optional(),
    },
    async (draft) => {
      const validation = validateApplicationDraft(draft);
      const parsedDob = parseDateOfBirth(draft.dob);
      const age = parsedDob ? calculateAgeFromDate(parsedDob) : null;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                valid: validation.valid,
                errors: validation.errors,
                calculated_age: age,
                eligible_by_age: age !== null ? age >= MIN_AGE : false,
                supported_block: SUPPORTED_BLOCKS.includes(draft.block as any),
                summary: validation.valid
                  ? 'All application details satisfy the statutory requirements. You may present this summary to the citizen for final confirmation.'
                  : `Validation failed with ${validation.errors.length} issue(s). Please ask the citizen to clarify the flagged fields.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  /* -------------------------------------------------------------------------
   * Tool 7: submit_application
   * Submits official application through the authoritative service.
   * Requires valid verification token and explicit citizen consent.
   * ------------------------------------------------------------------------- */
  server.tool(
    'submit_application',
    'Submit the finalized pension application to the official Purvanchal Government portal. Requires explicit citizen confirmation.',
    {
      verification_token: z.string().min(1, 'A valid verification_token is required'),
      consent_agreed: z.boolean().refine(val => val === true, {
        message: 'Explicit citizen consent to the statutory declaration is mandatory.',
      }),
      draft: z.object({
        applicant_name: z.string().min(1),
        dob: z.string().min(1),
        gender: z.string(),
        marital_status: z.string(),
        husband_name: z.string().optional(),
        husband_employer: z.string().optional(),
        village: z.string().min(1),
        block: z.string().min(1),
        bank_account: z.string().min(1),
        ifsc: z.string().min(1),
        mobile: z.string().optional(),
        email: z.string().optional(),
        doc_name: z.string().default('age_proof.pdf'),
        doc_size: z.number().default(204800),
      }),
    },
    async ({ verification_token, consent_agreed, draft }) => {
      // 1. Validate identity token
      const tokenCheck = tokenManager.verifyToken(verification_token);
      if (!tokenCheck.valid || (!tokenCheck.mobile && !tokenCheck.email)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'UNAUTHORIZED',
                message: tokenCheck.error || 'Authentication failed: invalid or expired verification token.',
              }),
            },
          ],
        };
      }

      const boundIdentity = tokenCheck.mobile || tokenCheck.email!;
      const submissionDraft = {
        ...draft,
        mobile: tokenCheck.mobile || draft.mobile,
      };

      // 2. Call authoritative submission service
      const createRes = store.createApplication(boundIdentity, submissionDraft as any);
      if (!createRes.success || !createRes.application) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'SUBMISSION_REJECTED',
                message: createRes.error || 'Application rejected by official backend validation.',
              }),
            },
          ],
        };
      }

      // 3. Invalidate/consume token to prevent duplicate submissions
      tokenManager.consumeToken(verification_token);

      const app = createRes.application;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'confirmed',
                confirmed: true,
                application_no: app.application_no,
                application_id: app.id,
                applicant_name: app.applicant_name,
                email: app.email,
                mobile: app.mobile,
                official_status: app.status,
                submitted_at: app.submitted_at,
                statutory_sla_days: SLA_DAYS,
                tracking_instructions: `The citizen can track status on the portal using their mobile number and OTP. An acknowledgment SMS has been dispatched to ${app.mobile}.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  /* -------------------------------------------------------------------------
   * Tool 8: get_my_application_status
   * Retrieves official application status. Requires mobile + DOB password OR verification token.
   * Strictly prevents IDOR and cross-citizen privacy leakage.
   * ------------------------------------------------------------------------- */
  server.tool(
    'get_my_application_status',
    'Check official application status for an authenticated citizen using mobile or email. Prohibits cross-citizen lookups.',
    {
      mobile: z.string().optional().describe('Citizen 10-digit mobile number'),
      email: z.string().optional().describe('Citizen email address (optional/legacy)'),
      password_dob: z.string().optional().describe('Citizen password: Date of Birth as DDMMYYYY (e.g., 12041955)'),
      verification_token: z.string().optional().describe('Active verified token from verify_mobile_otp or verify_email_otp'),
      otp_code: z.string().optional().describe('Active 6-digit OTP code to verify mobile access'),
    },
    async ({ mobile, email, password_dob, verification_token, otp_code }) => {
      let isAuthorized = false;
      let targetMobile = mobile ? normalizeIndianMobile(mobile) : null;
      let targetEmail = email ? email.trim().toLowerCase() : null;

      // Authenticate via token
      if (verification_token) {
        const tokenCheck = tokenManager.verifyToken(verification_token);
        if (tokenCheck.valid) {
          if (tokenCheck.mobile && (!targetMobile || targetMobile === tokenCheck.mobile)) {
            targetMobile = tokenCheck.mobile;
            isAuthorized = true;
          } else if (tokenCheck.email && (!targetEmail || targetEmail === tokenCheck.email)) {
            targetEmail = tokenCheck.email;
            isAuthorized = true;
          }
        }
      }

      // Authenticate via mobile OTP
      if (!isAuthorized && targetMobile && otp_code) {
        const verifyRes = store.verifyMobileOtp(targetMobile, otp_code);
        if (verifyRes.success) {
          isAuthorized = true;
        }
      }

      // Authenticate via legacy DOB password
      if (!isAuthorized && targetEmail && password_dob) {
        const authRes = store.verifyCitizenLogin(targetEmail, password_dob);
        if (authRes.success) {
          isAuthorized = true;
        }
      } else if (!isAuthorized && targetMobile && password_dob) {
        const app = store.getApplicationByMobile(targetMobile);
        if (app && formatDobForPassword(parseDateOfBirth(app.dob)!) === password_dob.trim()) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'AUTHENTICATION_REQUIRED',
                message: 'Access denied: Please provide a verified session token or OTP verification code to access your application status.',
              }),
            },
          ],
        };
      }

      // Fetch official application belonging to the verified identity
      const app = targetMobile ? store.getApplicationByMobile(targetMobile) : (targetEmail ? store.getApplicationByEmail(targetEmail) : undefined);
      if (!app) {
        const identifierStr = targetMobile || targetEmail || 'provided credentials';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'no_application',
                message: `No application record found for ${identifierStr}. You can help the citizen submit a new application.`,
              }),
            },
          ],
        };
      }

      // Return status with masked bank details for privacy
      const last4 = app.bank_account.slice(-4);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'found',
                application_no: app.application_no,
                applicant_name: app.applicant_name,
                official_status: app.status,
                village: app.village,
                block: app.block,
                bank_account_masked: `•••• •••• ${last4}`,
                ifsc: app.ifsc,
                submitted_at: app.submitted_at,
                decided_at: app.decided_at || null,
                decided_by: app.decided_by || null,
                statutory_sla_days: SLA_DAYS,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}
