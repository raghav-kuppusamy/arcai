/**
 * Deployments.tsx — Deployment Pipeline Status
 *
 * Tracks every deployment event across four environments: DEV, QA, UAT, and PROD.
 * The page has three main areas:
 *   1. AI Deployment Intelligence — success predictions, risk assessment, lead time trends
 *   2. Environment status cards   — most recent deploy per environment at a glance
 *   3. Pipeline flow diagram       — visualises promotion order (DEV → QA → UAT → PROD)
 *   4. Full deployment history     — chronological list of all deployment events
 */
import { useState, useRef } from 'react';
import { Rocket, CheckCircle, XCircle, Clock, Package, User, Sparkles, Loader2, X, AlertCircle } from 'lucide-react';
import { mockDeployments } from '../data/mockData';

type AgentStepStatus = 'pending' | 'running' | 'done';
interface AgentStep { id: string; label: string; detail?: string; status: AgentStepStatus; }

const AgentStepIcon = ({ status }: { status: AgentStepStatus }) => {
  if (status === 'done')    return <CheckCircle className="size-5 text-green-500 flex-shrink-0 mt-0.5" />;
  if (status === 'running') return <Loader2    className="size-5 text-orange-500 animate-spin flex-shrink-0 mt-0.5" />;
  return <div className="size-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />;
};

/**
 * Deployments — multi-environment deployment health and history.
 */
