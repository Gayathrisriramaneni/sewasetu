import React, { useState } from 'react';
import { store } from '../data/store';
import { Application } from '../types';
import { downloadAcknowledgmentPdf } from '../utils/pdfGenerator';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileDown,
  Check,
  X,
  FileText,
  Eye,
  Download,
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { RejectionModal } from '../components/RejectionModal';
import {
  getDocumentDisplayUrl,
  triggerDocumentDownload,
  isPdfDocument,
  isImageDocument,
} from '../utils/documentViewerHelper';

interface AdminDetailViewProps {
  appId: number;
  navigate: (route: string) => void;
}

export const AdminDetailView: React.FC<AdminDetailViewProps> = ({
  appId,
  navigate,
}) => {
  const [app, setApp] = useState<Application | undefined>(() => store.getApplicationById(appId));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);

  if (!app) {
    return (
      <div className="space-y-4">
        <div className="text-red-700 font-bold">Application not found (ID #{appId}).</div>
        <button
          onClick={() => navigate('/admin/applications')}
          className="btn-gov"
        >
          Back to List
        </button>
      </div>
    );
  }

  const handleApprove = () => {
    const res = store.approveApplication(app.id, 'officer_admin', true);
    if (!res.success) {
      alert(res.error || "Approval failed");
      return;
    }
    const updated = store.getApplicationById(app.id);
    setApp(updated);
    setFeedback(`Application ${app.application_no} has been APPROVED by authorized officer. Applicant notified via SMS.`);
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          onClick={() => navigate('/admin/applications')}
          className="text-[#0b3d6e] hover:underline flex items-center gap-1 text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to list</span>
        </button>
      </div>

      <h2 className="text-2xl font-bold text-[#0b3d6e]">
        Application {app.application_no}
      </h2>

      {feedback && (
        <div className="success-msg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="border border-slate-300 rounded overflow-hidden max-w-[640px]">
        <table className="tbl">
          <tbody>
            <tr>
              <th className="w-1/3 bg-slate-100 text-slate-700 font-semibold">Applicant Name</th>
              <td className="font-medium text-slate-900">{app.applicant_name}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Mobile</th>
              <td className="font-mono">{app.mobile}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Date of Birth</th>
              <td>{app.dob}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Gender</th>
              <td>{app.gender}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Marital Status</th>
              <td>
                {app.marital_status}
                {app.husband_name && ` (Husband: ${app.husband_name}, Emp: ${app.husband_employer})`}
              </td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Village</th>
              <td>{app.village}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Block</th>
              <td>{app.block}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Bank Account</th>
              <td className="font-mono">{app.bank_account}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">IFSC</th>
              <td className="font-mono">{app.ifsc}</td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Document</th>
              <td>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate max-w-[200px]" title={app.doc_name || 'document.pdf'}>
                      {app.doc_name || 'document.pdf'}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsDocModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0b3d6e] hover:bg-[#082a4d] text-white rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                    title="Open Document in Viewer Modal"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerDocumentDownload({
                      docName: app.doc_name,
                      docData: app.doc_data,
                      docSize: app.doc_size,
                      applicantName: app.applicant_name,
                      applicationNo: app.application_no,
                      dob: app.dob,
                      village: app.village,
                      block: app.block,
                    })}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-medium cursor-pointer transition-colors"
                    title="Download original document file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Status</th>
              <td>
                <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                  app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                  app.status === 'DEEMED_APPROVED' ? 'bg-teal-100 text-teal-800' :
                  app.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                  'bg-amber-100 text-amber-900'
                }`}>
                  {app.status}
                </span>
              </td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Submitted</th>
              <td className="text-xs text-slate-700">
                {new Date(app.submitted_at).toLocaleString()}
              </td>
            </tr>
            <tr>
              <th className="bg-slate-100 text-slate-700 font-semibold">Decided</th>
              <td className="text-xs text-slate-700">
                {app.decided_at ? (
                  <span>
                    {new Date(app.decided_at).toLocaleString()}{' '}
                    {app.decided_by && `(${app.decided_by})`}
                  </span>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {app.status === 'REJECTED' && app.decision_reason && (
        <div className="border border-red-300 rounded-lg overflow-hidden max-w-[640px] bg-red-50 shadow-sm p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-800 font-bold text-xs uppercase tracking-wide">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Statutory Rejection Reason / Justification</span>
          </div>
          <p className="text-xs text-red-900 bg-white p-3 rounded border border-red-200 leading-relaxed font-medium">
            "{app.decision_reason}"
          </p>
          <div className="text-[11px] text-red-700 flex items-center justify-between pt-1">
            <span>Decided by: <strong>{app.decided_by || 'Department Officer'}</strong></span>
            <span>{app.decided_at ? new Date(app.decided_at).toLocaleString() : ''}</span>
          </div>
        </div>
      )}

      {/* Inline Document Inspection & Verification Card for Officers */}
      <div className="border border-slate-300 rounded-lg overflow-hidden max-w-[640px] bg-white shadow-sm">
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0b3d6e]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Document Verification &amp; Age Proof
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="text-xs text-[#0b3d6e] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open Fullscreen Viewer</span>
          </button>
        </div>

        <div className="p-4 bg-slate-50 flex flex-col sm:flex-row items-center gap-4">
          <div
            onClick={() => setIsDocModalOpen(true)}
            className="group relative w-36 h-48 bg-white rounded border border-slate-300 shadow-sm overflow-hidden flex items-center justify-center cursor-pointer shrink-0 hover:border-[#0b3d6e] transition-all"
            title="Click to expand document"
          >
            {isPdfDocument(app.doc_name, app.doc_data) && app.doc_data && app.doc_data.startsWith('data:application/pdf') ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-red-50/40">
                <FileText className="w-10 h-10 text-red-600 mb-1" />
                <span className="text-[10px] font-bold text-slate-700 uppercase">PDF Document</span>
                <span className="text-[9px] text-slate-500 line-clamp-2 mt-1 px-1">
                  {app.doc_name || 'document.pdf'}
                </span>
              </div>
            ) : (
              <img
                src={getDocumentDisplayUrl({
                  docName: app.doc_name,
                  docData: app.doc_data,
                  applicantName: app.applicant_name,
                  applicationNo: app.application_no,
                  dob: app.dob,
                  village: app.village,
                  block: app.block,
                })}
                alt="Document preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.startsWith('data:image/svg+xml')) {
                    target.src = getDocumentDisplayUrl({
                      docName: app.doc_name,
                      applicantName: app.applicant_name,
                      applicationNo: app.application_no,
                      dob: app.dob,
                      village: app.village,
                      block: app.block,
                    });
                  }
                }}
              />
            )}
            <div className="absolute inset-0 bg-[#0b3d6e]/70 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity text-xs font-semibold">
              <Eye className="w-5 h-5" />
              <span>Inspect</span>
            </div>
          </div>

          <div className="flex-1 text-xs text-slate-700 space-y-2">
            <div className="font-semibold text-slate-900 text-sm">
              {app.doc_name || 'Age Proof Document'}
            </div>
            <p className="text-slate-600 leading-relaxed">
              Uploaded as age proof for applicant <strong>{app.applicant_name}</strong> (DOB: <strong>{app.dob}</strong>). Verify birth year matches eligibility criteria (minimum 60 years) before granting statutory approval.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDocModalOpen(true)}
                className="btn-gov btn-secondary text-xs px-2.5 py-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Examine Document</span>
              </button>
              <button
                type="button"
                onClick={() => triggerDocumentDownload({
                  docName: app.doc_name,
                  docData: app.doc_data,
                  docSize: app.doc_size,
                  applicantName: app.applicant_name,
                  applicationNo: app.application_no,
                  dob: app.dob,
                  village: app.village,
                  block: app.block,
                })}
                className="text-xs text-[#0b3d6e] hover:underline flex items-center gap-1 px-2 py-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save to Disk</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons for PENDING applications */}
      {app.status === 'PENDING' && (
        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleApprove}
            className="btn-gov btn-success"
          >
            <Check className="w-4 h-4" />
            <span>Approve</span>
          </button>

          <button
            onClick={handleRejectClick}
            className="btn-gov btn-danger"
          >
            <X className="w-4 h-4" />
            <span>Reject</span>
          </button>
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={() => downloadAcknowledgmentPdf(app)}
          className="text-xs text-[#0b3d6e] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Download Acknowledgment Receipt (PDF)</span>
        </button>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        docInfo={{
          docName: app.doc_name,
          docData: app.doc_data,
          docSize: app.doc_size,
          applicantName: app.applicant_name,
          applicationNo: app.application_no,
          dob: app.dob,
          village: app.village,
          block: app.block,
        }}
      />

      {/* Rejection Reason Modal */}
      <RejectionModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        appId={app.id}
        applicationNo={app.application_no}
        onSuccess={(reason) => {
          const updated = store.getApplicationById(app.id);
          setApp(updated);
          setFeedback(`Application ${app.application_no} has been REJECTED by authorized officer. Reason: ${reason}. Applicant notified via SMS.`);
        }}
      />
    </div>
  );
};
