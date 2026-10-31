import React from 'react';
import { ArrowLeft, Shield, Phone, Mail, MapPin, FileText } from 'lucide-react';

interface StaticInfoViewProps {
  type: 'rti' | 'grievance' | 'rules' | 'contact';
  navigate: (route: string) => void;
}

export const StaticInfoView: React.FC<StaticInfoViewProps> = ({ type, navigate }) => {
  const titles = {
    rti: 'Right to Information (RTI)',
    grievance: 'Public Grievance Redressal Cell',
    rules: 'Purvanchal Pension Rules 2019',
    contact: 'Contact Us & Block Offices',
  };

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
        {titles[type]}
      </h2>

      {type === 'rti' && (
        <div className="space-y-3 text-sm text-slate-800 leading-relaxed">
          <p>
            Under the Right to Information Act, citizens may request information regarding the administration of the Old Age Pension Scheme in Purvanchal.
          </p>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded text-xs space-y-2">
            <div><b>Public Information Officer (PIO):</b> Under Secretary, Department of Social Welfare, Dispur Secretariat, Sonapur.</div>
            <div><b>Appellate Authority:</b> Director, Social Welfare Department, Government of Purvanchal.</div>
            <div><b>Filing Fee:</b> Rs. 10 by postal order or treasury challan.</div>
          </div>
        </div>
      )}

      {type === 'grievance' && (
        <div className="space-y-3 text-sm text-slate-800 leading-relaxed">
          <p>
            Citizens experiencing delays beyond the statutory 15-day SLA or technical issues with OTP delivery may register grievances directly.
          </p>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded text-xs space-y-2">
            <div><b>Toll-free Helpline:</b> 1800-345-0922 (Mon-Sat, 9:30 AM to 5:30 PM)</div>
            <div><b>Email:</b> grievance-pension@swd.purvanchal.gov.in</div>
            <div><b>Appeals:</b> Under Section 7 of the Purvanchal Right to Public Services Act, appeals lie with the Deputy Commissioner.</div>
          </div>
        </div>
      )}

      {type === 'rules' && (
        <div className="space-y-3 text-sm text-slate-800 leading-relaxed">
          <p>
            The Purvanchal Social Security (Old Age Assistance) Rules 2019 govern eligibility, application procedure, verification standards, and Direct Benefit Transfer (DBT) disbursement mechanisms.
          </p>
          <div className="bg-slate-50 border border-slate-200 p-4 rounded text-xs space-y-2">
            <div><b>Notification No:</b> SWD/SSP/Rules/2019/410</div>
            <div><b>Mandatory Requirements:</b> Age proof, Bank Account IFSC, Resident of notified district blocks.</div>
            <div><b>Statutory Processing Guarantee:</b> 15 calendar days from submission of complete application.</div>
          </div>
        </div>
      )}

      {type === 'contact' && (
        <div className="space-y-4 text-sm text-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="border border-slate-200 p-3 rounded bg-slate-50">
              <div className="font-bold text-[#0b3d6e] mb-1">State Directorate</div>
              <div>Department of Social Welfare</div>
              <div>Block 4, State Secretariat Complex</div>
              <div>Sonapur, Purvanchal - 781006</div>
              <div className="mt-2 text-slate-600">Email: helpdesk@sewasetu.purvanchal.gov.in</div>
            </div>

            <div className="border border-slate-200 p-3 rounded bg-slate-50">
              <div className="font-bold text-[#0b3d6e] mb-1">Block Development Offices</div>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 mt-1">
                <li>Sonari BDO Office, Main Road</li>
                <li>Rajapara Development Block</li>
                <li>Namti Panchayat Office</li>
                <li>Borgaon &amp; Khelua Circles</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
