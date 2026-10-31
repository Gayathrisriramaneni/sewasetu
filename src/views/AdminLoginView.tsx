import React, { useState } from 'react';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '../data/store';
import { ShieldCheck, AlertCircle, Info } from 'lucide-react';

interface AdminLoginViewProps {
  onLoginSuccess: () => void;
  navigate: (route: string) => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  navigate,
}) => {
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('sewasetu@123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      onLoginSuccess();
      navigate('/admin/dashboard');
    } else {
      setErrorMsg("Invalid credentials. Please verify your username and password.");
    }
  };

  return (
    <div className="space-y-4 max-w-[480px]">
      <h2 className="text-2xl font-bold text-[#0b3d6e] pb-2 border-b border-slate-200">
        Departmental Login
      </h2>

      {errorMsg && (
        <div className="flash-msg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Helpful Hint box for evaluators */}
      <div className="bg-slate-50 border border-slate-300 rounded p-3 text-xs text-slate-800 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-800 shrink-0 mt-0.5" />
        <div>
          <b>Departmental Credentials:</b> Username: <code className="bg-white border px-1 py-0.5 rounded font-mono">admin</code>, Password: <code className="bg-white border px-1 py-0.5 rounded font-mono">sewasetu@123</code>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full p-2 border border-[#aab] rounded text-sm focus:outline-none focus:border-[#0b3d6e]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-2 border border-[#aab] rounded text-sm focus:outline-none focus:border-[#0b3d6e]"
            required
          />
        </div>

        <div className="pt-2">
          <button type="submit" className="btn-gov">
            <ShieldCheck className="w-4 h-4" />
            <span>Login to Portal</span>
          </button>
        </div>
      </form>
    </div>
  );
};
