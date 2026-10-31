import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, ExternalLink, ArrowLeft, Send, Mail, Smartphone } from 'lucide-react';
import { store } from '../data/store';
import { SmsMessage } from '../types';

interface GatewayViewProps {
  onBack?: () => void;
  isModal?: boolean;
}

export const GatewayView: React.FC<GatewayViewProps> = ({ onBack, isModal = false }) => {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [filterTo, setFilterTo] = useState<string>('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(5);

  // Manual test SMS form
  const [testNumber, setTestNumber] = useState<string>('');
  const [testText, setTestText] = useState<string>('');
  const [showSendForm, setShowSendForm] = useState<boolean>(false);

  const refreshMessages = () => {
    const list = store.getSmsMessages(filterTo ? filterTo.trim() : undefined);
    setMessages(list);
  };

  useEffect(() => {
    refreshMessages();
    const unsubscribe = store.subscribe(() => {
      refreshMessages();
    });

    // 1s ticker for countdown and delivery update
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refreshMessages();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [filterTo]);

  const handleCopyText = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyOtpOnly = (text: string) => {
    const match = text.match(/\b\d{6}\b/);
    if (match) {
      navigator.clipboard.writeText(match[0]);
      setCopiedOtp(match[0]);
      setTimeout(() => setCopiedOtp(null), 2000);
    }
  };

  const handleSendTestSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber || !testText) return;
    store.sendSms(testNumber.trim(), testText.trim());
    setTestText('');
    refreshMessages();
  };

  const formatSentTime = (timestampSec: number) => {
    const d = new Date(timestampSec * 1000);
    return d.toTimeString().split(' ')[0];
  };

  const getRemainingEta = (deliveryAtSec: number) => {
    const nowSec = Math.floor(Date.now() / 1000);
    const eta = deliveryAtSec - nowSec;
    return eta > 0 ? eta : 0;
  };

  return (
    <div className={`bg-[#f4f4f4] text-[#222222] min-h-[500px] ${isModal ? 'p-4' : 'p-6 max-w-[960px] mx-auto my-6 border border-slate-300 rounded shadow-sm'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-300 gap-3">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="text-[#1a3c6e] hover:underline flex items-center gap-1 text-sm font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <h2 className="text-xl sm:text-2xl font-bold text-[#1a3c6e] m-0">
              Purvanchal Messaging Gateway (simulation)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Messages appear below once the carrier/mail-server delivers them. Auto-refreshes every 5s (next in {countdown}s).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              refreshMessages();
              setCountdown(5);
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-xs font-medium rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${countdown === 5 ? 'animate-spin' : ''}`} />
            <span>Refresh Now</span>
          </button>

          <button
            onClick={() => setShowSendForm(!showSendForm)}
            className="px-2.5 py-1.5 bg-[#1a3c6e] hover:bg-[#122e56] text-white text-xs font-medium rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{showSendForm ? 'Hide Send Tool' : 'Test Message'}</span>
          </button>
        </div>
      </div>

      {showSendForm && (
        <form onSubmit={handleSendTestSms} className="bg-white p-4 mb-4 border border-slate-300 rounded text-sm space-y-3">
          <div className="font-semibold text-[#1a3c6e]">Send Test Message via Gateway API</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">To Email / Mobile</label>
              <input
                type="text"
                placeholder="email@example.com or 10-digit mobile"
                value={testNumber}
                onChange={e => setTestNumber(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Message Body</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Your OTP is 123456"
                  value={testText}
                  onChange={e => setTestText(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1a3c6e] text-white rounded font-medium text-sm hover:bg-[#122e56] cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Filter bar */}
      <div className="bg-white p-3 mb-4 border border-slate-300 rounded flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="font-medium text-slate-700">Filter by Email / Mobile:</span>
          <input
            type="text"
            placeholder="e.g. name@example.com"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="px-2.5 py-1 border border-slate-300 rounded text-xs w-40"
          />
          {filterTo && (
            <button
              onClick={() => setFilterTo('')}
              className="text-xs text-blue-700 hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <div className="text-slate-500 text-xs">
          Showing {messages.length} message{messages.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Table replicating PurvSMS gateway console */}
      <div className="bg-white border border-slate-300 overflow-x-auto shadow-xs">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
              <th className="p-2 sm:px-3 sm:py-2.5 border-r border-slate-300 w-12 font-semibold">#</th>
              <th className="p-2 sm:px-3 sm:py-2.5 border-r border-slate-300 w-32 font-semibold">To</th>
              <th className="p-2 sm:px-3 sm:py-2.5 border-r border-slate-300 font-semibold">Message</th>
              <th className="p-2 sm:px-3 sm:py-2.5 border-r border-slate-300 w-24 font-semibold">Sent</th>
              <th className="p-2 sm:px-3 sm:py-2.5 w-36 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                  No messages recorded in gateway queue yet.
                </td>
              </tr>
            ) : (
              messages.map(m => {
                const nowSec = Math.floor(Date.now() / 1000);
                const isDelivered = m.delivered || nowSec >= m.delivery_at;
                const eta = getRemainingEta(m.delivery_at);
                const hasOtp = m.text.match(/\b\d{6}\b/);

                return (
                  <tr key={m.id} className="border-b border-slate-200 hover:bg-slate-50/70 transition-colors">
                    <td className="p-2 sm:px-3 sm:py-2.5 border-r border-slate-200 font-mono text-xs text-slate-500">
                      {m.id}
                    </td>
                    <td className="p-2 sm:px-3 sm:py-2.5 border-r border-slate-200 font-mono font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        {m.type === 'EMAIL' ? (
                          <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        <span>{m.to}</span>
                      </div>
                    </td>
                    <td className="p-2 sm:px-3 sm:py-2.5 border-r border-slate-200 text-xs sm:text-sm">
                      {isDelivered ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-normal text-slate-800 break-words">{m.text}</span>
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            {hasOtp && (
                              <button
                                onClick={() => handleCopyOtpOnly(m.text)}
                                className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded text-[11px] font-bold cursor-pointer transition-colors"
                                title="Copy 6-digit OTP code"
                              >
                                {copiedOtp === hasOtp[0] ? '✓ OTP Copied' : `Copy OTP (${hasOtp[0]})`}
                              </button>
                            )}
                            <button
                              onClick={() => handleCopyText(m.id, m.text)}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              title={`Copy full ${m.type === 'EMAIL' ? 'Email' : 'SMS'}`}
                            >
                              {copiedId === m.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <i className="text-slate-400 text-xs">({m.type === 'EMAIL' ? 'sending...' : 'in transit'})</i>
                      )}
                    </td>
                    <td className="p-2 sm:px-3 sm:py-2.5 border-r border-slate-200 font-mono text-xs text-slate-600">
                      {formatSentTime(m.sent_at)}
                    </td>
                    <td className="p-2 sm:px-3 sm:py-2.5 text-xs font-semibold">
                      {isDelivered ? (
                        <span className="text-[#1b7e3c] flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-[#1b7e3c]"></span>
                          {m.type === 'EMAIL' ? 'Sent' : 'Delivered'}
                        </span>
                      ) : (
                        <span className="text-[#b36b00] flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-[#b36b00] animate-pulse"></span>
                          Queued &middot; ~{eta}s
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          Gateway latency simulated at 1&ndash;3 seconds. The simulated gateway is also accessible directly at route <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">/__gateway</code>.
        </div>
        <div>
          Purvanchal Messaging Service v3.0 (Cloud Integrated)
        </div>
      </div>
    </div>
  );
};
