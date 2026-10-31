import React from 'react';
import { getDeadlineRemainingHours } from '../data/store';
import { ArrowRight, Clock, CheckCircle2, FileText, UserCheck, Shield, HelpCircle, PhoneCall } from 'lucide-react';

interface HomeViewProps {
  navigate: (route: string) => void;
  applicationsCount: number;
}

export const HomeView: React.FC<HomeViewProps> = ({ navigate, applicationsCount }) => {
  const hoursLeft = getDeadlineRemainingHours();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0b3d6e] mb-3 pb-2 border-b border-slate-200">
          Welcome
        </h2>
        <p className="text-base text-slate-800 leading-relaxed">
          The Old Age Pension Scheme provides a monthly pension of <b>Rs. 250</b> to eligible
          senior citizens above 60 years of age who are residents of Purvanchal.
        </p>
      </div>

      {/* Deadline Banner */}
      {hoursLeft !== null ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-950 m-0">
              Application window closes in approximately {hoursLeft} hours (midnight, 31 October).
            </p>
            <p className="text-xs text-amber-800 mt-1 m-0">
              Citizens are advised to submit applications before the deadline to avoid rush hours.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r flex items-start gap-3">
          <Clock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-900 m-0">
              The application window for this scheme has closed.
            </p>
            <p className="text-xs text-red-700 mt-1 m-0">
              Already submitted applications can still be tracked using the status portal below.
            </p>
          </div>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={() => navigate('/apply')}
          disabled={hoursLeft === null}
          className="btn-gov text-base px-6 py-3 shadow-sm hover:shadow transition-all"
        >
          <FileText className="w-5 h-5" />
          <span>Apply for Pension</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => navigate('/status')}
          className="btn-gov btn-secondary text-base px-6 py-3 shadow-sm hover:shadow transition-all"
        >
          <UserCheck className="w-5 h-5" />
          <span>Check Application Status</span>
        </button>
      </div>

      {/* How to Apply Section */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-sm mt-6">
        <h3 className="text-lg font-bold text-[#0b3d6e] mb-3 flex items-center gap-2">
          <span>How to apply</span>
        </h3>
        <ol className="list-decimal pl-5 space-y-2.5 text-sm text-slate-700">
          <li>
            <b>Verify your mobile number with OTP.</b> Receive an instant 6-digit verification code.
          </li>
          <li>
            <b>Fill the application form.</b> Enter personal details, village &amp; block address, and bank account for Direct Benefit Transfer (DBT).
          </li>
          <li>
            <b>Upload your age proof document.</b> Birth certificate, School leaving certificate, or Voter ID (JPG or PDF, maximum 5 MB).
          </li>
          <li>
            <b>Submit the declaration.</b> Note down your Application Number to track progress.
          </li>
        </ol>

        <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-700 shrink-0" />
          <span>For assistance visit your nearest Block Development Office or consult your Gram Panchayat coordinator.</span>
        </div>
      </div>

      {/* Key Guarantees & Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="border border-slate-200 bg-white p-4 rounded-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Statutory SLA</div>
          <div className="text-xl font-bold text-[#0b3d6e] mt-1">15 Days Guarantee</div>
          <div className="text-xs text-slate-600 mt-1">
            Purvanchal Right to Public Services Act mandates time-bound disposal or automatic deemed approval.
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-4 rounded-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Disbursement Mode</div>
          <div className="text-xl font-bold text-[#0b3d6e] mt-1">Direct DBT</div>
          <div className="text-xs text-slate-600 mt-1">
            Rs. 250 monthly pension credited directly to the beneficiary's registered bank account.
          </div>
        </div>

        <div className="border border-slate-200 bg-white p-4 rounded-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Applications</div>
          <div className="text-xl font-bold text-[#0b3d6e] mt-1">{applicationsCount} Submissions</div>
          <div className="text-xs text-slate-600 mt-1">
            Active in database across Sonari, Rajapara, Namti, Borgaon, and Khelua blocks.
          </div>
        </div>
      </div>
    </div>
  );
};
