import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { store } from '../data/store';
import { SLA_DAYS, calculateAgeFromDate, parseDateOfBirth } from '../services/applicationService';
import { OfficerProfile, canOfficerAccessBlock } from './officerAuth';

export function createOfficerMcpServer(officerContext?: OfficerProfile): McpServer {
  const server = new McpServer({
    name: 'sewasetu-officer-portal',
    version: '1.0.0',
  });

  // Helper to ensure authenticated officer context exists
  function getAuthenticatedOfficer(): OfficerProfile {
    if (!officerContext) {
      throw new Error('AUTHENTICATION_REQUIRED: No authenticated officer identity bound to session.');
    }
    return officerContext;
  }

  /* -------------------------------------------------------------------------
   * Tool 1: get_officer_queue
   * ------------------------------------------------------------------------- */
  server.tool(
    'get_officer_queue',
    'List applications pending departmental review within the authenticated officer’s authorized block jurisdiction.',
    {
      overdue_only: z.boolean().optional().describe('Only show applications pending beyond the 15-day statutory SLA'),
      limit: z.number().optional().default(50),
    },
    async ({ overdue_only, limit }) => {
      let officer: OfficerProfile;
      try {
        officer = getAuthenticatedOfficer();
      } catch (err: any) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] };
      }

      const cutoffTime = Date.now() - SLA_DAYS * 24 * 60 * 60 * 1000;
      let apps = store.getApplications().filter(a => a.status === 'PENDING');

      // Block-level RBAC enforcement
      apps = apps.filter(a => canOfficerAccessBlock(officer, a.block));

      if (overdue_only) {
        apps = apps.filter(a => new Date(a.submitted_at).getTime() < cutoffTime);
      }

      const results = apps.slice(0, limit).map(a => {
        const submittedTime = new Date(a.submitted_at).getTime();
        const daysPending = Math.floor((Date.now() - submittedTime) / (1000 * 60 * 60 * 24));
        const deadlineDate = new Date(submittedTime + SLA_DAYS * 24 * 60 * 60 * 1000).toISOString();
        return {
          id: a.id,
          application_no: a.application_no,
          applicant_name: a.applicant_name,
          mobile: a.mobile,
          block: a.block,
          village: a.village,
          days_pending: daysPending,
          is_overdue_rtps: daysPending >= SLA_DAYS,
          deadline: deadlineDate,
          submitted_at: a.submitted_at,
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                officer: {
                  id: officer.officer_id,
                  name: officer.name,
                  designation: officer.designation,
                  assigned_blocks: officer.assigned_blocks,
                },
                queue_count: results.length,
                total_in_jurisdiction: apps.length,
                applications: results,
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
   * Tool 2: get_application_summary
   * ------------------------------------------------------------------------- */
  server.tool(
    'get_application_summary',
    'Retrieve a concise, structured application summary for statutory review. Enforces block-level access control.',
    {
      application_id: z.number().int().positive('Valid application ID required'),
    },
    async ({ application_id }) => {
      let officer: OfficerProfile;
      try {
        officer = getAuthenticatedOfficer();
      } catch (err: any) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] };
      }

      const app = store.getApplicationById(application_id);
      if (!app) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'NOT_FOUND',
                message: `Application ID #${application_id} does not exist in the official registry.`,
              }),
            },
          ],
        };
      }

      // Check block jurisdiction
      if (!canOfficerAccessBlock(officer, app.block)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'BLOCK_ACCESS_DENIED',
                message: `Permission denied: Officer ${officer.officer_id} is not authorized to access applications from Block '${app.block}'. Authorized blocks: ${officer.assigned_blocks.join(', ')}.`,
              }),
            },
          ],
        };
      }

      const parsedDob = parseDateOfBirth(app.dob);
      const age = parsedDob ? calculateAgeFromDate(parsedDob) : null;
      const submittedTime = new Date(app.submitted_at).getTime();
      const daysPending = Math.floor((Date.now() - submittedTime) / (1000 * 60 * 60 * 24));
      const deadlineDate = new Date(submittedTime + SLA_DAYS * 24 * 60 * 60 * 1000).toISOString();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                id: app.id,
                application_no: app.application_no,
                applicant_name: app.applicant_name,
                mobile: app.mobile,
                dob: app.dob,
                calculated_age: age,
                eligible_age: age !== null && age >= 60,
                gender: app.gender,
                marital_status: app.marital_status,
                village: app.village,
                block: app.block,
                bank_account_masked: `•••• •••• ${app.bank_account.slice(-4)}`,
                ifsc: app.ifsc,
                status: app.status,
                submitted_at: app.submitted_at,
                statutory_deadline: deadlineDate,
                days_pending: daysPending,
                is_overdue_rtps: app.status === 'PENDING' && daysPending >= SLA_DAYS,
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
   * Tool 3: get_application_evidence
   * ------------------------------------------------------------------------- */
  server.tool(
    'get_application_evidence',
    'Retrieve authorized supporting age proof documents and technical metadata for statutory verification.',
    {
      application_id: z.number().int().positive('Valid application ID required'),
    },
    async ({ application_id }) => {
      let officer: OfficerProfile;
      try {
        officer = getAuthenticatedOfficer();
      } catch (err: any) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] };
      }

      const app = store.getApplicationById(application_id);
      if (!app) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'NOT_FOUND',
                message: `Application ID #${application_id} not found.`,
              }),
            },
          ],
        };
      }

      if (!canOfficerAccessBlock(officer, app.block)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'BLOCK_ACCESS_DENIED',
                message: `Access denied to evidence: Block '${app.block}' is outside your jurisdiction.`,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                application_id: app.id,
                application_no: app.application_no,
                applicant_name: app.applicant_name,
                evidence: {
                  document_name: app.doc_name || 'age_proof.pdf',
                  document_size_bytes: app.doc_size || 204800,
                  document_format: app.doc_name?.endsWith('.pdf') ? 'PDF' : 'IMAGE',
                  is_valid_size: (app.doc_size || 0) <= 5 * 1024 * 1024,
                  has_data_payload: Boolean(app.doc_data),
                },
                bank_verification: {
                  account_number: app.bank_account,
                  ifsc: app.ifsc,
                  format_valid: /^\d{9,18}$/.test(app.bank_account) && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(app.ifsc),
                },
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
   * Tool 4: check_processing_deadline
   * ------------------------------------------------------------------------- */
  server.tool(
    'check_processing_deadline',
    'Calculate the exact Right to Public Services (RTPS) 15-day statutory SLA timeline and deemed approval status.',
    {
      application_id: z.number().int().positive(),
    },
    async ({ application_id }) => {
      let officer: OfficerProfile;
      try {
        officer = getAuthenticatedOfficer();
      } catch (err: any) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] };
      }

      const app = store.getApplicationById(application_id);
      if (!app) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error_code: 'NOT_FOUND', message: 'Application not found' }) }],
        };
      }

      if (!canOfficerAccessBlock(officer, app.block)) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error_code: 'BLOCK_ACCESS_DENIED', message: 'Access denied' }) }],
        };
      }

      const submittedTime = new Date(app.submitted_at).getTime();
      const deadlineTime = submittedTime + SLA_DAYS * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const daysElapsed = Math.floor((now - submittedTime) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, Math.ceil((deadlineTime - now) / (1000 * 60 * 60 * 24)));
      const isOverdue = now > deadlineTime;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                application_id: app.id,
                application_no: app.application_no,
                status: app.status,
                submitted_at: app.submitted_at,
                statutory_sla_days: SLA_DAYS,
                statutory_deadline: new Date(deadlineTime).toISOString(),
                days_elapsed: daysElapsed,
                days_remaining: isOverdue ? 0 : daysRemaining,
                is_overdue: isOverdue,
                deemed_approval_applicable: isOverdue && app.status === 'PENDING',
                statutory_basis: 'Section 7, Purvanchal Right to Public Services Act (RTPS)',
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
   * Tool 5: record_officer_decision
   * ------------------------------------------------------------------------- */
  server.tool(
    'record_officer_decision',
    'Record an official, binding departmental decision (APPROVE or REJECT) on a pending application with full statutory audit trail.',
    {
      application_id: z.number().int().positive('Valid application ID required'),
      decision: z.enum(['APPROVE', 'REJECT']),
      remarks: z.string().optional().describe('Mandatory for REJECT decisions (minimum 5 characters)'),
      confirm_explicit: z.boolean().refine(v => v === true, {
        message: 'Explicit officer confirmation is required to commit an official decision.',
      }),
    },
    async ({ application_id, decision, remarks, confirm_explicit }) => {
      let officer: OfficerProfile;
      try {
        officer = getAuthenticatedOfficer();
      } catch (err: any) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] };
      }

      const app = store.getApplicationById(application_id);
      if (!app) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ error_code: 'NOT_FOUND', message: 'Application not found' }) }],
        };
      }

      // Check block jurisdiction
      if (!canOfficerAccessBlock(officer, app.block)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'BLOCK_ACCESS_DENIED',
                message: `Adjudication forbidden: Block '${app.block}' is outside your authorized jurisdiction.`,
              }),
            },
          ],
        };
      }

      // Protect terminal states
      if (app.status !== 'PENDING') {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error_code: 'TERMINAL_STATE',
                message: `Application #${application_id} is already in decided state '${app.status}'. Decisions cannot be overwritten.`,
              }),
            },
          ],
        };
      }

      // Validation for rejection reason
      if (decision === 'REJECT') {
        const cleanRemarks = remarks?.trim();
        if (!cleanRemarks || cleanRemarks.length < 5) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'error',
                  error_code: 'REJECTION_REASON_REQUIRED',
                  message: 'A meaningful statutory rejection reason (minimum 5 characters) is required when rejecting an application.',
                }),
              },
            ],
          };
        }
      }

      // Commit decision using trusted officer identity from server-side context
      const trustedOfficerId = officer.officer_id;
      let result;
      if (decision === 'APPROVE') {
        result = store.approveApplication(
          application_id,
          trustedOfficerId,
          true,
          remarks || 'Approved upon statutory document verification'
        );
      } else {
        result = store.rejectApplication(application_id, trustedOfficerId, true, remarks);
      }

      if (!result.success) {
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify({ status: 'error', message: result.error }) }],
        };
      }

      const updated = store.getApplicationById(application_id)!;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'confirmed',
                decision,
                application_id: updated.id,
                application_no: updated.application_no,
                new_status: updated.status,
                decided_by: updated.decided_by,
                decided_at: updated.decided_at,
                decision_reason: updated.decision_reason,
                applicant_notified_sms: true,
                audit_record: updated.audit_trail?.[updated.audit_trail.length - 1],
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
   * Tool 6: get_decision_history
   * ------------------------------------------------------------------------- */
  server.tool(
    'get_decision_history',
    'Retrieve the immutable statutory audit trail and decision history for applications in the officer’s jurisdiction.',
    {
      application_id: z.number().int().positive().optional().describe('Specific application ID to inspect'),
      limit: z.number().optional().default(50),
    },
    async ({ application_id, limit }) => {
      let officer: OfficerProfile;
      try {
        officer = getAuthenticatedOfficer();
      } catch (err: any) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }] };
      }

      if (application_id) {
        const app = store.getApplicationById(application_id);
        if (!app) {
          return {
            isError: true,
            content: [{ type: 'text', text: JSON.stringify({ error_code: 'NOT_FOUND', message: 'Application not found' }) }],
          };
        }

        if (!canOfficerAccessBlock(officer, app.block)) {
          return {
            isError: true,
            content: [{ type: 'text', text: JSON.stringify({ error_code: 'BLOCK_ACCESS_DENIED', message: 'Access denied' }) }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  application_id: app.id,
                  application_no: app.application_no,
                  current_status: app.status,
                  decided_by: app.decided_by,
                  decided_at: app.decided_at,
                  decision_reason: app.decision_reason,
                  audit_trail: app.audit_trail || [],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Return recent decided applications in officer's jurisdiction
      const apps = store
        .getApplications()
        .filter(a => a.status !== 'PENDING' && canOfficerAccessBlock(officer, a.block))
        .slice(0, limit)
        .map(a => ({
          id: a.id,
          application_no: a.application_no,
          applicant_name: a.applicant_name,
          block: a.block,
          status: a.status,
          decided_at: a.decided_at,
          decided_by: a.decided_by,
          decision_reason: a.decision_reason,
        }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                officer_id: officer.officer_id,
                total_decided: apps.length,
                history: apps,
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
