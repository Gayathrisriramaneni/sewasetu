import React from 'react';
import { store } from '../data/store';
import { downloadAcknowledgmentPdf } from '../utils/pdfGenerator';
import { FileDown, CheckCircle, ArrowRight, Home } from 'lucide-react';

interface ConfirmationViewProps {
  appNo: string;
  appId: number;
  navigate: (route: string) => void;
}

export const ConfirmationView: React.FC<ConfirmationViewProps> = ({
  appNo,
  appId,
  navigate,
}) => {
  const application = store.getApplicationById(appId);

  const handleDownloadPdf = () => {
    if (application) {
      downloadAcknowledgmentPdf(application);
    } else {
      alert("Application record not found.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
        <div>
          <h2 className="text-2xl font-bold text-[#0b3d6e] m-0">Application Submitted</h2>
          <p className="text-sm text-slate-700 mt-1 m-0">Your application has been received successfully.</p>
        </div>
      </div>

      <div className="border border-slate-300 rounded overflow-hidden max-w-[500px]">
        <table className="tbl">
          <tbody>
            <tr>
              <th className="w-1/2 bg-slate-100 font-semibold text-slate-700">Application Number</th>
              <td className="text-lg font-bold font-mono text-[#0b3d6e] bg-amber-50/50">
                {appNo}
              </td>
            </tr>
            {application && (
              <>
                <tr>
                  <th className="bg-slate-100 font-semibold text-slate-700">Applicant Name</th>
                  <td>{application.applicant_name}</td>
                </tr>
                <tr>
                  <th className="bg-slate-100 font-semibold text-slate-700">Mobile</th>
                  <td className="font-mono">{application.mobile}</td>
                </tr>
                <tr>
                  <th className="bg-slate-100 font-semibold text-slate-700">Date of Birth</th>
                  <td>{application.dob}</td>
                </tr>
                <tr>
                  <th className="bg-slate-100 font-semibold text-slate-700">Initial Status</th>
                  <td><span className="font-semibold text-amber-700">{application.status}</span></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50/70 border-l-4 border-[#0b3d6e] p-4 rounded-r text-sm text-slate-800 space-y-1">
        <p className="m-0 font-medium text-[#0b3d6e]">
          Please note down your Application Number.
        </p>
        <p className="m-0 text-xs text-slate-600">
          You can check your application status on the{' '}
          <button
            onClick={() => navigate('/status')}
            className="text-[#0b3d6e] font-semibold underline hover:text-[#0d4a85] cursor-pointer"
          >
            status portal
          </button>{' '}
          using your registered mobile number and secure OTP verification.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3">
        <button
          onClick={handleDownloadPdf}
          className="btn-gov text-sm px-5 py-2.5 shadow-sm"
        >
          <FileDown className="w-4 h-4" />
          <span>Download Acknowledgment (PDF)</span>
        </button>

        <button
          onClick={() => navigate('/status')}
          className="btn-gov btn-secondary text-sm px-4 py-2.5"
        >
          <span>Go to Status Portal</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 text-sm text-slate-700 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};
