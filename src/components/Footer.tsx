import React from 'react';
import { RotateCcw } from 'lucide-react';
import { store } from '../data/store';

interface FooterProps {
  navigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  const handleResetData = () => {
    if (window.confirm("Reset all stored applications, users, and SMS records back to default state?")) {
      store.resetToFactoryDefaults();
      window.location.reload();
    }
  };

  return (
    <footer className="max-w-[1376px] w-[calc(100%-48px)] mx-auto mt-8 mb-12 px-4 text-center text-xs text-[#666666]">
      <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 mb-2.5">
        <button
          onClick={() => navigate('/about')}
          className="text-[#0b3d6e] hover:underline cursor-pointer bg-transparent border-0 p-0"
        >
          About the Scheme
        </button>
        <span>|</span>
        <button
          onClick={() => navigate('/rti')}
          className="text-[#0b3d6e] hover:underline cursor-pointer bg-transparent border-0 p-0"
        >
          RTI
        </button>
        <span>|</span>
        <button
          onClick={() => navigate('/grievance')}
          className="text-[#0b3d6e] hover:underline cursor-pointer bg-transparent border-0 p-0"
        >
          Grievance Cell
        </button>
        <span>|</span>
        <button
          onClick={() => navigate('/pension-rules')}
          className="text-[#0b3d6e] hover:underline cursor-pointer bg-transparent border-0 p-0"
        >
          Pension Rules 2019
        </button>
        <span>|</span>
        <button
          onClick={() => navigate('/contact')}
          className="text-[#0b3d6e] hover:underline cursor-pointer bg-transparent border-0 p-0"
        >
          Contact Us
        </button>
      </div>

      <div className="text-[#666666] leading-relaxed">
        Site designed &amp; developed by Netlink Infosolutions Pvt Ltd. Best viewed in 1024x768.
      </div>
      <div className="text-[11px] text-[#888888] mt-1">
        Department of Social Welfare &middot; Government of Purvanchal &middot; Right to Public Services Act Compliant
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-center gap-4 text-[11px] text-slate-500">
        <button
          onClick={handleResetData}
          className="inline-flex items-center gap-1 hover:text-slate-800 transition-colors cursor-pointer"
          title="Reset simulated data to initial state"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Portal Demo Data</span>
        </button>
        <button
          onClick={() => navigate('/__gateway')}
          className="hover:text-amber-700 transition-colors cursor-pointer"
        >
          Open PurvSMS Gateway Console
        </button>
        <span>&bull;</span>
        <button
          onClick={() => navigate('/eval-dashboard')}
          className="hover:text-emerald-700 font-semibold text-[#0b3d6e] transition-colors cursor-pointer"
        >
          AI Agent Evaluation Dashboard
        </button>
      </div>
    </footer>
  );
};
