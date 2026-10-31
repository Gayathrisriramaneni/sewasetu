import React, { useState } from 'react';
import { store, SLA_DAYS } from '../data/store';
import { Application } from '../types';
import { Play, CheckCircle2, AlertTriangle, ArrowRight, LogOut, Clock, Layers, Building } from 'lucide-react';

interface AdminDashboardViewProps {
  navigate: (route: string) => void;
  onLogout: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  navigate,
  onLogout,
}) => {
  const applications = store.getApplications();
  const [deemedResult, setDeemedResult] = useState<{ count: number; approved: Application[] } | null>(null);

  // Status counts
  const statusCounts: Record<string, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    DEEMED_APPROVED: 0,
  };

  applications.forEach(app => {
    if (statusCounts[app.status] !== undefined) {
      statusCounts[app.status]++;
    } else {
      statusCounts[app.status] = 1;
    }
  });

  // Overdue calculation (pending beyond SLA_DAYS)
  const cutoffTime = Date.now() - SLA_DAYS * 24 * 60 * 60 * 1000;
  const overdueCount = applications.filter(
    app => app.status === 'PENDING' && new Date(app.submitted_at).getTime() < cutoffTime
  ).length;

  // Pending by block
  const pendingByBlock: Record<string, number> = {};
  applications
    .filter(app => app.status === 'PENDING')
    .forEach(app => {
      pendingByBlock[app.block] = (pendingByBlock[app.block] || 0) + 1;
    });

  const sortedPendingBlocks = Object.entries(pendingByBlock).sort((a, b) => b[1] - a[1]);

  const handleRunDeemedApproval = () => {
    const res = store.runDeemedApproval();
    setDeemedResult(res);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
        <div>
          <h2 className="text-2xl font-bold text-[#0b3d6e] m-0">Dashboard</h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Department of Social Welfare &middot; Purvanchal RTPS Monitoring
          </div>
        </div>

        <button
          onClick={onLogout}
          className="text-xs text-slate-600 hover:text-red-700 flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 rounded cursor-pointer self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Navigation Quick Links matching original */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2.5 border border-slate-200 rounded">
        <span className="font-semibold text-xs uppercase tracking-wide text-slate-500">Filter Applications:</span>
        <button
          onClick={() => navigate('/admin/applications?status=PENDING')}
          className="text-[#0b3d6e] hover:underline font-semibold cursor-pointer"
        >
          Pending ({statusCounts.PENDING || 0})
        </button>
        <span>|</span>
        <button
          onClick={() => navigate('/admin/applications?status=APPROVED')}
          className="text-[#0b3d6e] hover:underline font-semibold cursor-pointer"
        >
          Approved ({statusCounts.APPROVED || 0})
        </button>
        <span>|</span>
        <button
          onClick={() => navigate('/admin/applications?status=REJECTED')}
          className="text-[#0b3d6e] hover:underline font-semibold cursor-pointer"
        >
          Rejected ({statusCounts.REJECTED || 0})
        </button>
        <span>|</span>
        <button
          onClick={() => navigate('/admin/applications?status=DEEMED_APPROVED')}
          className="text-[#0b3d6e] hover:underline font-semibold cursor-pointer"
        >
          Deemed Approved ({statusCounts.DEEMED_APPROVED || 0})
        </button>
      </div>

      {/* Deemed Approval result banner */}
      {deemedResult && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded text-sm text-emerald-900 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>
              Nightly Deemed Approval Executed: {deemedResult.count} application{deemedResult.count === 1 ? '' : 's'} approved under RTPS Act.
            </span>
          </div>
          {deemedResult.approved.length > 0 && (
            <div className="text-xs text-emerald-800">
              Updated: {deemedResult.approved.map(a => `${a.application_no} (${a.applicant_name})`).join(', ')}.
              SMS confirmations dispatched to applicants.
            </div>
          )}
        </div>
      )}

      {/* SLA Alert Callout */}
      <div className="bg-red-50 border-l-4 border-[#a33] p-4 rounded-r flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#a33] m-0 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Pending beyond {SLA_DAYS}-day SLA: {overdueCount}</span>
          </h3>
          <p className="text-xs text-red-800 mt-1 m-0">
            Under the Purvanchal Right to Public Services Act, applications unresolved beyond {SLA_DAYS} days are eligible for statutory deemed approval.
          </p>
        </div>

        {overdueCount > 0 && (
          <button
            onClick={handleRunDeemedApproval}
            className="bg-[#0b3d6e] hover:bg-[#0d4a85] text-white text-xs font-semibold px-4 py-2 rounded flex items-center gap-2 cursor-pointer shrink-0 shadow-sm transition-colors"
            title="Execute deemed approval script (deemed_approval.py)"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Execute Deemed Approval Batch</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Applications by Status */}
        <div>
          <h3 className="text-base font-bold text-[#0b3d6e] mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <span>Applications by Status</span>
          </h3>
          <table className="tbl">
            <tbody>
              {Object.entries(statusCounts).map(([status, count]) => (
                <tr key={status}>
                  <td className="font-medium text-slate-800">
                    <button
                      onClick={() => navigate(`/admin/applications?status=${status}`)}
                      className="text-[#0b3d6e] hover:underline cursor-pointer"
                    >
                      {status}
                    </button>
                  </td>
                  <td className="text-right font-mono font-bold text-slate-900 w-24">
                    {count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pending by Block */}
        <div>
          <h3 className="text-base font-bold text-[#0b3d6e] mb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-600" />
            <span>Pending by Block</span>
          </h3>
          <table className="tbl">
            <tbody>
              {sortedPendingBlocks.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-slate-500 text-xs text-center py-4">
                    No applications currently pending across blocks.
                  </td>
                </tr>
              ) : (
                sortedPendingBlocks.map(([block, count]) => (
                  <tr key={block}>
                    <td className="font-medium text-slate-800">{block}</td>
                    <td className="text-right font-mono font-bold text-slate-900 w-24">
                      {count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
