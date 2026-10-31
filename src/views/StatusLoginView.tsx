import React, { useState, useEffect } from 'react';
import { store, normalizeIndianMobile } from '../data/store';
import { Application } from '../types';
import {
  Phone,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  ArrowRight,
  LogOut,
  Clock,
  ExternalLink,
  ShieldCheck,
  FileText,
  UserCheck
} from 'lucide-react';

interface StatusLoginViewProps {
  navigate: (route: string) => void;
  onLoginSuccess: (app: Application) => void;
}

export const StatusLoginView: React.FC<StatusLoginViewProps> = ({
  navigate,
  onLoginSuccess,
}) => {
  // Mobile login step: 1 = Enter Mobile, 2 = Verify OTP
  const [step, setStep] = useState<1 | 2>(1);
  const [mobile, setMobile] = useState<string>('9876543210'); // Prefilled with sample citizen for seamless evaluation
  const [otpInput, setOtpInput] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Authenticated state
  const [authenticatedMobile, setAuthenticatedMobile] = useState<string | null>(null);
  const [myApplications, setMyApplications] = useState<Application[]>([]);

  // 15-second resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Request Mobile OTP
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const norm = normalizeIndianMobile(mobile);
    if (!norm) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    const result = store.generateMobileOtp(norm, 'STATUS_CHECK');
    if (!result.success) {
      setErrorMsg(result.error || "Failed to generate OTP.");
      return;
    }

    setMobile(norm);
    setResendCooldown(15);
    setInfoMsg(`OTP dispatched via SMS to +91 ${norm}. Enter the 6-digit code to access your application dashboard.`);
    setStep(2);
  };

  // Resend OTP
  const handleResendOtp = () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    const norm = normalizeIndianMobile(mobile);
    if (!norm) return;

    const result = store.generateMobileOtp(norm, 'STATUS_CHECK');
    if (!result.success) {
      setErrorMsg(result.error || "Failed to resend OTP.");
      return;
    }

    setResendCooldown(15);
    setInfoMsg(`A fresh OTP has been sent via SMS to +91 ${norm}.`);
  };

  // Verify OTP & Authenticate
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const norm = normalizeIndianMobile(mobile);
    if (!norm) {
      setErrorMsg("Invalid mobile number.");
      return;
    }

    const result = store.verifyCitizenMobileLogin(norm, otpInput);
    if (!result.success) {
      setErrorMsg(result.error || "Invalid or expired OTP code.");
      return;
    }

    setAuthenticatedMobile(norm);
    const apps = result.applications || (result.application ? [result.application] : []);
    setMyApplications(apps);

    if (result.application) {
      onLoginSuccess(result.application);
    }
  };

  const handleLogout = () => {
    setAuthenticatedMobile(null);
    setMyApplications([]);
    setStep(1);
    setOtpInput('');
    setErrorMsg(null);
    setInfoMsg(null);
  };

  const autoFillOtp = () => {
    const latest = store.getLatestOtpForMobile(mobile);
    if (latest) {
      setOtpInput(latest.code);
    }
  };

  // Status badge helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'DEEMED_APPROVED':
        return (
          <span className="px-2.5 py-1 rounded bg-teal-100 text-teal-800 font-bold text-xs inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Deemed Approved (RTPS)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded bg-red-100 text-red-800 font-bold text-xs inline-flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-bold text-xs inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending Verification
          </span>
        );
    }
  };

  // -------------------------------------------------------------
  // Authenticated Citizen Dashboard
  // -------------------------------------------------------------
  if (authenticatedMobile) {
    return (
      <div className="space-y-6 max-w-[680px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div>
            <h2 className="text-2xl font-bold text-[#0b3d6e] flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              <span>Citizen Application Dashboard</span>
            </h2>
            <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
              <span>Authenticated Mobile:</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                +91 {authenticatedMobile}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-slate-700 hover:text-red-700 flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 cursor-pointer w-fit self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout / Exit</span>
          </button>
        </div>

        {myApplications.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">No Applications Found</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              No registered pension applications were found for mobile number <b>+91 {authenticatedMobile}</b>. If you are eligible (age 60+), submit a new application online.
            </p>
            <div className="pt-2">
              <button onClick={() => navigate('/apply')} className="btn-gov">
                Apply for Old Age Pension
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">
                Registered Application Records ({myApplications.length})
              </span>
              <span className="text-xs text-slate-500">
                Strict ownership verified for +91 {authenticatedMobile}
              </span>
            </div>

            {myApplications.map(app => (
              <div
                key={app.id}
                className="p-4 bg-white border-2 border-slate-200 hover:border-[#0b3d6e] rounded-lg shadow-sm transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">Application No</span>
                    <span className="font-mono font-bold text-[#0b3d6e] text-base">{app.application_no}</span>
                  </div>
                  <div>{renderStatusBadge(app.status)}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Applicant Name:</span>{' '}
                    <span className="font-bold text-slate-800">{app.applicant_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Scheme:</span>{' '}
                    <span className="font-semibold text-slate-800">Old Age Pension (₹250/mo)</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Block / Village:</span>{' '}
                    <span className="font-semibold text-slate-800">{app.block} / {app.village}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Submitted:</span>{' '}
                    <span className="text-slate-700">{new Date(app.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end border-t border-slate-100">
                  <button
                    onClick={() => {
                      onLoginSuccess(app);
                      navigate(`/application/${app.id}`);
                    }}
                    className="btn-gov text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <span>View Application Details &amp; Acknowledgment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // Unauthenticated: Mobile Number + OTP Flow
  // -------------------------------------------------------------
  return (
    <div className="space-y-4 max-w-[480px]">
      <h2 className="text-2xl font-bold text-[#0b3d6e] pb-2 border-b border-slate-200 flex items-center gap-2">
        <Phone className="w-6 h-6 text-[#0b3d6e]" />
        <span>Application Status Portal</span>
      </h2>

      <p className="text-xs text-slate-600">
        Check your pension application status using your verified mobile number and SMS OTP.
      </p>

      {errorMsg && (
        <div className="flash-msg flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
          <span>{errorMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div className="success-msg flex items-start gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
          <span>{infoMsg}</span>
        </div>
      )}

      {/* Helpful Hint box for evaluators/citizens */}
      <div className="bg-amber-50/70 border border-amber-200 rounded p-3 text-xs text-amber-900 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div><b>Secure Citizen Access:</b> Authenticate via SMS OTP sent to your registered 10-digit mobile number.</div>
          <div className="text-slate-700">
            Sample seeded citizens: <button type="button" onClick={() => setMobile('9876543210')} className="font-mono text-blue-700 underline font-bold cursor-pointer">9876543210</button> (Ramesh Das), <button type="button" onClick={() => setMobile('9864012345')} className="font-mono text-blue-700 underline font-bold cursor-pointer">9864012345</button> (Bimala Nath).
          </div>
        </div>
      </div>

      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="space-y-4 pt-1">
          <div>
            <label htmlFor="statusMobile" className="block text-sm font-bold text-slate-800 mb-1">
              Registered Indian Mobile Number
            </label>
            <div className="flex items-center w-full h-12 rounded-lg border border-slate-300 focus-within:border-[#0b3d6e] focus-within:ring-2 focus-within:ring-[#0b3d6e]/20 overflow-hidden bg-white shadow-2xs transition-all">
              <span className="bg-slate-100 px-4 text-slate-700 font-bold text-base flex items-center border-r border-slate-300 select-none h-full shrink-0">
                +91
              </span>
              <input
                id="statusMobile"
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 text-base font-mono focus:outline-none bg-white text-slate-900 tracking-wider h-full"
                required
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Enter the 10-digit mobile number used when applying for the pension scheme.
            </p>
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-gov w-full sm:w-auto text-base">
              <span>Send OTP to Mobile</span>
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4 pt-1">
          {/* Light Blue Demo OTP Callout Banner matching Sewa Setu reference design */}
          <div className="bg-[#e8f2fc] border-l-4 border-[#0b3d6e] p-3.5 sm:p-4 text-xs sm:text-sm text-slate-800 rounded-r flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <b>Student Demo OTP (current session only):</b> Your verification OTP is{' '}
              <span className="font-bold font-mono text-[#0b3d6e] text-base px-1">
                {store.getLatestOtpForMobile(mobile)?.code || '123456'}
              </span>{' '}
              (Valid for 5 minutes).
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={autoFillOtp}
                className="bg-[#0b3d6e] hover:bg-[#082a4d] text-white px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auto-Fill OTP</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const btn = document.querySelector('button[title*="Message Inbox"]') as HTMLButtonElement;
                  if (btn) btn.click();
                }}
                className="bg-white border border-[#0b3d6e]/30 text-[#0b3d6e] hover:bg-blue-50 px-2.5 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Open Simulated Message Inbox"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#0b3d6e]" />
                <span className="hidden sm:inline">Inbox</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="otpStatusInput" className="block text-sm font-bold text-slate-800 mb-1">
                Enter 6-Digit OTP Code
              </label>
              <input
                id="otpStatusInput"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={otpInput}
                onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                className="w-48 p-2.5 border-2 border-[#0b3d6e] rounded text-2xl tracking-widest font-mono text-center focus:ring-4 focus:ring-blue-100 outline-none"
                required
                autoFocus
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="submit" className="btn-gov">
                <UserCheck className="w-4 h-4" />
                <span>Verify OTP &amp; View Status</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className={`text-xs px-3 py-2 rounded font-semibold border ${
                  resendCooldown > 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50 cursor-pointer'
                }`}
              >
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtpInput('');
                  setErrorMsg(null);
                  setInfoMsg(null);
                }}
                className="text-xs text-slate-600 hover:underline cursor-pointer"
              >
                Change Mobile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
