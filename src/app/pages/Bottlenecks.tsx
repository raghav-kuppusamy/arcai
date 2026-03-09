/**
 * Bottlenecks.tsx — AI-Detected Delivery Bottlenecks
 *
 * Surfaces blockers that slow down the software delivery pipeline.
 * Bottlenecks are grouped by the four phases of the SDLC:
 *   Phase 1: Planning & Backlog  — unrefined stories, slow backlog grooming
 *   Phase 2: Development         — defects interrupting feature work, WIP violations
 *   Phase 3: Code Review         — PRs stuck waiting for reviewers
 *   Phase 4: Deployment & Testing — manual UAT gates, flaky pipelines
 *
 * Each bottleneck card shows: severity, trend direction, AI root-cause analysis,
 * and a concrete AI recommendation with an estimated improvement percentage.
 *
 * A cycle-time bar chart at the bottom shows where in the workflow time is lost.
 */
import { useState, useRef } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Zap, Clock, ChevronRight, Calendar, GitPullRequest, Rocket, CheckSquare, Sparkles, Loader2, X, CheckCircle } from 'lucide-react';
import { mockBottlenecks, cycleTimeData } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

/**
 * Bottlenecks — phased bottleneck analysis with AI root-cause and recommendations.
 */
type AgentStepStatus = 'pending' | 'running' | 'done';
interface AgentStep { id: string; label: string; detail?: string; status: AgentStepStatus; }

const AgentStepIcon = ({ status }: { status: AgentStepStatus }) => {
  if (status === 'done')    return <CheckCircle className="size-5 text-green-500 flex-shrink-0 mt-0.5" />;
  if (status === 'running') return <Loader2 className="size-5 text-orange-500 animate-spin flex-shrink-0 mt-0.5" />;
  return <div className="size-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />;
};

