import React, { useState } from 'react';
import { XCircle, X, Loader2 } from 'lucide-react';
import { store } from '../data/store';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appId: number;
  applicationNo?: string;
  onSuccess: (reason: string) => void;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  onClose,
  appId,
  applicationNo,
  onSuccess,
}) => {
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleConfirmReject = async () => {
    const clean = rejectionReason.trim();
    if (!clean || clean.length < 5) {
      setRejectionError('Minimum 5 characters required.');
      return;
    }

    setIsLoading(true);
    setRejectionError(null);

    try {
      // Simulate slight async delay for server-side persistence & audit logging
      await new Promise(resolve => setTimeout(resolve, 300));

      const res = store.rejectApplication(appId, 'officer_admin', true, clean);
      if (!res.success) {
        setRejectionError(res.error || 'Rejection failed.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      onSuccess(clean);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setRejectionError(err?.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-slate-300">
        <div className="bg-[#b91c1c] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <XCircle className="w-4 h-4 text-white" />
            <span>Reject Pension Application {applicationNo ? `(${applicationNo})` : ''}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-700 leading-relaxed">
            Please enter a meaningful statutory reason for rejecting this pension application.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Rejection Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              disabled={isLoading}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (e.target.value.trim().length >= 5) {
                  setRejectionError(null);
                }
              }}
              placeholder="Enter the specific reason for rejection..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 disabled:bg-slate-100"
            />
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-slate-500">Minimum 5 characters required.</span>
              <span className={rejectionReason.trim().length < 5 ? 'text-amber-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                {rejectionReason.trim().length} / 5 chars
              </span>
            </div>
          </div>

          {rejectionError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded text-xs font-semibold">
              {rejectionError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={isLoading || rejectionReason.trim().length < 5}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded text-xs font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Rejection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
