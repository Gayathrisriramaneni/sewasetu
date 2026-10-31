import React, { useState } from 'react';
import { store } from '../data/store';
import { Application } from '../types';
import { downloadAcknowledgmentPdf } from '../utils/pdfGenerator';
import { ArrowLeft, CheckCircle, XCircle, FileDown, Check, X, FileText } from 'lucide-react';

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

  const handleReject = () => {
    const res = store.rejectApplication(app.id, 'officer_admin', true);
    if (!res.success) {
      alert(res.error || "Rejection failed");
      return;
    }
    const updated = store.getApplicationById(app.id);
    setApp(updated);
    setFeedback(`Application ${app.application_no} has been REJECTED by authorized officer. Applicant notified via SMS.`);
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
                <span className="flex items-center gap-1.5 text-xs text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>{app.doc_name || 'document.pdf'}</span>
                </span>
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
            onClick={handleReject}
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
    </div>
  );
};
