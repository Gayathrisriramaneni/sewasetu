import React, { useState } from 'react';
import { Application } from '../types';
import { downloadAcknowledgmentPdf } from '../utils/pdfGenerator';
import { FileDown, ArrowLeft, LogOut, CheckCircle, Clock, XCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';

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
    </div>
  );
};
