import React from 'react';
import { ArrowLeft, Phone, ShieldCheck } from 'lucide-react';

interface ResetPasswordViewProps {
  navigate: (route: string) => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ navigate }) => {
  return (
    <div className="space-y-4 max-w-[480px]">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <button
          onClick={() => navigate('/status')}
          className="text-[#0b3d6e] hover:underline flex items-center gap-1 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Status Portal</span>
        </button>
      </div>

      <h2 className="text-2xl font-bold text-[#0b3d6e] flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-emerald-600" />
        <span>Password-Free Mobile Access</span>
      </h2>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-xs text-blue-900 space-y-2 leading-relaxed">
        <p className="font-bold">Password Login Has Been Retired</p>
        <p>
          In accordance with the Department of Social Welfare guidelines, citizen access is now secured via <b>10-digit Indian Mobile Number + SMS One-Time Password (OTP)</b>.
        </p>
        <p>
          You no longer need to remember or reset a password. Simply enter your registered mobile number on the Status Portal to receive a temporary verification code.
        </p>
      </div>

      <div className="pt-2">
        <button
          onClick={() => navigate('/status')}
          className="btn-gov flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          <span>Go to Mobile Status Login</span>
        </button>
      </div>
    </div>
  );
};
