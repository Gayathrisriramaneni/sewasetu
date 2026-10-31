import React from 'react';
import { MessageSquare, ShieldCheck, UserCheck, Home, FileText, Cpu } from 'lucide-react';

interface HeaderProps {
  currentRoute: string;
  navigate: (route: string) => void;
  unreadSmsCount?: number;
  openSmsConsole: () => void;
  adminLoggedIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  navigate,
  unreadSmsCount = 0,
  openSmsConsole,
  adminLoggedIn = false,
}) => {
  return (
    <header className="w-full">
      {/* Top Bar with National/State theme */}
      <div className="bg-[#0b3d6e] text-white px-4 sm:px-8 py-3.5 border-b border-[#082e54]">
        <div className="max-w-[1000px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div 
            onClick={() => navigate('/')} 
            className="cursor-pointer group flex items-start gap-3 select-none"
          >
            <div className="bg-white/10 p-2 rounded text-2xl">
              🏛️
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white m-0">
                Sewa Setu &mdash; Old Age Pension Portal
              </h1>
              <div className="text-xs sm:text-sm text-[#cfe0f3] mt-0.5">
                Department of Social Welfare &middot; Government of Purvanchal
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <button
              onClick={openSmsConsole}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-2.5 py-1.5 rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="Open simulated Purvanchal Messaging gateway console"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message Gateway Console</span>
              {unreadSmsCount > 0 && (
                <span className="bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                  {unreadSmsCount}
                </span>
              )}
            </button>

            {adminLoggedIn ? (
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Panel</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/admin')}
                className="bg-blue-950/60 hover:bg-blue-950 text-blue-100 hover:text-white px-2.5 py-1.5 rounded flex items-center gap-1 border border-blue-400/30 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Saffron line band */}
      <div className="h-1.5 bg-[#f7931e] w-full" />

      {/* Navigation Sub-bar */}
      <nav className="bg-[#124d85] text-white/90 text-sm border-b border-[#0f3e6a] shadow-inner px-4 sm:px-8">
        <div className="max-w-[1000px] mx-auto flex items-center overflow-x-auto gap-1 sm:gap-2 py-1 scrollbar-none">
          <button
            onClick={() => navigate('/')}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              currentRoute === '/' ? 'bg-[#092949] text-white shadow-sm' : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => navigate('/apply')}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              currentRoute.startsWith('/apply') || currentRoute.startsWith('/form') || currentRoute === '/verify' || currentRoute === '/upload' || currentRoute === '/declaration'
                ? 'bg-[#092949] text-white shadow-sm'
                : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Apply for Pension</span>
          </button>

          <button
            onClick={() => navigate('/status')}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              currentRoute.startsWith('/status') || currentRoute.startsWith('/application')
                ? 'bg-[#092949] text-white shadow-sm'
                : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Check Status</span>
          </button>

          <button
            onClick={() => navigate('/about')}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              currentRoute === '/about' ? 'bg-[#092949] text-white shadow-sm' : 'hover:bg-white/10 text-white/80'
            }`}
          >
            <span>About Scheme</span>
          </button>

          <button
            onClick={() => navigate('/eval-dashboard')}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              currentRoute.startsWith('/eval-dashboard') || currentRoute === '/eval'
                ? 'bg-[#092949] text-white shadow-sm border border-emerald-400/40'
                : 'bg-emerald-900/50 hover:bg-emerald-800 text-emerald-100 hover:text-white border border-emerald-500/30'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-300" />
            <span>AI Eval Dashboard</span>
          </button>

          <button
            onClick={() => navigate('/__gateway')}
            className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ml-auto ${
              currentRoute.startsWith('/__gateway') ? 'bg-amber-600 text-white shadow-sm' : 'hover:bg-white/10 text-amber-200'
            }`}
          >
            <span>Gateway (Simulation)</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