export function Bottlenecks() {
  /**
   * Returns Tailwind badge classes for a bottleneck severity level.
   * Traffic-light colours: red = high, orange = medium, yellow = low.
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  /**
   * Returns an icon showing whether a bottleneck is getting worse, better, or staying the same.
   * Red up-arrow (increasing) is the most actionable signal for teams to act on.
   */
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="size-5 text-red-600" />;
      case 'decreasing':
        return <TrendingDown className="size-5 text-green-600" />;
      default:
        return <Minus className="size-5 text-gray-600" />;
    }
  };

  // ─── Bottlenecks Intelligence Agent ────────────────────────────────────────
  interface ActionItem { phase: string; action: string; effort: string; gain: string; owner: string; }
  interface BottleneckPlan { headline: string; totalDelayDays: number; actions: ActionItem[]; }

  const [agentOpen, setAgentOpen]   = useState(false);
  const [agentPhase, setAgentPhase] = useState<'idle'|'running'|'done'>('idle');
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [agentPlan,  setAgentPlan]  = useState<BottleneckPlan | null>(null);
  const [agentMode,  setAgentMode]  = useState<'analyse'|'fix'|'impact'>('analyse');
  const agentRunIdRef = useRef(0);

  const highCount   = mockBottlenecks.filter(b => b.severity === 'high').length;
  const mediumCount = mockBottlenecks.filter(b => b.severity === 'medium').length;
  const totalDelay  = mockBottlenecks.reduce((s, b) => s + b.avgDelay, 0);

  const STEP_CONFIGS: Record<string, {id:string; label:string; detail:string; delay:number}[]> = {
    analyse: [
      { id:'b1', label:'Loading bottleneck data across all 4 pipeline phases',    detail:`${mockBottlenecks.length} bottlenecks detected · ${highCount} critical · ${mediumCount} medium`,                delay:600 },
      { id:'b2', label:'Ranking by severity × cumulative delay impact',           detail:`Total pipeline delay: ${totalDelay} days · Backlog (8d) and Review (3.5d) dominate`,                         delay:800 },
      { id:'b3', label:'Cross-referencing with active stories and open PRs',      detail:'PROJ-124 blocked · 3 PRs stale >3 days · Sprint 2 at 28% completion',                                        delay:700 },
      { id:'b4', label:'Analysing trend direction for each bottleneck',           detail:'Planning ↑ increasing · Development ↑ increasing · Review → stable · Deployment → stable',               delay:600 },
      { id:'b5', label:'Calculating lead time vs 10-day target',                  detail:'Current lead time: 17.5 days · Gap: 7.5 days · Sprint predictability: 76% vs 90% target',                delay:900 },
      { id:'b6', label:'Generating prioritised remediation roadmap',              detail:'4 actions identified · Est. lead time reduction: 6–8 days · Effort: 1–2 sprints',                          delay:1000 },
    ],
    fix: [
      { id:'b1', label:'Identifying quick-win vs long-term fixes',                detail:'2 quick-wins (<1 sprint) · 2 structural fixes (1–2 sprints)',                                               delay:600 },
      { id:'b2', label:'Mapping fixes to specific Jira stories and PRs',          detail:'Story refinement gates → Planning · PR SLA policy → Review · PROJ-124 escalation → Development',        delay:700 },
      { id:'b3', label:'Estimating effort and team capacity',                     detail:'Sprint 2 capacity: ~28 pts remaining · Quick-wins fit within current sprint',                             delay:800 },
      { id:'b4', label:'Assigning owners per bottleneck phase',                   detail:'Raghavan: Planning gates · Sarah: PR review rotation · Mike: PROJ-124 fix · DevOps: UAT automation',    delay:700 },
      { id:'b5', label:'Calculating velocity impact per fix',                     detail:'PR SLA fix alone: +18% delivery speed · Refinement gates: +60% planning efficiency',                     delay:900 },
      { id:'b6', label:'Compiling phased fix plan with sprint targets',           detail:'Sprint 2: PR SLA + PROJ-124 · Sprint 3: Refinement gates + UAT automation',                             delay:1000 },
    ],
    impact: [
      { id:'b1', label:'Modelling current delivery trajectory',                   detail:'Lead time: 17.5 days · Velocity: 28/35 pts · Predictability: 76%',                                         delay:600 },
      { id:'b2', label:'Simulating delay if bottlenecks remain unresolved',       detail:'Planning bottleneck growing ↑ · Review stable but 3 PRs stale · Sprint 3 at risk',                      delay:800 },
      { id:'b3', label:'Projecting sprint 3 impact on milestone delivery',        detail:'Sprint 3 goal at 65% risk of slipping · Release v1.2.0 may shift by 2+ weeks',                          delay:700 },
      { id:'b4', label:'Calculating stakeholder impact',                          detail:'UAT window shrinks by 3 days · Stripe integration demo at risk · 2 epics delayed',                        delay:600 },
      { id:'b5', label:'Estimating cost of inaction',                             detail:'Each additional day of lead time ≈ 0.5 story points lost per sprint',                                     delay:900 },
      { id:'b6', label:'Generating risk-adjusted timeline forecast',              detail:'Without action: v1.2.0 slips to Apr 18 · With fixes: on-track Apr 4 release',                           delay:1000 },
    ],
  };

  const runAgent = async (runId: number, mode: 'analyse'|'fix'|'impact') => {
    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
    const steps = STEP_CONFIGS[mode];
    setAgentPhase('running');
    setAgentSteps(steps.map(s => ({ id: s.id, label: s.label, status: 'pending' as AgentStepStatus })));
    for (const step of steps) {
      if (agentRunIdRef.current !== runId) return;
      setAgentSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s));
      await sleep(step.delay);
      if (agentRunIdRef.current !== runId) return;
      setAgentSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done', detail: step.detail } : s));
    }
    if (agentRunIdRef.current !== runId) return;
    setAgentPlan({
      headline: mode === 'impact'
        ? 'Without action, v1.2.0 will slip by 2+ weeks. Resolve planning and review bottlenecks in Sprint 2 to stay on track for Apr 4 release.'
        : 'Backlog refinement and PR review delays account for 11.5 of the 17.5-day lead time. Fixing these two bottlenecks alone reduces lead time to under 10 days within 2 sprints.',
      totalDelayDays: totalDelay,
      actions: [
        { phase:'Planning',    action:'Implement Definition of Ready gates — block unrefined stories from sprint intake',  effort:'1 day',   gain:'−5 days lead time',   owner:'Raghavan K.'  },
        { phase:'Code Review', action:'Set 24-hour PR review SLA with GitHub Actions reminders + round-robin assignment',  effort:'2 hours', gain:'−2.5 days lead time', owner:'Sarah Chen'   },
        { phase:'Development', action:'Escalate PROJ-124 API timeout fix — assign dedicated pair-programming session',     effort:'1 sprint', gain:'Unblocks QA gate',   owner:'Mike Johnson' },
        { phase:'Deployment',  action:'Automate UAT deployment trigger via CI/CD pipeline — remove manual step',           effort:'1 sprint', gain:'−1 day lead time',    owner:'DevOps team'  },
      ],
    });
    setAgentPhase('done');
  };

  const openAgent = (mode: 'analyse'|'fix'|'impact') => {
    const runId = ++agentRunIdRef.current;
    setAgentMode(mode);
    setAgentOpen(true);
    setAgentPhase('idle');
    setAgentSteps([]);
    setAgentPlan(null);
    setTimeout(() => { runAgent(runId, mode); }, 400);
  };

  // Index bottlenecks by SDLC phase for easy lookup in the phase loop below
  const bottlenecksByStage = {
    planning: mockBottlenecks.filter(b => b.stage === 'planning'),
    development: mockBottlenecks.filter(b => b.stage === 'development'),
    review: mockBottlenecks.filter(b => b.stage === 'review'),
    deployment: mockBottlenecks.filter(b => b.stage === 'deployment'),
  };

  // 'high' severity = what the UI displays as "Critical"
  const criticalBottlenecks = mockBottlenecks.filter(b => b.severity === 'high');

  /**
   * Static configuration for each SDLC phase.
   * Separating visual config (colours, icons) from data (bottlenecksByStage)
   * keeps the render loop clean and makes it easy to add a new phase.
   */
  const phaseConfig = [
    {
      id: 'planning',
      name: 'Planning & Backlog',
      icon: Calendar,
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-900',
      iconBgColor: 'bg-blue-600',
      description: 'Story refinement, backlog management, and sprint planning',
    },
    {
      id: 'development',
      name: 'Development',
      icon: CheckSquare,
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-900',
      iconBgColor: 'bg-green-600',
      description: 'Coding, testing, and implementation work',
    },
    {
      id: 'review',
      name: 'Code Review',
      icon: GitPullRequest,
      color: 'purple',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500',
      textColor: 'text-purple-900',
      iconBgColor: 'bg-purple-600',
      description: 'Pull request reviews and approvals',
    },
    {
      id: 'deployment',
      name: 'Deployment & Testing',
      icon: Rocket,
      color: 'orange',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
      textColor: 'text-orange-900',
      iconBgColor: 'bg-orange-600',
      description: 'UAT testing and production releases',
    },
  ];

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Bottleneck Analysis</h2>
        <p className="text-gray-600 mt-1">AI-detected performance issues across your delivery pipeline</p>
      </div>

      {/* Bottlenecks Intelligence Banner */}
      <div className="bg-[#163A5F] rounded-lg p-6 text-white">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <Sparkles className="size-5" />
            Bottlenecks Intelligence
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm opacity-95 mb-4">
            <div>
              <p className="font-semibold mb-1">🚨 Pipeline Health</p>
              <ul className="space-y-1">
                <li>• {highCount} critical bottlenecks · {mediumCount} medium severity</li>
                <li>• Lead time: <strong>17.5 days</strong> vs 10-day target (75% over)</li>
                <li>• Sprint predictability: <strong>76%</strong> vs 90%+ target</li>
                <li>• Backlog (+8d) and Review (+3.5d) are the primary blockers</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">⚡ Top Recommendations</p>
              <ul className="space-y-1">
                <li>• Add Definition of Ready gates to cut planning delays by 60%</li>
                <li>• Set 24hr PR review SLA — reduce review time from 3.5d to &lt;1d</li>
                <li>• Escalate PROJ-124 to unblock QA promotion pipeline</li>
                <li>• Automate UAT trigger to eliminate 1-day manual gate</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => openAgent('analyse')}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2">
              <Zap className="size-4" /> Analyse Bottlenecks
            </button>
            <button onClick={() => openAgent('fix')}
              className="bg-white text-[#163A5F] hover:bg-gray-100 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2">
              <ChevronRight className="size-4" /> Generate Fix Plan
            </button>
            <button onClick={() => openAgent('impact')}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2">
              <Clock className="size-4" /> Predict Delay Impact
            </button>
          </div>
        </div>
      </div>

      {/* Summary Alert */}
      {criticalBottlenecks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="size-8 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">
                {criticalBottlenecks.length} Critical Bottleneck{criticalBottlenecks.length > 1 ? 's' : ''} Detected
              </h3>
              <p className="text-red-800 mb-3">
                Your delivery pipeline has critical bottlenecks that are significantly impacting team velocity 
                and delivery predictability. Immediate action recommended.
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                {criticalBottlenecks.map(b => (
                  <div key={b.id} className="bg-white px-3 py-1 rounded border border-red-200">
                    <span className="text-red-900 capitalize">{b.stage}: {b.avgDelay} day avg delay</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phased Bottleneck Analysis */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900">Bottlenecks by Development Phase</h3>
        
        {phaseConfig.map((phase, phaseIndex) => {
          const phaseBottlenecks = bottlenecksByStage[phase.id as keyof typeof bottlenecksByStage];
          const PhaseIcon = phase.icon;
          const hasBottlenecks = phaseBottlenecks.length > 0;
          const highSeverity = phaseBottlenecks.filter(b => b.severity === 'high').length;
          const mediumSeverity = phaseBottlenecks.filter(b => b.severity === 'medium').length;

          return (
            <div key={phase.id} className="relative">
              {/* Phase Container */}
              <div className={`border-l-4 ${phase.borderColor} ${phase.bgColor} rounded-lg overflow-hidden`}>
                {/* Phase Header */}
                <div className={`p-6 border-b border-gray-200 ${hasBottlenecks ? 'bg-white' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`size-12 ${phase.iconBgColor} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                        <PhaseIcon className="size-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className={`font-semibold text-lg ${phase.textColor}`}>
                            Phase {phaseIndex + 1}: {phase.name}
                          </h4>
                          {hasBottlenecks && (
                            <div className="flex items-center gap-2">
                              {highSeverity > 0 && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium border border-red-200">
                                  {highSeverity} Critical
                                </span>
                              )}
                              {mediumSeverity > 0 && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium border border-orange-200">
                                  {mediumSeverity} Medium
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{phase.description}</p>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      {hasBottlenecks ? (
                        <div>
                          <p className="text-sm text-gray-600">Bottlenecks</p>
                          <p className="text-3xl font-semibold text-red-600">{phaseBottlenecks.length}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600">
                          <span className="text-sm font-medium">No Bottlenecks</span>
                          <div className="size-8 bg-green-100 rounded-full flex items-center justify-center">
                            ✓
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottleneck Items */}
                {hasBottlenecks && (
                  <div className="divide-y divide-gray-200">
                    {phaseBottlenecks.map((bottleneck) => (
                      <div key={bottleneck.id} className="p-6 bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="flex-shrink-0 mt-1">
                                <AlertTriangle className={`size-5 ${
                                  bottleneck.severity === 'high' ? 'text-red-600' :
                                  bottleneck.severity === 'medium' ? 'text-orange-600' :
                                  'text-yellow-600'
                                }`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h5 className="font-semibold text-gray-900">{bottleneck.title}</h5>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getSeverityColor(bottleneck.severity)}`}>
                                    {bottleneck.severity} Severity
                                  </span>
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    {getTrendIcon(bottleneck.trend)}
                                    <span className="capitalize text-xs">{bottleneck.trend}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{bottleneck.description}</p>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Average Delay</p>
                                    <p className="text-lg font-semibold text-red-600">{bottleneck.avgDelay} days</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Affected Items</p>
                                    <p className="text-lg font-semibold text-gray-900">{bottleneck.affectedItems}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 mb-1">Impact</p>
                                    <p className="text-sm font-medium text-gray-900">{bottleneck.impact}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* AI Root Cause — phase-level analysis, rendered once per phase */}
                    <div className="p-6 bg-white">
                      <div className="mt-0 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-900 mb-1 flex items-center gap-2">
                          <Zap className="size-4" />
                          AI Root Cause Analysis
                        </p>
                        <ul className="text-xs text-blue-800 space-y-1">
                          {phase.id === 'planning' && (
                            <>
                              <li>• Stories lacking clear acceptance criteria</li>
                              <li>• Infrequent refinement sessions (every 2 weeks vs weekly)</li>
                              <li>• No "Definition of Ready" enforcement</li>
                            </>
                          )}
                          {phase.id === 'development' && (
                            <>
                              <li>• Unplanned defect work disrupting sprint commitments</li>
                              <li>• No dedicated defect resolution capacity allocated</li>
                              <li>• Context switching between features and bug fixes</li>
                            </>
                          )}
                          {phase.id === 'review' && (
                            <>
                              <li>• No review SLA or accountability metrics</li>
                              <li>• Large PRs (15+ files) taking 2.3x longer to review</li>
                              <li>• Reviewers handling &gt;3 PRs simultaneously</li>
                            </>
                          )}
                          {phase.id === 'deployment' && (
                            <>
                              <li>• Manual UAT deployment requiring 45min average</li>
                              <li>• Stakeholder availability delays (2-3 day wait time)</li>
                              <li>• No automated smoke testing in UAT environment</li>
                            </>
                          )}
                        </ul>
                      </div>

                      {/* AI Recommendation — phase-level, rendered once per phase */}
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-green-900 mb-1 flex items-center gap-2">
                          💡 AI Recommendation
                        </p>
                        <p className="text-xs text-green-800">
                          {phase.id === 'planning' && 'Implement weekly refinement sessions with "Definition of Ready" checklist. Expected reduction: 5 days → 2 days (60% improvement).'}
                          {phase.id === 'development' && 'Allocate 20% sprint capacity for defect resolution. Use WIP limits to reduce context switching. Expected: +8 story points/sprint.'}
                          {phase.id === 'review' && 'Set 24hr review SLA with automated reminders. Break large PRs into <300 lines. Expected: 3.5 days → 1 day (71% improvement).'}
                          {phase.id === 'deployment' && 'Automate UAT deployments and implement scheduled testing windows. Expected: 4 days → 1.5 days (62% improvement).'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Bottlenecks State */}
                {!hasBottlenecks && (
                  <div className="p-8 text-center">
                    <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-3xl">✓</span>
                    </div>
                    <p className="text-green-800 font-medium">This phase is operating efficiently</p>
                    <p className="text-sm text-green-700 mt-1">No bottlenecks detected by AI analysis</p>
                  </div>
                )}
              </div>

              {/* Connector Arrow */}
              {phaseIndex < phaseConfig.length - 1 && (
                <div className="flex justify-center py-2">
                  <ChevronRight className="size-8 text-gray-400 rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cycle Time Analysis — bar chart colour-codes each stage:
           red = >5 days (critical), amber = >3 days (warning), blue = healthy */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Cycle Time by Stage</h3>
          <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 px-3 py-1 rounded">
            <Clock className="size-4" />
            <span>Bottlenecks identified in Backlog and Review</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={cycleTimeData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: 'Average Days', position: 'insideBottom', offset: -5 }} />
            <YAxis type="category" dataKey="stage" tick={{ fontSize: 12 }} width={100} />
            <Tooltip formatter={(value) => `${value} days`} />
            <Legend />
            <Bar dataKey="avgDays" fill="#3b82f6" name="Avg Days in Stage">
              {cycleTimeData.map((entry, index) => (
                <Cell
                  key={`bottleneck-cell-${entry.stage}-${index}`}
                  fill={entry.avgDays > 5 ? '#ef4444' : entry.avgDays > 3 ? '#f59e0b' : '#3b82f6'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Impact Summary */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-red-900 mb-3">Overall Impact on Delivery</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <p className="text-gray-600 mb-1">Average Story Lead Time</p>
            <p className="text-2xl font-semibold text-red-900">17.5 days</p>
            <p className="text-xs text-gray-600 mt-1">Target: 10 days</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <p className="text-gray-600 mb-1">Sprint Predictability</p>
            <p className="text-2xl font-semibold text-red-900">76%</p>
            <p className="text-xs text-gray-600 mt-1">Target: 90%+</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <p className="text-gray-600 mb-1">Velocity Variance</p>
            <p className="text-2xl font-semibold text-red-900">±6 pts</p>
            <p className="text-xs text-gray-600 mt-1">Target: ±3 pts</p>
          </div>
        </div>
      </div>
    </div>

      {/* ── Bottlenecks Agent Modal ───────────────────────────────────────── */}
      {agentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => agentPhase !== 'running' && setAgentOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-[#163A5F]">
              <div className="flex items-center gap-3 text-white">
                <Zap className="size-5" />
                <h2 className="font-semibold text-lg">
                  {agentMode === 'analyse' ? 'AI Bottleneck Analysis Agent' : agentMode === 'fix' ? 'AI Fix Plan Agent' : 'AI Delay Impact Agent'}
                </h2>
              </div>
              {agentPhase !== 'running' && (
                <button onClick={() => setAgentOpen(false)} className="text-white/70 hover:text-white transition-colors">
                  <X className="size-5" />
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              <div className="space-y-3">
                {agentSteps.map(step => (
                  <div key={step.id} className="flex items-start gap-3">
                    <AgentStepIcon status={step.status} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>{step.label}</p>
                      {step.detail && <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {agentPlan && (
                <div className="space-y-5 border-t border-gray-200 pt-5">
                  <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <p className="text-sm text-orange-900">{agentPlan.headline}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Prioritised Actions</h4>
                    <div className="space-y-2">
                      {agentPlan.actions.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                          <span className="size-6 rounded-full bg-[#163A5F] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">{a.phase}</span>
                            <p className="text-sm text-gray-900 mt-0.5">{a.action}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Owner: {a.owner}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-medium text-gray-700">{a.effort}</p>
                            <p className="text-xs text-green-700 mt-0.5">{a.gain}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {agentPhase === 'done' && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                <p className="text-xs text-gray-500">{agentPlan?.actions.length} actions · est. lead time reduction: 6–8 days</p>
                <button onClick={() => setAgentOpen(false)}
                  className="bg-[#163A5F] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#0d2a47] transition-colors flex items-center gap-2">
                  Done <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}