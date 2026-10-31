import React, { useState } from 'react';
import { Application } from '../types';
import { downloadAcknowledgmentPdf } from '../utils/pdfGenerator';
import { FileDown, ArrowLeft, LogOut, CheckCircle, Clock, XCircle, AlertTriangle, Eye, EyeOff, FileText, Download } from 'lucide-react';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { triggerDocumentDownload } from '../utils/documentViewerHelper';

interface ApplicationDetailViewProps {
  application: Application;
  onLogout: () => void;
  navigate: (route: string) => void;
}

export const ApplicationDetailView: React.FC<ApplicationDetailViewProps> = ({
  application,
  onLogout,
  navigate,
}) => {
  const [showFullAccount, setShowFullAccount] = useState<boolean>(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
            <CheckCircle className="w-3.5 h-3.5" />
            APPROVED
          </span>
        );
      case 'DEEMED_APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-100 text-teal-800 font-bold text-xs">
            <CheckCircle className="w-3.5 h-3.5" />
            DEEMED APPROVED (RTPS ACT)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-100 text-red-800 font-bold text-xs">
            <XCircle className="w-3.5 h-3.5" />
            REJECTED
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-bold text-xs">
            <Clock className="w-3.5 h-3.5" />
            PENDING VERIFICATION
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
        <h2 className="text-2xl font-bold text-[#0b3d6e] m-0">
          Application Status
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="text-xs text-slate-600 hover:text-red-700 flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 rounded cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="border border-slate-300 rounded overflow-hidden max-w-[640px]">
        <table className="tbl">
          <tbody>
            <tr>
              <th className="w-1/3 bg-slate-100 text-slate-700 font-semibold">Application No</th>
              <td className="font-mono font-bold text-[#0b3d6e]">{application.application_no}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Applicant Name</th>
              <td className="font-medium text-slate-900">{application.applicant_name}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Mobile</th>
              <td className="font-mono">{application.mobile}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Date of Birth</th>
              <td>{application.dob}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Village</th>
              <td>{application.village}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Block</th>
              <td>{application.block}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Bank Account</th>
              <td className="font-mono">
                <div className="flex items-center justify-between">
                  <span>
                    {showFullAccount
                      ? application.bank_account
                      : application.bank_account && application.bank_account.length > 4
                      ? `•••• •••• ${application.bank_account.slice(-4)}`
                      : application.bank_account}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFullAccount(!showFullAccount)}
                    className="text-xs text-[#0b3d6e] hover:underline flex items-center gap-1 cursor-pointer font-sans"
                  >
                    {showFullAccount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showFullAccount ? 'Mask' : 'Reveal'}</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">IFSC</th>
              <td className="font-mono">{application.ifsc}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Age Proof Document</th>
              <td>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate max-w-[200px]" title={application.doc_name || 'document.pdf'}>
                      {application.doc_name || 'document.pdf'}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsDocModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0b3d6e] hover:bg-[#082a4d] text-white rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                    title="View uploaded document"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerDocumentDownload({
                      docName: application.doc_name,
                      docData: application.doc_data,
                      docSize: application.doc_size,
                      applicantName: application.applicant_name,
                      applicationNo: application.application_no,
                      dob: application.dob,
                      village: application.village,
                      block: application.block,
                    })}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium cursor-pointer transition-colors"
                    title="Download document file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Status</th>
              <td>{getStatusBadge(application.status)}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Submitted</th>
              <td className="text-xs text-slate-700">
                {new Date(application.submitted_at).toLocaleString()}
              </td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Decided</th>
              <td className="text-xs text-slate-700">
                {application.decided_at ? (
                  <span>
                    {new Date(application.decided_at).toLocaleString()}
                    {application.decided_by && ` (${application.decided_by})`}
                  </span>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {application.status === 'REJECTED' && application.decision_reason && (
        <div className="border border-red-300 rounded-lg overflow-hidden max-w-[640px] bg-red-50 shadow-sm p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-800 font-bold text-xs uppercase tracking-wide">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Statutory Rejection Reason / Justification</span>
          </div>
          <p className="text-xs text-red-900 bg-white p-3 rounded border border-red-200 leading-relaxed font-medium">
            "{application.decision_reason}"
          </p>
          <div className="text-[11px] text-red-700 flex items-center justify-between pt-1">
            <span>Decided by: <strong>{application.decided_by || 'Department Officer'}</strong></span>
            <span>{application.decided_at ? new Date(application.decided_at).toLocaleString() : ''}</span>
          </div>
        </div>
      )}

      <div className="pt-2 flex flex-wrap items-center gap-3">
        <button
          onClick={() => downloadAcknowledgmentPdf(application)}
          className="btn-gov text-sm"
        >
          <FileDown className="w-4 h-4" />
          <span>Download Acknowledgment (PDF)</span>
        </button>

        <button
          onClick={() => navigate('/')}
          className="px-3.5 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Home
        </button>
      </div>

      {/* Document Viewer Modal for Citizen */}
      <DocumentViewerModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        docInfo={{
          docName: application.doc_name,
          docData: application.doc_data,
          docSize: application.doc_size,
          applicantName: application.applicant_name,
          applicationNo: application.application_no,
          dob: application.dob,
          village: application.village,
          block: application.block,
        }}
      />
    </div>
  );
};
