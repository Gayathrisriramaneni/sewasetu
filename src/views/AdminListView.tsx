import React, { useState } from 'react';
import { store } from '../data/store';
import { Application, ApplicationStatus } from '../types';
import { ArrowLeft, Search, Filter } from 'lucide-react';

interface AdminListViewProps {
  initialStatus: string;
  navigate: (route: string) => void;
}

export const AdminListView: React.FC<AdminListViewProps> = ({
  initialStatus,
  navigate,
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>(initialStatus || 'PENDING');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  const allApplications = store.getApplications();

  // Filter by status and search query
  const filtered = allApplications.filter(app => {
    const matchesStatus = currentStatus === 'ALL' || app.status === currentStatus;
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (app.application_no || '').toLowerCase().includes(q) ||
      (app.applicant_name || '').toLowerCase().includes(q) ||
      (app.mobile || '').includes(q) ||
      (app.block || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'APPROVED': return 'text-emerald-700 bg-emerald-50';
      case 'DEEMED_APPROVED': return 'text-teal-700 bg-teal-50';
      case 'REJECTED': return 'text-red-700 bg-red-50';
      case 'PENDING':
      default: return 'text-amber-800 bg-amber-50';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-[#0b3d6e] hover:underline flex items-center gap-1 text-sm font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <span className="text-slate-300">|</span>
          <h2 className="text-xl font-bold text-[#0b3d6e] m-0">
            Applications &mdash; {currentStatus}
          </h2>
        </div>

        {/* Status quick pills */}
        <div className="flex items-center gap-1 text-xs">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DEEMED_APPROVED'].map(st => (
            <button
              key={st}
              onClick={() => {
                setCurrentStatus(st);
                setPage(1);
              }}
              className={`px-2 py-1 rounded cursor-pointer font-medium transition-colors ${
                currentStatus === st
                  ? 'bg-[#0b3d6e] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-[400px]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by App No, Name, Mobile..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-[#0b3d6e]"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-blue-700 hover:underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Applications Table */}
      <div className="overflow-x-auto border border-slate-200 rounded">
        <table className="tbl">
          <thead>
            <tr>
              <th className="w-12">ID</th>
              <th>Application No</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Block</th>
              <th>Status</th>
              <th>Submitted</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500 text-sm">
                  No applications found matching the criteria.
                </td>
              </tr>
            ) : (
              paginatedRows.map(app => (
                <tr key={app.id} className="hover:bg-slate-50">
                  <td className="font-mono text-xs text-slate-500">{app.id}</td>
                  <td className="font-mono font-bold text-[#0b3d6e] text-xs">
                    {app.application_no}
                  </td>
                  <td className="font-medium text-slate-900 text-xs sm:text-sm">
                    {app.applicant_name}
                  </td>
                  <td className="font-mono text-xs text-slate-700">{app.mobile}</td>
                  <td className="text-xs text-slate-700">{app.block}</td>
                  <td className="text-xs">
                    <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="text-[11px] text-slate-600">
                    {new Date(app.submitted_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      onClick={() => navigate(`/admin/application/${app.id}`)}
                      className="text-[#0b3d6e] hover:underline font-semibold text-xs cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls matching original */}
      <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
        <div>
          Showing {(currentPage - 1) * pageSize + (paginatedRows.length > 0 ? 1 : 0)} to{' '}
          {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
        </div>

        <div className="flex items-center gap-2">
          {currentPage > 1 && (
            <button
              onClick={() => setPage(currentPage - 1)}
              className="text-[#0b3d6e] hover:underline cursor-pointer font-medium"
            >
              &laquo; Previous
            </button>
          )}
          <span>Page {currentPage} of {totalPages}</span>
          {currentPage < totalPages && (
            <button
              onClick={() => setPage(currentPage + 1)}
              className="text-[#0b3d6e] hover:underline cursor-pointer font-medium"
            >
              Next &raquo;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
