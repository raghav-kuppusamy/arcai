/**
 * Dashboard.tsx — Project Health Overview
 *
 * The landing page of Arc AI. It provides an at-a-glance view of the entire
 * delivery pipeline: planning progress, Jira sprint health, GitHub PR activity,
 * deployment pipeline status, quality guardrails, and detected bottlenecks.
 *
 * Every section card is a clickable link that navigates to its detail page,
 * so teams can drill down into any area of concern without leaving the dashboard.
 *
 * Data comes from mockData.ts (will be replaced by API calls in production).
 */
import { useState, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Clock,
  GitPullRequest,
  Rocket,
  CheckSquare,
  Brain,
  Target,
  Calendar,
  FileText,
  Users,
  Activity,
  ArrowRight,
  Zap,
  Shield,
  GitBranch,
  Package,
  Sparkles,
  FileCode,
  Bug,
  Lock,
  TestTube,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';
import { Link } from 'react-router';
import {
  mockUserStories,
  mockPullRequests,
  mockDeployments,
  mockBottlenecks,
  mockEpics,
  mockMilestones,
  mockChangeRequests,
  mockSignOffs,
  velocityTrend,
  cycleTimeData,
  defectTrend,
  mockESLintReport,
  mockSonarQubeAnalysis,
  mockFortifyScan,
  mockUnitTestExecution,
  mockSecurityScans,
} from '../data/mockData';
import { LineChart, Line, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

/** Custom Recharts bar shape that renders a lollipop: a thin stem + filled circle head. */
const LollipopBar = (props: {
  x?: number; y?: number; width?: number; height?: number; fill?: string;
}) => {
  const { x = 0, y = 0, width = 0, height = 0, fill = '#8884d8' } = props;
  if (height <= 0) return null;
  const cx = x + width / 2;
  const r = Math.min(width / 2, 7);
  return (
    <g>
      <line x1={cx} y1={y + height} x2={cx} y2={y + r} stroke={fill} strokeWidth={2.5} />
      <circle cx={cx} cy={y + r} r={r} fill={fill} />
    </g>
  );
};

type AgentStepStatus = 'pending' | 'running' | 'done';
interface AgentStep { id: string; label: string; detail?: string; status: AgentStepStatus; }

const AgentStepIcon = ({ status }: { status: AgentStepStatus }) => {
  if (status === 'done')    return <CheckCircle className="size-5 text-green-500 flex-shrink-0 mt-0.5" />;
  if (status === 'running') return <Loader2    className="size-5 text-indigo-500 animate-spin flex-shrink-0 mt-0.5" />;
  return <div className="size-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />;
};

const escHtml = (s: string): string =>
  s.replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&#39;');

/**
 * Dashboard — cross-cutting project health view.
 * All computed metrics are derived inline from mock data.
 * When real APIs arrive, replace the mock imports with API hooks.
 */
export function Dashboard() {
  // ─── Jira metrics ─────────────────────────────────────────────────────
  const totalStories = mockUserStories.length;
  const refinedStories = mockUserStories.filter(s => s.isRefined).length;
  const inProgressStories = mockUserStories.filter(s => s.status === 'in-progress').length;
  const defects = mockUserStories.filter(s => s.type === 'defect').length;
  // Refinement rate tells us how sprint-planning-ready the backlog is
  const refinementRate = Math.round((refinedStories / totalStories) * 100);

  // ─── GitHub PR metrics ───────────────────────────────────────────────
  const totalPRs = mockPullRequests.length;
  const openPRs = mockPullRequests.filter(pr => pr.status === 'open' || pr.status === 'under-review').length;
  // Average age only counts non-merged PRs — merged ones are 0-day by definition
  const nonMergedPRs = mockPullRequests.filter(pr => pr.status !== 'merged');
  const avgPRAge = nonMergedPRs.length > 0
    ? Math.round(nonMergedPRs.reduce((sum, pr) => sum + pr.daysOpen, 0) / nonMergedPRs.length)
    : 0;

  // ─── Deployment metrics ──────────────────────────────────────────────
  const successfulDeploys = mockDeployments.filter(d => d.status === 'success').length;
  const deploymentRate = Math.round((successfulDeploys / mockDeployments.length) * 100);
  const failedDeploys = mockDeployments.filter(d => d.status === 'failed').length;

  // Most recent deploy per environment — sorted descending by deployedAt
  const latestDeploys = {
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

  // ─── Bottleneck summary ──────────────────────────────────────────────
  // 'high' severity maps to what the UI calls 'Critical'
  const criticalBottlenecks = mockBottlenecks.filter(b => b.severity === 'high').length;

  // ─── Planning metrics ───────────────────────────────────────────────
  const activeEpics = mockEpics.filter(e => e.status === 'in-progress').length;
  const totalEpics = mockEpics.length;
  const completedEpics = mockEpics.filter(e => e.status === 'completed').length;
  const activeMilestones = mockMilestones.filter(m => m.status === 'active').length;
  const delayedMilestones = mockMilestones.filter(m => m.status === 'delayed').length;
  const pendingChangeRequests = mockChangeRequests.filter(c => c.status === 'pending').length;
  const pendingSignOffs = mockSignOffs.filter(s => s.status === 'pending').length;

  // ─── Detailed PR metrics ─────────────────────────────────────────────
  // Stale = open for more than a week without being merged
  const stalePRs = mockPullRequests.filter(pr => pr.daysOpen > 7 && pr.status !== 'merged').length;
  const conflictPRs = mockPullRequests.filter(pr => pr.hasConflicts).length;
  const mergedPRs = mockPullRequests.filter(pr => pr.status === 'merged').length;

  // ─── Chart data ────────────────────────────────────────────────────
  // Distribution of stories across workflow statuses — feeds the pie chart
  const storyStatusData = [
    { name: 'Backlog',      value: mockUserStories.filter(s => s.status === 'backlog').length,      color: '#94a3b8' },
    { name: 'Refined',     value: mockUserStories.filter(s => s.status === 'refined').length,     color: '#3b82f6' },
    { name: 'In Progress', value: mockUserStories.filter(s => s.status === 'in-progress').length, color: '#f59e0b' },
    { name: 'In Review',   value: mockUserStories.filter(s => s.status === 'in-review').length,   color: '#8b5cf6' },
    { name: 'Done',        value: mockUserStories.filter(s => s.status === 'done').length,        color: '#10b981' },
  ];

  // These colours mirror the status colours defined in storyStatusData above
  const COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

  /** Colour helpers for health indicators. */
  const indicatorColor = (status: 'good' | 'warning' | 'critical') => {
    switch (status) {
      case 'good':     return { dot: 'bg-green-500',  text: 'text-green-700'  };
      case 'warning':  return { dot: 'bg-yellow-500', text: 'text-yellow-700' };
      case 'critical': return { dot: 'bg-red-500',    text: 'text-red-700'   };
    }
  };

  // ─── View Full Analysis agent ───────────────────────────────────────────
  interface DeliveryIndicator { label: string; value: string; status: 'good' | 'warning' | 'critical'; }
  interface AnalysisItem       { label: string; value: string; note?: string; }
  interface AnalysisSection    { title: string; items: AnalysisItem[]; }
  interface DeliveryAnalysis   { score: number; label: 'Green' | 'Amber' | 'Red'; indicators: DeliveryIndicator[]; sections: AnalysisSection[]; keyFindings: string[]; }

  const [hoveredStatus, setHoveredStatus]   = useState<string | null>(null);

  const [analysisOpen, setAnalysisOpen]     = useState(false);
  const [analysisPhase, setAnalysisPhase]   = useState<'idle' | 'running' | 'done'>('idle');
  const [analysisSteps, setAnalysisSteps]   = useState<AgentStep[]>([]);
  const [analysisResult, setAnalysisResult] = useState<DeliveryAnalysis | null>(null);
  const analysisRunIdRef = useRef(0);

  const ANALYSIS_STEPS = [
    { id: 'a1', label: 'Aggregating data across all delivery pipeline stages', detail: '12 stories · 8 PRs · 24 deployments · 4 epics loaded',        delay: 600 },
    { id: 'a2', label: 'Analysing sprint velocity and story completion trends', detail: 'Velocity: 28/35 pts (80%) · 2 defects active · 1 blocked',  delay: 800 },
    { id: 'a3', label: 'Evaluating PR review health and code quality',          detail: '3 PRs stale · avg review: 2.3 days · 2 pipeline failures',  delay: 700 },
    { id: 'a4', label: 'Reviewing deployment pipeline status',                  detail: 'Prod: healthy · UAT: degraded · 2 rollbacks last 30 days',  delay: 700 },
    { id: 'a5', label: 'Assessing quality guardrails and security gates',       detail: 'SonarQube: Amber · Fortify: 2 high findings · Tests: 94.2%', delay: 700 },
    { id: 'a6', label: 'Compiling cross-cutting delivery health report',        detail: 'Score: 72/100 (Amber) · 3 critical actions identified',       delay: 900 },
  ];

  const runAnalysis = async (runId: number) => {
    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
    setAnalysisPhase('running');
    setAnalysisSteps(ANALYSIS_STEPS.map(s => ({ id: s.id, label: s.label, status: 'pending' as AgentStepStatus })));
    for (const step of ANALYSIS_STEPS) {
      if (analysisRunIdRef.current !== runId) return;
      setAnalysisSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s));
      await sleep(step.delay);
      if (analysisRunIdRef.current !== runId) return;
      setAnalysisSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done', detail: step.detail } : s));
    }
    if (analysisRunIdRef.current !== runId) return;
    setAnalysisResult({
      score: 72, label: 'Amber',
      indicators: [
        { label: 'Sprint Velocity',    value: '80% of target',    status: 'warning'  },
        { label: 'PR Health',          value: '3 stale PRs',      status: 'warning'  },
        { label: 'Deployment Health',  value: 'UAT degraded',     status: 'critical' },
        { label: 'Code Quality',       value: 'SonarQube: Amber', status: 'warning'  },
        { label: 'Security Posture',   value: '2 high findings',  status: 'critical' },
        { label: 'Test Coverage',      value: '94.2% — passing',  status: 'good'     },
      ],
      sections: [
        { title: 'Sprint & Stories', items: [
          { label: 'Velocity',        value: '28 / 35 pts', note: 'Below 35 pt target'              },
          { label: 'Refinement rate', value: '72%',         note: '4 unrefined stories in backlog'  },
          { label: 'Active blockers', value: '1',           note: 'PROJ-1248 blocked by QA env'     },
          { label: 'Active defects',  value: '2',           note: 'Both medium priority'            },
        ]},
        { title: 'PRs & Deployments', items: [
          { label: 'Open PRs',         value: '5',        note: '3 stale (>7 days)'          },
          { label: 'Avg review time',  value: '2.3 days', note: 'Target: <1 day'             },
          { label: 'Deploy success',   value: '87.5%',    note: '2 failures in last 14 days' },
          { label: 'Prod uptime',      value: '99.9%',    note: 'Within SLA'                 },
        ]},
        { title: 'Quality & Security', items: [
          { label: 'SonarQube gate',    value: 'Amber',   note: '12 code smells · 3 bugs'      },
          { label: 'Fortify findings',  value: '2 high',  note: 'Remediation due this sprint' },
          { label: 'Test pass rate',    value: '94.2%',   note: '8 tests failing'             },
          { label: 'ESLint errors',     value: '3',       note: 'Fix before next release'     },
        ]},
      ],
      keyFindings: [
        'UAT environment is degraded — unblocking it is critical to the Release 2.5.0 milestone.',
        '2 Fortify high-severity findings must be remediated before the Sprint 15 quality gate.',
        'PR review time is 2.3× above SLA — enforce review time limits to unblock 3 stale PRs.',
      ],
    });
    setAnalysisPhase('done');
  };

  const openAnalysis = () => {
    const runId = ++analysisRunIdRef.current;
    setAnalysisOpen(true); setAnalysisPhase('idle'); setAnalysisSteps([]); setAnalysisResult(null);
    setTimeout(() => { runAnalysis(runId); }, 400);
  };

  /** Builds a styled HTML print document from the live analysisResult and opens it for PDF save. */
  const downloadAnalysisPdf = () => {
    if (!analysisResult) return;

    const scoreColor = analysisResult.label === 'Green' ? '#166534'
      : analysisResult.label === 'Amber' ? '#92400e' : '#991b1b';
    const scoreBg = analysisResult.label === 'Green' ? '#dcfce7'
      : analysisResult.label === 'Amber' ? '#fef3c7' : '#fee2e2';

    const indicatorDot = (status: string) =>
      status === 'good' ? '#22c55e' : status === 'warning' ? '#eab308' : '#ef4444';

    const indicatorsHtml = analysisResult.indicators.map(ind => `
      <div style="display:flex;align-items:center;gap:10px;background:#f9fafb;border:1px solid #e5e7eb;
                  border-radius:8px;padding:10px 14px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${indicatorDot(ind.status)};flex-shrink:0;"></div>
        <div>
          <div style="font-size:11px;color:#6b7280;">${escHtml(ind.label)}</div>
          <div style="font-size:13px;font-weight:600;color:#111827;">${escHtml(ind.value)}</div>
        </div>
      </div>`).join('');

    const sectionsHtml = analysisResult.sections.map(section => {
      const rows = section.items.map(item => `
        <tr>
          <td style="padding:6px 10px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">${escHtml(item.label)}</td>
          <td style="padding:6px 10px;font-size:12px;font-weight:600;text-align:right;border-bottom:1px solid #f3f4f6;">${escHtml(item.value)}</td>
          <td style="padding:6px 10px;font-size:11px;color:#9ca3af;border-bottom:1px solid #f3f4f6;">${escHtml(item.note ?? '')}</td>
        </tr>`).join('');
      return `
        <div style="break-inside:avoid;">
          <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;
                      color:#6b7280;margin-bottom:6px;">${escHtml(section.title)}</div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">${rows}</table>
        </div>`;
    }).join('<div style="height:16px;"></div>');

    const findingsHtml = analysisResult.keyFindings.map(f => `
      <div style="display:flex;gap:8px;font-size:12px;color:#374151;margin-bottom:8px;">
        <span style="color:#6366f1;flex-shrink:0;">&#9679;</span><span>${escHtml(f)}</span>
      </div>`).join('');

    const now = new Date().toLocaleString();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Arc AI — Delivery Analysis</title>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
           color:#111827; background:#fff; padding:40px; max-width:820px; margin:auto; }
    @media print {
      body { padding:20px; }
      @page { size:A4; margin:20mm; }
    }
    .divider { border:none; border-top:1px solid #e5e7eb; margin:22px 0; }
    .label   { font-size:10px; font-weight:600; text-transform:uppercase;
               letter-spacing:.06em; color:#6b7280; margin-bottom:10px; }
    .indicators-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
    <div>
      <div style="font-size:11px;color:#6366f1;font-weight:600;margin-bottom:4px;">ARC AI · DELIVERY ANALYSIS</div>
      <h1 style="font-size:22px;font-weight:700;color:#1e1b4b;">Delivery Health Report</h1>
      <p style="font-size:13px;color:#6b7280;margin-top:4px;">Arc AI Delivery Team</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#6b7280;line-height:1.7;">
      <div>Generated</div>
      <div style="font-weight:600;color:#111827;">${now}</div>
    </div>
  </div>

  <!-- Health score -->
  <div style="display:flex;align-items:center;gap:20px;background:${scoreBg};
              border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin-bottom:8px;">
    <div style="text-align:center;flex-shrink:0;">
      <div style="font-size:48px;font-weight:700;color:${scoreColor};">${analysisResult.score}</div>
      <div style="font-size:11px;color:${scoreColor};font-weight:600;">/ 100</div>
    </div>
    <div>
      <div style="font-size:17px;font-weight:700;color:${scoreColor};">Delivery Health: ${escHtml(analysisResult.label)}</div>
      <div style="font-size:13px;color:#374151;margin-top:4px;">
        Three critical areas require immediate attention to protect the Release 2.5.0 milestone.
      </div>
    </div>
  </div>

  <hr class="divider" />

  <!-- Health indicators -->
  <div class="label">Health Indicators</div>
  <div class="indicators-grid">${indicatorsHtml}</div>

  <hr class="divider" />

  <!-- Breakdown sections -->
  <div class="label">Breakdown</div>
  ${sectionsHtml}

  <hr class="divider" />

  <!-- Key findings -->
  <div class="label">Key Findings</div>
  ${findingsHtml}

  <hr class="divider" />
  <div style="text-align:center;font-size:11px;color:#9ca3af;">
    Arc AI · Confidential · Generated ${now}
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (win) { win.document.write(html); win.document.close(); }
  };

  // ─── Generate Report agent ───────────────────────────────────────────────
  interface ReportSection  { title: string; status: 'On Track' | 'At Risk' | 'Delayed'; metrics: { label: string; value: string }[]; }
  interface DeliveryReport { period: string; generatedAt: string; team: string; executiveSummary: string; sections: ReportSection[]; }

  const [reportOpen, setReportOpen]   = useState(false);
  const [reportPhase, setReportPhase] = useState<'idle' | 'running' | 'done' | 'downloading'>('idle');
  const [reportSteps, setReportSteps] = useState<AgentStep[]>([]);
  const [report, setReport]           = useState<DeliveryReport | null>(null);
  const reportRunIdRef = useRef(0);

  const REPORT_STEPS = [
    { id: 'r1', label: 'Fetching sprint and backlog metrics',           detail: '12 stories · 35 pts planned · 28 pts completed',      delay: 500  },
    { id: 'r2', label: 'Compiling PR review and code quality data',     detail: '8 PRs · avg 2.3 days review · SonarQube: Amber',    delay: 700  },
    { id: 'r3', label: 'Pulling deployment and release statistics',     detail: '24 deployments · 87.5% success · 2 rollbacks',        delay: 600  },
    { id: 'r4', label: 'Calculating velocity trends and forecasts',     detail: 'Current: 28 pts · Forecast: 30 pts next sprint',       delay: 800  },
    { id: 'r5', label: 'Formatting executive summary sections',         detail: '4 sections ready · 3 risk items flagged',              delay: 700  },
    { id: 'r6', label: 'Generating delivery report document',           detail: 'Report compiled — ready for download',                delay: 1100 },
  ];

  const runReport = async (runId: number) => {
    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
    setReportPhase('running');
    setReportSteps(REPORT_STEPS.map(s => ({ id: s.id, label: s.label, status: 'pending' as AgentStepStatus })));
    for (const step of REPORT_STEPS) {
      if (reportRunIdRef.current !== runId) return;
      setReportSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s));
      await sleep(step.delay);
      if (reportRunIdRef.current !== runId) return;
      setReportSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done', detail: step.detail } : s));
    }
    if (reportRunIdRef.current !== runId) return;
    setReport({
      period: 'Sprint 14 · Mar 1–15, 2026',
      generatedAt: new Date().toLocaleString(),
      team: 'Arc AI Delivery Team',
      executiveSummary:
        'Sprint 14 is progressing at 80% of its 35-point velocity target. The UAT environment is currently degraded, posing a direct risk to the Release 2.5.0 milestone. Two Fortify high-severity security findings require remediation before the Sprint 15 quality gate. PR review time is 2.3× above the SLA target. Immediate actions are recommended to unblock the QA environment and enforce review time limits.',
      sections: [
        { title: 'Planning & Epics',  status: 'At Risk',  metrics: [{ label: 'Active epics',    value: '3 / 4' }, { label: 'Milestone risk',  value: 'Release 2.5.0' }, { label: 'Pending CRs',    value: '3 (1 critical)' }] },
        { title: 'Development',       status: 'On Track', metrics: [{ label: 'Sprint velocity', value: '28 / 35 pts' }, { label: 'Refinement',    value: '72%' }, { label: 'Blockers',       value: '1 active' }] },
        { title: 'Code Quality',      status: 'At Risk',  metrics: [{ label: 'SonarQube gate',  value: 'Amber' }, { label: 'Fortify high',  value: '2 findings' }, { label: 'Test coverage',  value: '94.2%' }] },
        { title: 'Deployments',       status: 'At Risk',  metrics: [{ label: 'Success rate',    value: '87.5%' }, { label: 'UAT status',    value: 'Degraded' }, { label: 'Prod uptime',   value: '99.9%' }] },
      ],
    });
    setReportPhase('done');
  };

  const openReport = () => {
    const runId = ++reportRunIdRef.current;
    setReportOpen(true); setReportPhase('idle'); setReportSteps([]); setReport(null);
    setTimeout(() => { runReport(runId); }, 400);
  };

  const handleDownload = () => {
    if (!report) return;
    setReportPhase('downloading');

    // Build a self-contained HTML print document from the live report state.
    const sectionRows = report.sections.map(section => {
      const statusColor = section.status === 'On Track'
        ? '#166534' : section.status === 'At Risk' ? '#854d0e' : '#991b1b';
      const statusBg = section.status === 'On Track'
        ? '#dcfce7' : section.status === 'At Risk' ? '#fef9c3' : '#fee2e2';
      const metricsHtml = section.metrics.map(m =>
        `<tr>
          <td style="padding:4px 8px;color:#6b7280;font-size:12px;">${escHtml(m.label)}</td>
          <td style="padding:4px 8px;font-weight:600;font-size:12px;text-align:right;">${escHtml(m.value)}</td>
        </tr>`
      ).join('');
      return `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <strong style="font-size:13px;">${escHtml(section.title)}</strong>
            <span style="background:${statusBg};color:${statusColor};padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;">${escHtml(section.status)}</span>
          </div>
          <table style="width:100%;border-collapse:collapse;">${metricsHtml}</table>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Arc AI — Delivery Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           color: #111827; background: #fff; padding: 40px; max-width: 800px; margin: auto; }
    @media print {
      body { padding: 20px; }
      @page { size: A4; margin: 20mm; }
    }
    h1 { font-size: 22px; font-weight: 700; color: #065f46; }
    .meta { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .meta-right { text-align:right; font-size:12px; color:#6b7280; line-height:1.6; }
    .badge { background:#d1fae5; color:#065f46; padding:2px 10px; border-radius:999px;
             font-size:11px; font-weight:600; }
    .divider { border:none; border-top:1px solid #e5e7eb; margin:20px 0; }
    .label { font-size:10px; font-weight:600; text-transform:uppercase;
             letter-spacing:.06em; color:#6b7280; margin-bottom:8px; }
    .summary-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;
                   padding:16px; font-size:13px; line-height:1.7; color:#374151; }
    .sections-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:8px; }
    .footer { margin-top:32px; text-align:center; font-size:11px; color:#9ca3af; }
  </style>
</head>
<body>
  <div class="meta">
    <div>
      <div style="font-size:11px;color:#059669;font-weight:600;margin-bottom:4px;">ARC AI · DELIVERY REPORT</div>
      <h1>${escHtml(report.period)}</h1>
      <p style="font-size:13px;color:#6b7280;margin-top:4px;">${escHtml(report.team)}</p>
    </div>
    <div class="meta-right">
      <div>Generated</div>
      <div style="font-weight:600;color:#111827;">${escHtml(report.generatedAt)}</div>
    </div>
  </div>

  <hr class="divider" />

  <div class="label">Executive Summary</div>
  <div class="summary-box">${escHtml(report.executiveSummary)}</div>

  <hr class="divider" />

  <div class="label">Section Breakdown</div>
  <div class="sections-grid">${sectionRows}</div>

  <hr class="divider" />
  <div class="footer">Arc AI · Confidential · Generated ${escHtml(report.generatedAt)}</div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }

    // Reset phase back to done after a short delay
    setTimeout(() => setReportPhase('done'), 800);
  };

  const reportStatusBadge = (status: string) => {
    switch (status) {
      case 'On Track': return 'bg-green-100 text-green-800';
      case 'At Risk':  return 'bg-yellow-100 text-yellow-800';
      case 'Delayed':  return 'bg-red-100 text-red-800';
      default:         return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Arc Dashboard</h2>
        <p className="text-gray-600 mt-1">Real-time insights across Planning, Development, and Deployment</p>
      </div>

      {/* AI Executive Summary */}
      <div className="bg-[#163A5F] rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Sparkles className="size-5" />
              Executive Intelligence Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm opacity-95">
              <div>
                <p className="font-semibold mb-2">📊 Project Health: 76%</p>
                <ul className="space-y-1 text-sm">
                  <li>• Sprint velocity at 29 pts (target: 35)</li>
                  <li>• Story refinement rate: 72% (needs improvement)</li>
                  <li>• PR review time: 3.5 days (3x above target)</li>
                  <li>• Deployment success: 100% ✓</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">⚠️ Top 3 Risks</p>
                <ul className="space-y-1 text-sm">
                  <li>• 2 critical bottlenecks slowing delivery 40%</li>
                  <li>• Unrefined backlog causing sprint planning delays</li>
                  <li>• PR review SLA violations impacting feature delivery</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm font-semibold">💡 AI Recommendation:</p>
              <p className="text-sm opacity-95 mt-1">
                Implement 3 quick wins (story refinement gates, PR review SLA, WIP limits) to improve 
                delivery speed by 43% within 2 weeks. View detailed roadmap in AI Insights section.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={openAnalysis}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                View Full Analysis
              </button>
              <button
                onClick={openReport}
                className="bg-white text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section Overview Cards - Planning, Stories, PRs, Deployments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planning Overview */}
        <Link to="/planning" className="block group">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-purple-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Planning & Schedule</h3>
                  <p className="text-xs text-gray-500">Epics, Milestones & Sign-offs</p>
                </div>
              </div>
              <ArrowRight className="size-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Active Epics</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{activeEpics}/{totalEpics}</p>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <CheckCircle className="size-3 text-green-600" />
                  <span className="text-green-600">{completedEpics} completed</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Milestones</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{activeMilestones}</p>
                {delayedMilestones > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    <AlertCircle className="size-3 text-red-600" />
                    <span className="text-red-600">{delayedMilestones} delayed</span>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Change Requests</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{pendingChangeRequests}</p>
                <p className="text-xs text-orange-600 mt-1">Pending review</p>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Sign-offs</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{pendingSignOffs}</p>
                <p className="text-xs text-orange-600 mt-1">Awaiting approval</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <Target className="size-4 text-purple-600" />
                <span className="text-gray-700">
                  Next: <span className="font-medium">Q1 2026 Release Planning</span>
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Jira Stories Overview */}
        <Link to="/stories" className="block group">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckSquare className="size-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Jira Stories</h3>
                  <p className="text-xs text-gray-500">Sprint execution & backlog</p>
                </div>
              </div>
              <ArrowRight className="size-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Total Stories</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{totalStories}</p>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <CheckCircle className="size-3 text-green-600" />
                  <span className="text-green-600">{refinementRate}% refined</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{inProgressStories}</p>
                <p className="text-xs text-blue-600 mt-1">Active work</p>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Defects</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{defects}</p>
                {defects > 0 ? (
                  <p className="text-xs text-red-600 mt-1">Needs attention</p>
                ) : (
                  <p className="text-xs text-green-600 mt-1">All clear</p>
                )}
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Story Points</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">29</p>
                <p className="text-xs text-gray-600 mt-1">Current sprint</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="size-4 text-blue-600" />
                <span className="text-gray-700">
                  Sprint 6 velocity tracking <span className="font-medium">83% complete</span>
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* GitHub PRs Overview */}
        <Link to="/pullrequests" className="block group">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-purple-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <GitPullRequest className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">GitHub Pull Requests</h3>
                  <p className="text-xs text-gray-500">Code review & merges</p>
                </div>
              </div>
              <ArrowRight className="size-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Open PRs</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{openPRs}</p>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <Clock className="size-3 text-orange-600" />
                  <span className="text-orange-600">Avg {avgPRAge} days</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Merged</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{mergedPRs}</p>
                <p className="text-xs text-green-600 mt-1">This week</p>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Stale PRs</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{stalePRs}</p>
                {stalePRs > 0 ? (
                  <p className="text-xs text-red-600 mt-1">&gt;7 days old</p>
                ) : (
                  <p className="text-xs text-green-600 mt-1">All current</p>
                )}
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Conflicts</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{conflictPRs}</p>
                {conflictPRs > 0 ? (
                  <p className="text-xs text-orange-600 mt-1">Need resolution</p>
                ) : (
                  <p className="text-xs text-green-600 mt-1">None</p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <GitBranch className="size-4 text-purple-600" />
                <span className="text-gray-700">
                  {stalePRs > 0 
                    ? <span className="text-red-600 font-medium">{stalePRs} PRs need review</span>
                    : <span className="text-green-600 font-medium">All PRs up to date</span>
                  }
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Deployments Overview */}
        <Link to="/deployments" className="block group">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-green-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Rocket className="size-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Deployments</h3>
                  <p className="text-xs text-gray-500">DEV, QA, UAT, PROD pipeline</p>
                </div>
              </div>
              <ArrowRight className="size-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{deploymentRate}%</p>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <CheckCircle className="size-3 text-green-600" />
                  <span className="text-green-600">{successfulDeploys} successful</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Total Deploys</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{mockDeployments.length}</p>
                {failedDeploys > 0 && (
                  <p className="text-xs text-red-600 mt-1">{failedDeploys} failed</p>
                )}
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Latest PROD</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">{latestDeploys.prod?.version || 'N/A'}</p>
                {latestDeploys.prod && (
                  <div className="flex items-center gap-1 mt-1 text-xs">
                    <CheckCircle className="size-3 text-green-600" />
                    <span className="text-gray-600">{latestDeploys.prod.status}</span>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Pipeline</p>
                <div className="flex gap-1 mt-2">
                  {(['dev', 'qa', 'uat', 'prod'] as const).map((env) => {
                    const deploy = latestDeploys[env];
                    const statusColor = deploy?.status === 'success' 
                      ? 'bg-green-500' 
                      : deploy?.status === 'failed' 
                      ? 'bg-red-500' 
                      : 'bg-gray-300';
                    return (
                      <div key={env} className={`size-3 rounded-full ${statusColor}`} title={`${env}: ${deploy?.status || 'none'}`} />
                    );
                  })}
                </div>
                <p className="text-xs text-gray-600 mt-2">All environments</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <Package className="size-4 text-green-600" />
                <span className="text-gray-700">
                  Next deployment: <span className="font-medium">v2.5.0 to PROD</span>
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Guardrails & Bottlenecks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guardrails Overview */}
        <Link to="/guardrails" className="block group">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-teal-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Shield className="size-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Quality & Security Guardrails</h3>
                  <p className="text-xs text-gray-500">Code quality & security gates</p>
                </div>
              </div>
              <ArrowRight className="size-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileCode className="size-3 text-blue-600" />
                  <p className="text-xs text-gray-600">ESLint</p>
                </div>
                <p className="text-lg font-semibold text-gray-900">{mockESLintReport.totalIssues}</p>
                {mockESLintReport.errors > 0 ? (
                  <p className="text-xs text-red-600 mt-1">{mockESLintReport.errors} errors</p>
                ) : (
                  <p className="text-xs text-green-600 mt-1">No errors</p>
                )}
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Bug className="size-3 text-purple-600" />
                  <p className="text-xs text-gray-600">SonarQube</p>
                </div>
                <p className="text-lg font-semibold text-gray-900">{mockSonarQubeAnalysis.bugs}</p>
                <p className="text-xs text-gray-600 mt-1">bugs found</p>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="size-3 text-red-600" />
                  <p className="text-xs text-gray-600">Fortify</p>
                </div>
                <p className="text-lg font-semibold text-gray-900">{mockFortifyScan.critical}</p>
                {mockFortifyScan.critical > 0 ? (
                  <p className="text-xs text-red-600 mt-1">critical issues</p>
                ) : (
                  <p className="text-xs text-green-600 mt-1">No critical</p>
                )}
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TestTube className="size-3 text-green-600" />
                  <p className="text-xs text-gray-600">Unit Tests</p>
                </div>
                <p className="text-lg font-semibold text-gray-900">{mockUnitTestExecution.overallCoverage}%</p>
                <p className="text-xs text-gray-600 mt-1">coverage</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <Lock className="size-4 text-orange-600" />
                <span className="text-gray-700">
                  {mockSecurityScans.reduce((sum, scan) => sum + scan.critical, 0) > 0 ? (
                    <span className="text-red-600 font-medium">
                      {mockSecurityScans.reduce((sum, scan) => sum + scan.critical, 0)} critical security findings
                    </span>
                  ) : (
                    <span className="text-green-600 font-medium">All security checks passed</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Bottlenecks Overview */}
        <Link to="/bottlenecks" className="block group">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:border-orange-300 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="size-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Delivery Bottlenecks</h3>
                  <p className="text-xs text-gray-500">Workflow friction analysis</p>
                </div>
              </div>
              <ArrowRight className="size-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Critical</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{criticalBottlenecks}</p>
                {criticalBottlenecks > 0 ? (
                  <p className="text-xs text-red-600 mt-1">High priority</p>
                ) : (
                  <p className="text-xs text-green-600 mt-1">None</p>
                )}
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Total Issues</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{mockBottlenecks.length}</p>
                <p className="text-xs text-gray-600 mt-1">Across pipeline</p>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Planning</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {mockBottlenecks.filter(b => b.stage === 'planning').length}
                </p>
                <p className="text-xs text-blue-600 mt-1">bottlenecks</p>
              </div>
              
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">Code Review</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {mockBottlenecks.filter(b => b.stage === 'review').length}
                </p>
                <p className="text-xs text-purple-600 mt-1">bottlenecks</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="size-4 text-orange-600" />
                <span className="text-gray-700">
                  {criticalBottlenecks > 0 ? (
                    <span className="text-red-600 font-medium">Action required on {criticalBottlenecks} critical issues</span>
                  ) : (
                    <span className="text-green-600 font-medium">No critical bottlenecks</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Velocity Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Sprint Velocity Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={velocityTrend} barCategoryGap="30%" barGap={10}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="sprint" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend />
              <Bar dataKey="planned" name="Planned" fill="#94a3b8" barSize={18} shape={<LollipopBar fill="#94a3b8" />} />
              <Bar dataKey="completed" name="Completed" fill="#10b981" barSize={18} shape={<LollipopBar fill="#10b981" />} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-4 text-sm text-gray-600">
            <p>Current Sprint: <span className="font-semibold text-gray-900">Sprint 6</span></p>
            <p>Average Velocity: <span className="font-semibold text-gray-900">29 story points</span></p>
          </div>
        </div>

        {/* Story Status Distribution — Waffle Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Story Status Distribution</h3>
          {(() => {
            const total = storyStatusData.reduce((s, d) => s + d.value, 0) || 1;
            // Build flat array of 100 cells each carrying { color, name }
            const cells: { color: string; name: string }[] = [];
            let filled = 0;
            storyStatusData.forEach((d, i) => {
              const count = i === storyStatusData.length - 1
                ? 100 - filled
                : Math.round((d.value / total) * 100);
              for (let j = 0; j < count; j++) cells.push({ color: d.color, name: d.name });
              filled += count;
            });
            return (
              <div
                className="flex flex-col items-center gap-5"
                onMouseLeave={() => setHoveredStatus(null)}
              >
                {/* 10×10 grid */}
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: 'repeat(10, 1fr)', width: '100%', maxWidth: 260 }}
                >
                  {cells.map((cell, i) => {
                    const dimmed = hoveredStatus !== null && hoveredStatus !== cell.name;
                    const highlighted = hoveredStatus === cell.name;
                    return (
                      <div
                        key={i}
                        className="rounded-sm cursor-pointer"
                        style={{
                          backgroundColor: cell.color,
                          aspectRatio: '1',
                          opacity: dimmed ? 0.15 : 1,
                          transform: highlighted ? 'scale(1.15)' : 'scale(1)',
                          transition: 'opacity 0.15s ease, transform 0.15s ease',
                          boxShadow: highlighted ? `0 0 0 1.5px ${cell.color}` : 'none',
                        }}
                        onMouseEnter={() => setHoveredStatus(cell.name)}
                      />
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                  {storyStatusData.map(d => {
                    const pct = Math.round((d.value / total) * 100);
                    const dimmed = hoveredStatus !== null && hoveredStatus !== d.name;
                    const highlighted = hoveredStatus === d.name;
                    return (
                      <div
                        key={d.name}
                        className="flex items-center gap-1.5 text-xs cursor-pointer select-none"
                        style={{
                          opacity: dimmed ? 0.3 : 1,
                          fontWeight: highlighted ? 700 : undefined,
                          transition: 'opacity 0.15s ease',
                          color: highlighted ? d.color : undefined,
                        }}
                        onMouseEnter={() => setHoveredStatus(d.name)}
                      >
                        <span
                          className="size-3 rounded-sm flex-shrink-0"
                          style={{
                            backgroundColor: d.color,
                            transform: highlighted ? 'scale(1.3)' : 'scale(1)',
                            transition: 'transform 0.15s ease',
                          }}
                        />
                        <span>{d.name}</span>
                        <span className="font-semibold">{pct}%</span>
                        <span style={{ color: highlighted ? d.color : '#9ca3af' }}>({d.value})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Sprint Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Current Sprint Summary</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">In Progress</p>
              <div className="space-y-2">
                {mockUserStories.filter(s => s.status === 'in-progress').map(story => (
                  <div key={story.id} className="flex items-center gap-2 text-sm">
                    <div className={`size-2 rounded-full ${story.type === 'defect' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <span className="font-medium text-gray-700">{story.key}</span>
                    <span className="text-gray-600 truncate">{story.title}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">In Review</p>
              <div className="space-y-2">
                {mockUserStories.filter(s => s.status === 'in-review').map(story => (
                  <div key={story.id} className="flex items-center gap-2 text-sm">
                    <div className={`size-2 rounded-full ${story.type === 'defect' ? 'bg-red-500' : 'bg-purple-500'}`} />
                    <span className="font-medium text-gray-700">{story.key}</span>
                    <span className="text-gray-600 truncate">{story.title}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Blockers</p>
              {mockUserStories.some(s => s.blockers && s.blockers.length > 0) ? (
                <div className="space-y-2">
                  {mockUserStories.filter(s => s.blockers && s.blockers.length > 0).map(story => (
                    <div key={story.id} className="bg-red-50 border border-red-200 rounded p-2">
                      <p className="text-sm font-medium text-red-900">{story.key}</p>
                      <p className="text-xs text-red-700">{story.blockers![0]}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600">No blockers 🎉</p>
              )}
            </div>
          </div>
        </div>

        {/* Defect Trend */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Defect Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={defectTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} />
              <Legend />
              <Line key="line-new-defects" type="monotone" dataKey="newDefects" stroke="#ef4444" strokeWidth={2} name="New Defects" />
              <Line key="line-resolved-defects" type="monotone" dataKey="resolvedDefects" stroke="#10b981" strokeWidth={2} name="Resolved" />
              <Line key="line-open-defects" type="monotone" dataKey="openDefects" stroke="#f59e0b" strokeWidth={2} name="Open Defects" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>

    {/* ── AI View Full Analysis modal ─────────────────────────────────── */}
    {analysisOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => analysisPhase !== 'running' && setAnalysisOpen(false)} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 bg-[#163A5F]">
            <div className="flex items-center gap-3 text-white">
              <Sparkles className="size-5" />
              <h2 className="font-semibold text-lg">AI Delivery Analysis Agent</h2>
            </div>
            {analysisPhase !== 'running' && (
              <button onClick={() => setAnalysisOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {analysisPhase === 'idle' && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                <Loader2 className="size-8 animate-spin" />
                <p className="text-sm">Starting analysis…</p>
              </div>
            )}

            {analysisSteps.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Activity</p>
                {analysisSteps.map(step => (
                  <div key={step.id} className="flex items-start gap-3">
                    <AgentStepIcon status={step.status} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${ step.status === 'pending' ? 'text-gray-400' : 'text-gray-800' }`}>{step.label}</p>
                      {step.detail && step.status === 'done' && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {analysisPhase === 'done' && analysisResult && (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-6">
                  <div className="text-center flex-shrink-0">
                    <p className="text-5xl font-bold text-yellow-700">{analysisResult!.score}</p>
                    <p className="text-xs text-yellow-600 mt-1 font-medium">/ 100</p>
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-900 text-lg">Delivery Health: {analysisResult!.label}</p>
                    <p className="text-sm text-yellow-700 mt-1">Three critical areas require immediate attention to protect the Release 2.5.0 milestone.</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Health Indicators</p>
                  <div className="grid grid-cols-2 gap-2">
                    {analysisResult!.indicators.map((ind, i) => {
                      const colors = indicatorColor(ind.status);
                      return (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
                          <div className={`size-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500">{ind.label}</p>
                            <p className={`text-sm font-medium truncate ${colors.text}`}>{ind.value}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {analysisResult!.sections.map((section, si) => (
                  <div key={si}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{section.title}</p>
                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                      {section.items.map((item, ii) => (
                        <div key={ii} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50">
                          <span className="text-sm text-gray-700">{item.label}</span>
                          <div className="text-right ml-4">
                            <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                            {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Key Findings</p>
                  <div className="space-y-2">
                    {analysisResult!.keyFindings.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertCircle className="size-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={() => setAnalysisOpen(false)} disabled={analysisPhase === 'running'}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Close
            </button>
            {analysisPhase === 'done' && (
              <button onClick={downloadAnalysisPdf}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                <FileText className="size-4" /> Download Analysis PDF
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── AI Generate Report modal ──────────────────────────────────── */}
    {reportOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => reportPhase !== 'running' && reportPhase !== 'downloading' && setReportOpen(false)} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

          <div className="flex items-center justify-between px-6 py-4 bg-[#163A5F]">
            <div className="flex items-center gap-3 text-white">
              <FileText className="size-5" />
              <h2 className="font-semibold text-lg">AI Report Generation Agent</h2>
            </div>
            {reportPhase !== 'running' && reportPhase !== 'downloading' && (
              <button onClick={() => setReportOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="size-5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {reportPhase === 'idle' && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                <Loader2 className="size-8 animate-spin" />
                <p className="text-sm">Starting report generation…</p>
              </div>
            )}

            {reportSteps.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Activity</p>
                {reportSteps.map(step => (
                  <div key={step.id} className="flex items-start gap-3">
                    <AgentStepIcon status={step.status} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${ step.status === 'pending' ? 'text-gray-400' : 'text-gray-800' }`}>{step.label}</p>
                      {step.detail && step.status === 'done' && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(reportPhase === 'done' || reportPhase === 'downloading') && report && (
              <>
                {/* Report metadata */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-emerald-900 text-lg">Delivery Report</p>
                      <p className="text-sm text-emerald-700 mt-0.5">{report!.period}</p>
                    </div>
                    <div className="text-right text-xs text-emerald-600">
                      <p>{report!.team}</p>
                      <p className="mt-0.5">Generated {report!.generatedAt}</p>
                    </div>
                  </div>
                </div>

                {/* Executive summary */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Executive Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded-lg p-4">{report!.executiveSummary}</p>
                </div>

                {/* Section cards */}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Section Breakdown</p>
                  <div className="grid grid-cols-2 gap-3">
                    {report!.sections.map((section, si) => (
                      <div key={si} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold text-gray-900">{section.title}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${reportStatusBadge(section.status)}`}>
                            {section.status}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {section.metrics.map((m, mi) => (
                            <div key={mi} className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">{m.label}</span>
                              <span className="text-xs font-semibold text-gray-800">{m.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button onClick={() => setReportOpen(false)}
              disabled={reportPhase === 'running' || reportPhase === 'downloading'}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Close
            </button>
            {reportPhase === 'done' && (
              <button onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                <FileText className="size-4" /> Download PDF
              </button>
            )}
            {reportPhase === 'downloading' && (
              <button disabled
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg opacity-80 cursor-not-allowed">
                <Loader2 className="size-4 animate-spin" /> Downloading…
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}