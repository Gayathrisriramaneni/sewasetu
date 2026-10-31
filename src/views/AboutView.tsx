import React from 'react';
import { ArrowLeft, BookOpen, ShieldCheck, Download, Users } from 'lucide-react';

interface AboutViewProps {
  navigate: (route: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ navigate }) => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <button
          onClick={() => navigate('/')}
          className="text-[#0b3d6e] hover:underline flex items-center gap-1 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      <h2 className="text-2xl font-bold text-[#0b3d6e]">
        About the Scheme
      </h2>

      <p className="text-base text-slate-800 leading-relaxed">
        The Old Age Pension Scheme is implemented by the <b>Department of Social Welfare, Government of Purvanchal</b>, under the State Social Assistance Programme.
      </p>

      <div className="bg-slate-50 border border-slate-200 p-4 rounded text-sm text-slate-800 space-y-3">
        <h3 className="font-bold text-[#0b3d6e] text-base m-0">Eligibility &amp; Statutory Terms:</h3>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
          <li>
            <b>Eligibility:</b> Bona fide residents of Purvanchal above 60 years of age.
          </li>
          <li>
            <b>Limits:</b> One application per eligible citizen. Duplicate applications on the same mobile number are prohibited.
          </li>
          <li>
            <b>Statutory SLA:</b> Applications are processed within <b>15 days</b> as per the Purvanchal Right to Public Services Act (RTPS).
          </li>
          <li>
            <b>Deemed Approval:</b> Applications not processed within the statutory 15-day period automatically stand approved (deemed approval).
          </li>
          <li>
            <b>Benefit Amount:</b> Rs. 250 monthly pension credited via Direct Benefit Transfer (DBT) to the applicant's verified bank account.
          </li>
        </ul>
      </div>

      <div className="space-y-2 pt-2 text-sm text-slate-700">
        <div>
          <b>Scheme guidelines:</b>{' '}
          <a
            href="#guidelines"
            onClick={(e) => {
              e.preventDefault();
              alert("Purvanchal State Old Age Pension Guidelines (Order No. SWD-2023/8812) - Minimum age: 60, Monthly disbursement: Rs. 250, Processing time: 15 statutory working days.");
            }}
            className="text-[#0b3d6e] underline hover:text-[#0d4a85]"
          >
            OAP Guidelines 2023 (PDF)
          </a>
        </div>
        <div>
          <b>Beneficiary list:</b>{' '}
          <a
            href="#beneficiary"
            onClick={(e) => {
              e.preventDefault();
              navigate('/admin/applications?status=APPROVED');
            }}
            className="text-[#0b3d6e] underline hover:text-[#0d4a85]"
          >
            District-wise beneficiary list (Portal Registry)
          </a>
        </div>
      </div>
    </div>
  );
};