export function Deployments() {
  /**
   * Returns badge classes for an environment label.
   * PROD uses a solid green to signal its elevated importance.
   */
  const getEnvColor = (env: string) => {
    switch (env) {
      case 'prod':
        return 'bg-green-600 text-white border-green-700';
      case 'uat':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'qa':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'dev':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  /** Returns the icon representing a deployment's current run status. */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="size-5 text-green-500" />;
      case 'failed':
        return <XCircle className="size-5 text-red-500" />;
      case 'in-progress':
        // Spinning clock communicates that work is actively happening
        return <Clock className="size-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="size-5 text-gray-400" />;
    }
  };

  /** Returns Tailwind badge classes for a deployment status value. */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // The environment status cards each need the single most recent deployment.
  // We sort descending by timestamp so index [0] is always the latest.
  const latestByEnv = {
    dev: mockDeployments.filter(d => d.environment === 'dev').sort((a, b) => 
      new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime()
    )[0],
    qa: mockDeployments.filter(d => d.environment === 'qa').sort((a, b) => 
      new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime()
    )[0],
    uat: mockDeployments.filter(d => d.environment === 'uat').sort((a, b) => 
      new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime()
    )[0],
    prod: mockDeployments.filter(d => d.environment === 'prod').sort((a, b) => 
      new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime()
    )[0],
  };

  const successRate = Math.round(
    (mockDeployments.filter(d => d.status === 'success').length / mockDeployments.length) * 100
  );

  // Average pipeline duration across all environments — a proxy for pipeline efficiency
  const avgDuration = Math.round(
    mockDeployments.reduce((sum, d) => sum + d.duration, 0) / mockDeployments.length
  );

  // ─── Agent 1: Deployment Readiness Check ─────────────────────────────────
  interface ReadinessGate   { label: string; status: 'pass' | 'fail' | 'warn'; detail: string; }
  interface ReadinessResult { verdict: 'READY' | 'NOT READY' | 'READY WITH WARNINGS'; gates: ReadinessGate[]; actions: string[]; }

  const [readyOpen,   setReadyOpen]   = useState(false);
  const [readyPhase,  setReadyPhase]  = useState<'idle' | 'running' | 'done'>('idle');
  const [readySteps,  setReadySteps]  = useState<AgentStep[]>([]);
  const [readyResult, setReadyResult] = useState<ReadinessResult | null>(null);
  const readyRunIdRef = useRef(0);

  const READY_STEPS = [
    { id: 'r1', label: 'Scanning current deployment pipeline status',   detail: 'DEV: healthy · QA: healthy · UAT: degraded · PROD: stable',        delay: 500 },
    { id: 'r2', label: 'Validating build artifacts and test results',   detail: 'Build v2.4.1: passed · Unit tests: 94.2% · Integration: passing',  delay: 700 },
    { id: 'r3', label: 'Checking quality gate requirements',            detail: 'SonarQube: Amber · Fortify: 2 high findings unresolved',              delay: 700 },
    { id: 'r4', label: 'Assessing environment health and dependencies', detail: 'UAT DB connectivity issue detected · PROD infra: nominal',           delay: 600 },
    { id: 'r5', label: 'Reviewing change freeze and release calendar',  detail: 'No change freeze · Next release window: Mon Mar 16 06:00 UTC',       delay: 500 },
    { id: 'r6', label: 'Generating deployment readiness report',        detail: 'Verdict: NOT READY · 2 blockers must be resolved first',            delay: 900 },
  ];

  const runReady = async (runId: number) => {
    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
    setReadyPhase('running');
    setReadySteps(READY_STEPS.map(s => ({ id: s.id, label: s.label, status: 'pending' as AgentStepStatus })));
    for (const step of READY_STEPS) {
      if (readyRunIdRef.current !== runId) return;
      setReadySteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s));
      await sleep(step.delay);
      if (readyRunIdRef.current !== runId) return;
      setReadySteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done', detail: step.detail } : s));
    }
    if (readyRunIdRef.current !== runId) return;
    setReadyResult({
      verdict: 'NOT READY',
      gates: [
        { label: 'Build & Tests',     status: 'pass', detail: 'v2.4.1 passed all 847 unit tests (94.2% coverage)'                    },
        { label: 'Quality Gates',     status: 'fail', detail: '2 Fortify high-severity findings (SEC-041, SEC-042) unresolved'        },
        { label: 'UAT Environment',   status: 'fail', detail: 'DB connectivity issue — env not accepting test traffic'               },
        { label: 'Change Window',     status: 'pass', detail: 'No active freeze · Release window opens Mon Mar 16'                    },
        { label: 'Rollback Baseline', status: 'pass', detail: 'Stable baseline v2.3.8 verified and available in all environments'     },
      ],
      actions: [
        'Resolve Fortify findings SEC-041 and SEC-042 before triggering the deploy.',
        'Restore UAT database connectivity — escalate to infra team (ticket INF-789).',
        'Re-run readiness check once both blockers are cleared.',
      ],
    });
    setReadyPhase('done');
  };

  const openReady = () => {
    const runId = ++readyRunIdRef.current;
    setReadyOpen(true); setReadyPhase('idle'); setReadySteps([]); setReadyResult(null);
    setTimeout(() => runReady(runId), 400);
  };

  const gateIcon = (status: ReadinessGate['status']) => {
    if (status === 'pass') return <CheckCircle  className="size-5 text-green-500 flex-shrink-0" />;
    if (status === 'fail') return <XCircle      className="size-5 text-red-500   flex-shrink-0" />;
    return                        <AlertCircle  className="size-5 text-yellow-500 flex-shrink-0" />;
  };

  // ─── Agent 2: Schedule Optimal Deploy Time ──────────────────────────────
  interface DeployWindow   { label: string; riskScore: number; reason: string; recommended: boolean; }
  interface ScheduleResult { recommendedWindow: string; windows: DeployWindow[]; availability: string; note: string; }

  const [scheduleOpen,   setScheduleOpen]   = useState(false);
  const [schedulePhase,  setSchedulePhase]  = useState<'idle' | 'running' | 'done'>('idle');
  const [scheduleSteps,  setScheduleSteps]  = useState<AgentStep[]>([]);
  const [scheduleResult, setScheduleResult] = useState<ScheduleResult | null>(null);
  const scheduleRunIdRef = useRef(0);

  const SCHEDULE_STEPS = [
    { id: 's1', label: 'Analysing historical deployment success patterns', detail: 'Best window: Tue–Thu 06:00–08:00 UTC (94% success rate)',  delay: 600 },
    { id: 's2', label: 'Checking team availability and on-call schedule',  detail: 'Primary on-call: Alex Kim · Secondary: Maria Chen',        delay: 700 },
    { id: 's3', label: 'Reviewing change freeze and release calendar',     detail: 'No active freeze · Sprint 14 ends Mar 15 · Window open', delay: 500 },
    { id: 's4', label: 'Evaluating system load and traffic patterns',      detail: 'Low-traffic window: Mon–Fri 05:00–07:00 UTC',              delay: 700 },
    { id: 's5', label: 'Calculating risk score for candidate windows',     detail: '3 windows evaluated · Best risk score: 0.08 (very low)',  delay: 800 },
    { id: 's6', label: 'Generating optimal deployment schedule',           detail: 'Recommended: Mon Mar 16 · 06:30 UTC',                    delay: 800 },
  ];

  const runSchedule = async (runId: number) => {
    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
    setSchedulePhase('running');
    setScheduleSteps(SCHEDULE_STEPS.map(s => ({ id: s.id, label: s.label, status: 'pending' as AgentStepStatus })));
    for (const step of SCHEDULE_STEPS) {
      if (scheduleRunIdRef.current !== runId) return;
      setScheduleSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s));
      await sleep(step.delay);
      if (scheduleRunIdRef.current !== runId) return;
      setScheduleSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done', detail: step.detail } : s));
    }
    if (scheduleRunIdRef.current !== runId) return;
    setScheduleResult({
      recommendedWindow: 'Mon Mar 16 · 06:30 UTC',
      windows: [
        { label: 'Mon Mar 16  06:30 UTC', riskScore: 0.08, reason: 'Low traffic · Full team on-call · Post-sprint window',  recommended: true  },
        { label: 'Tue Mar 17  07:00 UTC', riskScore: 0.13, reason: 'Acceptable · Slightly higher morning traffic expected', recommended: false },
        { label: 'Wed Mar 18  06:00 UTC', riskScore: 0.21, reason: 'Higher risk — sprint planning starts same day',          recommended: false },
      ],
      availability: 'Alex Kim (primary) and Maria Chen (secondary) confirmed available Mon 06:00–09:00 UTC.',
      note: 'Deploying outside this window during business hours increases incident response time by ~35%.',
    });
    setSchedulePhase('done');
  };

  const openSchedule = () => {
    const runId = ++scheduleRunIdRef.current;
    setScheduleOpen(true); setSchedulePhase('idle'); setScheduleSteps([]); setScheduleResult(null);
    setTimeout(() => runSchedule(runId), 400);
  };

  // ─── Agent 3: View Rollback Strategy ────────────────────────────────────
  interface RollbackTarget { env: string; version: string; deployedAt: string; status: 'verified' | 'available'; estTime: string; }
  interface RollbackResult { rto: string; targets: RollbackTarget[]; steps: string[]; autoTriggers: string[]; }

  const [rollbackOpen,   setRollbackOpen]   = useState(false);
  const [rollbackPhase,  setRollbackPhase]  = useState<'idle' | 'running' | 'done'>('idle');
  const [rollbackSteps,  setRollbackSteps]  = useState<AgentStep[]>([]);
  const [rollbackResult, setRollbackResult] = useState<RollbackResult | null>(null);
  const rollbackRunIdRef = useRef(0);

  const ROLLBACK_STEPS = [
    { id: 'rb1', label: 'Loading deployment history and rollback records',   detail: 'Last 10 deployments loaded · 2 rollbacks in 30 days',      delay: 500 },
    { id: 'rb2', label: 'Identifying stable rollback targets per environment', detail: 'PROD: v2.3.8 · UAT: v2.4.0 · QA: v2.4.1 · DEV: v2.4.2', delay: 700 },
    { id: 'rb3', label: 'Analysing rollback impact and DB migrations',        detail: 'v2.3.8 rollback: reversible · No destructive schema changes', delay: 700 },
    { id: 'rb4', label: 'Evaluating automated rollback trigger thresholds',   detail: 'Error rate >5% triggers auto-rollback · Health timeout: 30s', delay: 600 },
    { id: 'rb5', label: 'Verifying environment baselines are intact',         detail: 'All 4 environment baselines verified and accessible',          delay: 600 },
    { id: 'rb6', label: 'Compiling rollback runbook',                         detail: 'Runbook ready · Estimated RTO: ~4 minutes',                  delay: 900 },
  ];

  const runRollback = async (runId: number) => {
    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
    setRollbackPhase('running');
    setRollbackSteps(ROLLBACK_STEPS.map(s => ({ id: s.id, label: s.label, status: 'pending' as AgentStepStatus })));
    for (const step of ROLLBACK_STEPS) {
      if (rollbackRunIdRef.current !== runId) return;
      setRollbackSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s));
      await sleep(step.delay);
      if (rollbackRunIdRef.current !== runId) return;
      setRollbackSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done', detail: step.detail } : s));
    }
    if (rollbackRunIdRef.current !== runId) return;
    setRollbackResult({
      rto: '~4 minutes',
      targets: [
        { env: 'PROD', version: 'v2.3.8', deployedAt: 'Mar 1, 2026',  status: 'verified',  estTime: '~4 min' },
        { env: 'UAT',  version: 'v2.4.0', deployedAt: 'Mar 8, 2026',  status: 'verified',  estTime: '~3 min' },
        { env: 'QA',   version: 'v2.4.1', deployedAt: 'Mar 10, 2026', status: 'available', estTime: '~2 min' },
        { env: 'DEV',  version: 'v2.4.2', deployedAt: 'Mar 12, 2026', status: 'available', estTime: '~1 min' },
      ],
      steps: [
        'Run: pipeline rollback --env=prod --to=v2.3.8',
        'Confirm health check passes within 30 s on all instances.',
        'Verify error rate returns below 1% on monitoring dashboard.',
        'Notify stakeholders via #deployments Slack channel.',
        'Open post-incident review ticket within 24 hours.',
      ],
      autoTriggers: [
        'Error rate exceeds 5% for more than 60 consecutive seconds',
        'Health check endpoint returns non-200 for 3 consecutive checks (30 s apart)',
        'P95 latency exceeds 2 000 ms for more than 90 seconds',
      ],
    });
    setRollbackPhase('done');
  };

  const openRollback = () => {
    const runId = ++rollbackRunIdRef.current;
    setRollbackOpen(true); setRollbackPhase('idle'); setRollbackSteps([]); setRollbackResult(null);
    setTimeout(() => runRollback(runId), 400);
  };

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Deployment Status</h2>
        <p className="text-gray-600 mt-1">Track deployments across Dev, QA, UAT, and Production environments</p>
      </div>

      {/* AI Insights for Deployments */}
      <div className="bg-gray-200 rounded-lg p-6 shadow-md text-gray-900">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2 text-[#163A5F]">
              <Sparkles className="size-5" />
              Deployment Intelligence
            </h3>
            <div className="space-y-2 text-sm opacity-95">
              <p>
                <strong>Next Production Deployment Risk:</strong> Production is on v1.1.0 (Sprint 1 — auth complete).
                v1.1.1 promotion to prod is blocked until PROJ-124 (API timeout critical defect) is resolved and the
                Stripe integration (PROJ-1246) passes UAT sign-off. Estimated earliest prod window: Mar 14–16.
              </p>
              <p>
                <strong>Pipeline Status:</strong> Dev build v1.1.2-snapshot is <strong>in-progress</strong> — PROJ-124 fix pipeline still running,
                2 AI review issues flagged (retry backoff, hardcoded timeout). QA build v1.1.1-rc has PROJ-1246 (Stripe) deployed and
                PR approved — ready for UAT promotion once QA sign-off is received. UAT currently holds only the PROJ-1250 DB fix.
              </p>
              <p>
                <strong>Promotion Readiness:</strong> QA → UAT: PROJ-1246 (Stripe) is approved and QA pipeline succeeded —
                promote once QA team confirms test pass. DEV → QA: blocked on PROJ-124 AI review resolution.
                Resolve exponential backoff issue in <code>src/payment/api-client.ts</code> before next QA build trigger.
              </p>
              <p>
                <strong>Environment Health & Lead Time:</strong> Pipeline durations — DEV 3 min · QA 5 min · UAT 5 min · PROD 8 min.
                Lead time for Sprint 2 Stripe feature (commit → QA): 4 days. PROJ-124 fix at day 2 in-progress.
                Production uptime: 99.97% since v1.1.0 deployed Feb 28. No rollbacks recorded.
              </p>
            </div>
            <div className="mt-4 flex gap-3 flex-wrap">
              <button onClick={openReady}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium transition-colors">
                🎯 Run Deployment Readiness Check
              </button>
              <button onClick={openSchedule}
                className="bg-[#163A5F] text-white hover:bg-[#1e4d7b] px-4 py-2 rounded text-sm font-medium transition-colors">
                📅 Schedule Optimal Deploy Time
              </button>
              <button onClick={openRollback}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium transition-colors">
                🔄 View Rollback Strategy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Total Deployments</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{mockDeployments.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Success Rate</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{successRate}%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Avg Duration</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{avgDuration} min</p>
        </div>
      </div>

      {/* Environment Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(['dev', 'qa', 'uat', 'prod'] as const).map(env => {
          const deployment = latestByEnv[env];
          return (
            <div key={env} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className={`px-4 py-2 border-b font-semibold uppercase text-sm ${getEnvColor(env)}`}>
                {env}
              </div>
              {deployment ? (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">{deployment.version}</span>
                    {getStatusIcon(deployment.status)}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="size-4" />
                      <span>{new Date(deployment.deployedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="size-4" />
                      <span className="truncate">{deployment.deployedBy}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Package className="size-4" />
                      <span>{deployment.features.length} features</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(deployment.status)}`}>
                      {deployment.status}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400">
                  No deployments
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Deployment Pipeline Flow */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Deployment Pipeline Flow</h3>
        
        <div className="flex items-center justify-between">
          {(['dev', 'qa', 'uat', 'prod'] as const).map((env, index) => {
            const deployment = latestByEnv[env];
            return (
              <div key={env} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`px-4 py-2 rounded-lg font-semibold uppercase text-sm border-2 ${getEnvColor(env)}`}>
                    {env}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {deployment ? deployment.version : 'N/A'}
                  </div>
                  {deployment && (
                    <div className="mt-1">
                      {getStatusIcon(deployment.status)}
                    </div>
                  )}
                </div>
                
                {index < 3 && (
                  <div className="mx-2 text-gray-400">
                    →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deployment History */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Deployment History</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {mockDeployments
            .sort((a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime())
            .map(deployment => (
            <div key={deployment.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Rocket className="size-6 text-blue-600" />
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-900">{deployment.version}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border-2 uppercase ${getEnvColor(deployment.environment)}`}>
                        {deployment.environment}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(deployment.status)}`}>
                        {deployment.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Deployed {new Date(deployment.deployedAt).toLocaleString()} by {deployment.deployedBy}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-semibold text-gray-900">{deployment.duration} min</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {deployment.features.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Features ({deployment.features.length})</p>
                    <div className="space-y-1">
                      {deployment.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle className="size-4 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deployment.defectsFixes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Defect Fixes ({deployment.defectsFixes.length})</p>
                    <div className="space-y-1">
                      {deployment.defectsFixes.map((defect, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <XCircle className="size-4 text-red-500" />
                          <span>{defect}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* ── AI Deployment Readiness Check modal ──────────────────────── */}
    {readyOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => readyPhase !== 'running' && setReadyOpen(false)} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-[#163A5F]">
            <div className="flex items-center gap-3 text-white">
              <Sparkles className="size-5" />
              <h2 className="font-semibold text-lg">AI Deployment Readiness Agent</h2>
            </div>
            {readyPhase !== 'running' && (
              <button onClick={() => setReadyOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {readyPhase === 'idle' && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                <Loader2 className="size-8 animate-spin" />
                <p className="text-sm">Starting readiness check…</p>
              </div>
            )}
            {readySteps.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Activity</p>
                {readySteps.map(step => (
                  <div key={step.id} className="flex items-start gap-3">
                    <AgentStepIcon status={step.status} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>{step.label}</p>
                      {step.detail && step.status === 'done' && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {readyPhase === 'done' && readyResult && (
              <>
                <div className={`rounded-lg p-4 border ${
                  readyResult!.verdict === 'READY'
                    ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-2xl font-bold ${
                    readyResult!.verdict === 'READY' ? 'text-green-700' : 'text-red-700'
                  }`}>{readyResult!.verdict}</p>
                  <p className="text-sm mt-1 text-gray-600">
                    {readyResult!.verdict === 'READY'
                      ? 'All gates passed. Safe to deploy.'
                      : '2 blockers must be resolved before deploying to production.'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Gate Checks</p>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                    {readyResult!.gates.map((gate, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3 bg-white hover:bg-gray-50">
                        {gateIcon(gate.status)}
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{gate.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{gate.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Required Actions</p>
                  <div className="space-y-2">
                    {readyResult!.actions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertCircle className="size-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={() => setReadyOpen(false)} disabled={readyPhase === 'running'}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Close
            </button>
            {readyPhase === 'done' && (
              <button onClick={() => { setReadyOpen(false); openSchedule(); }}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors">
                Schedule Deploy
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── AI Schedule Optimal Deploy Time modal ───────────────────── */}
    {scheduleOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => schedulePhase !== 'running' && setScheduleOpen(false)} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-[#163A5F]">
            <div className="flex items-center gap-3 text-white">
              <Sparkles className="size-5" />
              <h2 className="font-semibold text-lg">AI Deploy Scheduler Agent</h2>
            </div>
            {schedulePhase !== 'running' && (
              <button onClick={() => setScheduleOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {schedulePhase === 'idle' && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                <Loader2 className="size-8 animate-spin" />
                <p className="text-sm">Analysing deployment windows…</p>
              </div>
            )}
            {scheduleSteps.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Activity</p>
                {scheduleSteps.map(step => (
                  <div key={step.id} className="flex items-start gap-3">
                    <AgentStepIcon status={step.status} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>{step.label}</p>
                      {step.detail && step.status === 'done' && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {schedulePhase === 'done' && scheduleResult && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Recommended Window</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{scheduleResult!.recommendedWindow}</p>
                  <p className="text-sm text-green-600 mt-1">Risk score: 0.08 / 1.0 — Very Low</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Candidate Windows</p>
                  <div className="space-y-2">
                    {scheduleResult!.windows.map((w, i) => (
                      <div key={i} className={`flex items-start gap-3 rounded-lg p-3 border ${
                        w.recommended ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-gray-900">{w.label}</span>
                            {w.recommended && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Recommended</span>}
                          </div>
                          <p className="text-xs text-gray-500">{w.reason}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">Risk</p>
                          <p className={`text-sm font-bold ${
                            w.riskScore < 0.1 ? 'text-green-600' : w.riskScore < 0.2 ? 'text-yellow-600' : 'text-red-600'
                          }`}>{w.riskScore.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Team Availability</p>
                  <p className="text-sm text-blue-800">{scheduleResult!.availability}</p>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <AlertCircle className="size-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>{scheduleResult!.note}</span>
                </div>
              </>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={() => setScheduleOpen(false)} disabled={schedulePhase === 'running'}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Close
            </button>
            {schedulePhase === 'done' && (
              <button onClick={() => setScheduleOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                Confirm Schedule
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── AI View Rollback Strategy modal ─────────────────────────── */}
    {rollbackOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => rollbackPhase !== 'running' && setRollbackOpen(false)} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-[#163A5F]">
            <div className="flex items-center gap-3 text-white">
              <Sparkles className="size-5" />
              <h2 className="font-semibold text-lg">AI Rollback Strategy Agent</h2>
            </div>
            {rollbackPhase !== 'running' && (
              <button onClick={() => setRollbackOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {rollbackPhase === 'idle' && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                <Loader2 className="size-8 animate-spin" />
                <p className="text-sm">Loading rollback strategy…</p>
              </div>
            )}
            {rollbackSteps.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Activity</p>
                {rollbackSteps.map(step => (
                  <div key={step.id} className="flex items-start gap-3">
                    <AgentStepIcon status={step.status} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>{step.label}</p>
                      {step.detail && step.status === 'done' && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {rollbackPhase === 'done' && rollbackResult && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-6">
                  <div className="text-center flex-shrink-0">
                    <p className="text-3xl font-bold text-blue-700">{rollbackResult!.rto}</p>
                    <p className="text-xs text-blue-600 mt-1">Estimated RTO</p>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900">Rollback Runbook Ready</p>
                    <p className="text-sm text-blue-700 mt-1">All 4 environment baselines verified. Auto-rollback triggers configured.</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Rollback Targets</p>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                    {rollbackResult!.targets.map((t, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-500 w-8">{t.env}</span>
                          <span className="text-sm font-semibold text-gray-900">{t.version}</span>
                          <span className="text-xs text-gray-400">{t.deployedAt}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            t.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>{t.status}</span>
                          <span className="text-xs text-gray-500">{t.estTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Rollback Procedure</p>
                  <div className="space-y-2">
                    {rollbackResult!.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="size-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-sm text-gray-700">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Auto-Rollback Triggers</p>
                  <div className="space-y-2">
                    {rollbackResult!.autoTriggers.map((trigger, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertCircle className="size-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <span>{trigger}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={() => setRollbackOpen(false)} disabled={rollbackPhase === 'running'}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Close
            </button>
            {rollbackPhase === 'done' && (
              <button onClick={() => setRollbackOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors">
                Acknowledge
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}