import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Shield,
  Layers,
  Database,
  Cpu,
  UserCheck,
  CheckCheck,
  Lock,
  Calendar,
} from 'lucide-react';
import { EvalCategory, EvalRunRecord, EvalRunSummary, EvalScenarioResult, EvalStatus } from '../eval/types';

interface EvalDashboardViewProps {
  navigate: (route: string) => void;
}

export const EvalDashboardView: React.FC<EvalDashboardViewProps> = ({ navigate }) => {
  const [currentRun, setCurrentRun] = useState<EvalRunRecord | null>(null);
  const [history, setHistory] = useState<EvalRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());

  // Load latest evaluations on mount
  useEffect(() => {
    fetchLatestRun();
    fetchHistory();
  }, []);

  const fetchLatestRun = async () => {
    try {
      const res = await fetch('/api/evaluations/latest');
      if (res.ok) {
        const data = await res.json();
        setCurrentRun(data);
        setSelectedRunId(data.summary.runId);
      } else if (res.status === 404) {
        // No runs yet - clean state
        setCurrentRun(null);
      } else {
        throw new Error(`Server returned status ${res.status}`);
      }
    } catch (err: any) {
      console.warn('Could not load latest evaluations:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/evaluations/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.warn('Could not load history:', err);
    }
  };

  const handleSelectRun = async (runId: string) => {
    if (!runId) return;
    setSelectedRunId(runId);
    try {
      const res = await fetch(`/api/evaluations/runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentRun(data);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to load evaluation run: ${err.message}`);
    }
  };

  const handleRunAll = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/evaluations/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status} execution failed`);
      }

      const runRecord: EvalRunRecord = await res.json();
      setCurrentRun(runRecord);
      setSelectedRunId(runRecord.summary.runId);
      await fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Execution failed. Check backend connection.');
    } finally {
      setIsRunning(false);
    }
  };

  const toggleScenario = (id: string) => {
    setExpandedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!currentRun) return;
    const allIds = new Set(currentRun.results.map(r => r.id));
    setExpandedScenarios(allIds);
  };

  const collapseAll = () => {
    setExpandedScenarios(new Set());
  };

  // Filtered scenario results
  const filteredResults = (currentRun?.results || []).filter(item => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
      return false;
    }
    if (statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = item.id.toLowerCase().includes(q);
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchExpl = item.explanation.toLowerCase().includes(q);
      const matchPersona = (item.persona || '').toLowerCase().includes(q);
      return matchId || matchName || matchDesc || matchExpl || matchPersona;
    }
    return true;
  });

  const summary = currentRun?.summary;

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate('/')} className="hover:text-[#0b3d6e] hover:underline cursor-pointer">
            Portal Home
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-800">AI Agent Evaluation &amp; Verification Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/__gateway')}
            className="text-[#0b3d6e] hover:underline cursor-pointer font-medium"
          >
            Message Gateway
          </button>
          <span>|</span>
          <button
            onClick={() => navigate('/admin')}
            className="text-[#0b3d6e] hover:underline cursor-pointer font-medium"
          >
            Officer Portal
          </button>
        </div>
      </div>

      {/* Main Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-sm border border-[#d5dbe3] shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0b3d6e] border border-blue-200 mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Automated Verification Framework &middot; Bharat Digital Fellowship</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0b3d6e] tracking-tight">
            AI Agent Evaluation &amp; Verification Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Citizen MCP &middot; Officer MCP &middot; Database Verifications &middot; Security Tests
          </p>
        </div>

        {/* Action Button: Run All */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className={`btn-gov bg-[#1b7e3c] hover:bg-[#14622e] active:bg-[#0e4822] text-white font-bold px-6 py-3 rounded text-base shadow-sm flex items-center gap-2 cursor-pointer transition-all ${
              isRunning ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            {isRunning ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running Evaluations...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>▶ Run All Evaluations</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-300 rounded text-red-800 text-sm flex items-start gap-2.5">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <b>Evaluation Run Error:</b> {errorMsg}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Scenarios */}
        <div className="bg-white p-4 sm:p-5 rounded-sm border border-[#d5dbe3] shadow-2xs">
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
            TOTAL SCENARIOS
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1.5">
            {summary ? summary.totalScenarios : 'Not Run'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span>8 Categories (A &ndash; H)</span>
          </div>
        </div>

        {/* Card 2: Passed */}
        <div className="bg-white p-4 sm:p-5 rounded-sm border border-[#d5dbe3] shadow-2xs">
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
            PASSED
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#1b7e3c] mt-1.5">
            {summary ? summary.passed : 'Not Run'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1b7e3c]" />
            <span>Verified state &amp; behavior</span>
          </div>
        </div>

        {/* Card 3: Failed */}
        <div className="bg-white p-4 sm:p-5 rounded-sm border border-[#d5dbe3] shadow-2xs">
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
            FAILED
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-[#a33333] mt-1.5">
            {summary ? summary.failed : 'Not Run'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-[#a33333]" />
            <span>{summary && summary.blocked > 0 ? `${summary.blocked} blocked` : '0 blocked'}</span>
          </div>
        </div>

        {/* Card 4: Pass Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-sm border border-[#d5dbe3] shadow-2xs">
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
            PASS RATE
          </div>
          <div className={`text-3xl sm:text-4xl font-extrabold mt-1.5 ${
            summary
              ? summary.passRate >= 90
                ? 'text-[#1b7e3c]'
                : summary.passRate >= 75
                ? 'text-amber-600'
                : 'text-[#a33333]'
              : 'text-slate-400'
          }`}>
            {summary ? `${summary.passRate}%` : 'Not Run'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5 text-[#0b3d6e]" />
            <span>Target: 100% statutory pass</span>
          </div>
        </div>
      </div>

      {/* Evaluation Metadata & Run History Selector */}
      <div className="bg-[#f8fafc] border border-slate-200 p-3 sm:p-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              <b>Last evaluation:</b>{' '}
              {summary ? (
                <>
                  {new Date(summary.completedAt).toLocaleString()} ({summary.timezone})
                </>
              ) : (
                'Never executed'
              )}
            </span>
          </div>
          {summary && (
            <div className="flex items-center gap-1 text-slate-500">
              <span>Duration:</span>
              <span className="font-mono font-bold text-slate-700">{(summary.durationMs / 1000).toFixed(2)}s</span>
            </div>
          )}
        </div>

        {/* History Run Dropdown */}
        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Select Past Run:</span>
            <select
              value={selectedRunId}
              onChange={e => handleSelectRun(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 font-mono"
            >
              {history.map(h => (
                <option key={h.runId} value={h.runId}>
                  {h.runId} &mdash; {h.passRate}% pass ({new Date(h.completedAt).toLocaleTimeString()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-sm border border-[#d5dbe3] space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0b3d6e] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#0b3d6e]" />
            <span>Evaluated Scenarios</span>
            <span className="text-xs font-normal text-slate-500">
              ({filteredResults.length} of {currentRun?.results.length || 0} displayed)
            </span>
          </h2>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={expandAll}
              className="text-[#0b3d6e] hover:underline font-medium cursor-pointer"
            >
              Expand All
            </button>
            <span>&middot;</span>
            <button
              onClick={collapseAll}
              className="text-[#0b3d6e] hover:underline font-medium cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by scenario ID, name, or keyword..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-[#0b3d6e]"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-4">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-[#0b3d6e]"
            >
              <option value="ALL">All Categories (A &ndash; H)</option>
              <option value="CATEGORY_A">Category A: Eligibility &amp; Submission</option>
              <option value="CATEGORY_B">Category B: Citizen MCP</option>
              <option value="CATEGORY_C">Category C: Officer MCP</option>
              <option value="CATEGORY_D">Category D: System of Record &amp; DB</option>
              <option value="CATEGORY_E">Category E: 15-Day Deemed Approval</option>
              <option value="CATEGORY_F">Category F: Security &amp; Privacy</option>
              <option value="CATEGORY_G">Category G: Elderly Usability</option>
              <option value="CATEGORY_H">Category H: MCP &amp; Tool Integration</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2.5 text-xs border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-[#0b3d6e]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PASS">PASS Only</option>
              <option value="FAIL">FAIL Only</option>
              <option value="BLOCKED">BLOCKED Only</option>
              <option value="NOT_RUN">NOT RUN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scenarios List */}
      {!currentRun ? (
        <div className="bg-white p-12 text-center border border-[#d5dbe3] rounded-sm space-y-4">
          <Cpu className="w-12 h-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">No Evaluation Results Yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Click the green button above to trigger an end-to-end evaluation run across all 8 statutory categories.
            </p>
          </div>
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className="btn-gov bg-[#1b7e3c] hover:bg-[#14622e] text-white font-bold px-6 py-2 rounded text-sm cursor-pointer shadow-sm"
          >
            ▶ Run All Evaluations Now
          </button>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-white p-8 text-center border border-[#d5dbe3] rounded-sm text-slate-500 text-sm">
          No scenarios matched the current category, status, or search filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map(scenario => {
            const isExpanded = expandedScenarios.has(scenario.id);
            return (
              <div
                key={scenario.id}
                className="bg-white border border-[#d5dbe3] rounded-sm transition-all overflow-hidden shadow-2xs"
              >
                {/* Scenario Header Bar */}
                <div
                  onClick={() => toggleScenario(scenario.id)}
                  className="p-3.5 sm:p-4 flex items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 select-none"
                >
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    {/* Status Badge */}
                    <div className="shrink-0 mt-0.5 sm:mt-0">
                      {scenario.status === 'PASS' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>PASS</span>
                        </span>
                      )}
                      {scenario.status === 'FAIL' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                          <XCircle className="w-3.5 h-3.5 text-red-700" />
                          <span>FAIL</span>
                        </span>
                      )}
                      {scenario.status === 'BLOCKED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          <span>BLOCKED</span>
                        </span>
                      )}
                      {scenario.status === 'NOT_RUN' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>NOT RUN</span>
                        </span>
                      )}
                    </div>

                    {/* ID and Name */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-0.5">
                        <span className="font-mono text-xs font-bold text-[#0b3d6e] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {scenario.id}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          {scenario.categoryLabel.split(':')[0]}
                        </span>
                        {scenario.durationMs > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {scenario.durationMs}ms
                          </span>
                        )}
                      </div>
                      <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {scenario.name}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Arrow */}
                  <div className="shrink-0 text-slate-400 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3.5 text-xs">
                    {/* Description */}
                    <div>
                      <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                        Test Description &amp; Objective
                      </div>
                      <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                        {scenario.description}
                      </p>
                    </div>

                    {/* Persona / Input */}
                    {(scenario.persona || scenario.testInput) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {scenario.persona && (
                          <div>
                            <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                              Target Persona / Role
                            </div>
                            <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-800 font-medium">
                              {scenario.persona}
                            </div>
                          </div>
                        )}
                        {scenario.testInput && (
                          <div>
                            <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                              Controlled Test Input (Sanitized)
                            </div>
                            <pre className="bg-white p-2.5 rounded border border-slate-200 text-slate-800 font-mono text-[11px] overflow-x-auto">
                              {JSON.stringify(scenario.testInput, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expected vs Actual Outcomes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                          Expected Outcome
                        </div>
                        <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-800">
                          {scenario.expectedOutcome}
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                          Actual Outcome &amp; Evidence
                        </div>
                        <div className={`p-2.5 rounded border ${
                          scenario.status === 'PASS'
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950 font-medium'
                            : 'bg-red-50/50 border-red-200 text-red-950 font-medium'
                        }`}>
                          {scenario.actualOutcome}
                        </div>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <div className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                        Technical Explanation &amp; Compliance Rule
                      </div>
                      <p className="text-slate-700 bg-white p-2.5 rounded border border-slate-200 leading-relaxed">
                        {scenario.explanation}
                      </p>
                    </div>

                    {/* Error Details if any */}
                    {scenario.errorDetails && (
                      <div className="bg-red-50 border border-red-200 p-2.5 rounded text-red-800">
                        <div className="font-bold uppercase text-[10px] tracking-wider text-red-900 mb-1">
                          Failure Diagnostics
                        </div>
                        <pre className="font-mono text-[11px] whitespace-pre-wrap">{scenario.errorDetails}</pre>
                      </div>
                    )}

                    {/* Metadata Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                      <div>
                        Executed: {new Date(scenario.executionTimestamp).toLocaleTimeString()} &middot; Duration: {scenario.durationMs}ms
                      </div>
                      {scenario.evidence?.applicationNo && (
                        <div className="font-mono font-bold text-[#0b3d6e]">
                          Test Record Ref: {scenario.evidence.applicationNo}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EvalDashboardView;
