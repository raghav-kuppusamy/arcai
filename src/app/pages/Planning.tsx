/**
 * Planning.tsx — Project Planning & Schedule
 *
 * Provides a complete view of project delivery governance:
 *   - Epics list with progress bars and owner information
 *   - Milestones/sprints with goals, sign-off status, and linked epics
 *   - Change control: pending/approved/rejected change requests
 *   - Quality gates: mandatory checkpoints before milestone sign-off
 *   - Handover checklist: items that must be complete before going to ops
 *
 * The AI Planning Intelligence banner predicts schedule risks based on
 * epic velocity, change request impact, and team allocation patterns.
 */
import { useState, useRef } from 'react';
import { Calendar, Target, Layers, TrendingUp, CheckCircle, Clock, AlertCircle, Sparkles, Loader2, X } from 'lucide-react';
import { mockEpics, mockMilestones, mockChangeRequests, mockQualityGates, mockSignOffs, mockHandoverItems } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type AgentStepStatus = 'pending' | 'running' | 'done';
interface AgentStep { id: string; label: string; detail?: string; status: AgentStepStatus; }

const AgentStepIcon = ({ status }: { status: AgentStepStatus }) => {
  if (status === 'done')    return <CheckCircle className="size-5 text-green-500 flex-shrink-0 mt-0.5" />;
  if (status === 'running') return <Loader2    className="size-5 text-purple-500 animate-spin flex-shrink-0 mt-0.5" />;
  return <div className="size-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />;
};

/**
 * Planning — epics, milestones, change requests, quality gates, sign-offs, and handover.
 */
export function Planning() {
  /**
   * Returns Tailwind badge classes for a planning entity's status.
   * Both 'in-progress' and 'active' map to blue — they're semantically equivalent
   * depending on which entity type uses which term.
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress':
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'planning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delayed':
      case 'on-hold':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /** Returns Tailwind badge classes for a priority value (shared with Stories). */
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // ─── AI Auto-Optimise Schedule Agent ──────────────────────────────────────────────
  interface ScheduleAction {
    type: 'defer' | 'consolidate' | 'reschedule' | 'fast-track';
    item: string;
    reason: string;
    impact: string;
  }

  interface OptimisedSchedule {
    weeksSaved: number;
    milestonesAdjusted: number;
    actions: ScheduleAction[];
    recommendations: string[];
  }

  const [agentOpen, setAgentOpen]   = useState(false);
  const [agentPhase, setAgentPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [agentPlan, setAgentPlan]   = useState<OptimisedSchedule | null>(null);
  const agentRunIdRef = useRef(0);

  const AGENT_STEP_CONFIG = [
    { id: 's1', label: 'Loading project schedule and epic data',            detail: '4 epics · 3 milestones · 5 change requests loaded',                delay: 600  },
    { id: 's2', label: 'Analysing epic velocity and completion forecasts',   detail: 'EPIC-001 at risk (78% delay probability) · EPIC-003 ahead of schedule', delay: 900  },
    { id: 's3', label: 'Evaluating milestone dependencies and critical path', detail: 'Critical path: EPIC-001 → Release 2.5.0 → UAT sign-off',             delay: 800  },
    { id: 's4', label: 'Assessing change request impact on timeline',        detail: 'CR-003 adds 8 days · CR-001, CR-002 within capacity',                delay: 700  },
    { id: 's5', label: 'Optimising resource allocation across epics',        detail: 'Sarah Chen: 3 epics → 2 epics · estimated +25% delivery velocity',   delay: 1000 },
    { id: 's6', label: 'Generating optimised schedule with risk buffers',    detail: '4 adjustments identified · 3 weeks saved vs current trajectory',    delay: 1100 },
  ];

  const runOptimisation = async (runId: number) => {
    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

    setAgentPhase('running');
    setAgentSteps(AGENT_STEP_CONFIG.map(s => ({ id: s.id, label: s.label, status: 'pending' as AgentStepStatus })));

    for (const step of AGENT_STEP_CONFIG) {
      if (agentRunIdRef.current !== runId) return;
      setAgentSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s));
      await sleep(step.delay);
      if (agentRunIdRef.current !== runId) return;
      setAgentSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done', detail: step.detail } : s));
    }
    if (agentRunIdRef.current !== runId) return;

    setAgentPlan({
      weeksSaved: 3,
      milestonesAdjusted: 2,
      actions: [
        { type: 'defer',       item: 'CR-003',         reason: 'Adds 8 days to Release 2.5.0 with low business value — safe to defer', impact: 'Saves 8 days'            },
        { type: 'consolidate', item: 'Sarah Chen',     reason: 'Allocated across 3 epics causing context switching — consolidate to 2', impact: '+25% delivery velocity' },
        { type: 'reschedule',  item: 'Release 2.5.0',  reason: 'Add 5-day buffer before security audit based on code complexity trend',  impact: 'Reduces audit overrun risk' },
        { type: 'fast-track',  item: 'EPIC-003',       reason: 'Payment Gateway 15 days ahead of schedule — pull forward UAT prep',    impact: 'Unlocks UAT 2 weeks early' },
      ],
      recommendations: [
        'Defer CR-003 to Release 2.6.0 — saves 8 days and keeps Release 2.5.0 on the current milestone date.',
        'Consolidate Sarah Chen’s allocation to EPIC-001 and EPIC-002 only until Sprint 16 completes.',
        'Insert a 5-day security remediation buffer before the Sprint 15 audit — complexity metrics suggest 4–6 medium findings.',
      ],
    });
    setAgentPhase('done');
  };

  const openAgent = () => {
    const runId = ++agentRunIdRef.current;
    setAgentOpen(true);
    setAgentPhase('idle');
    setAgentSteps([]);
    setAgentPlan(null);
    setTimeout(() => { runOptimisation(runId); }, 400);
  };

  /** Returns Tailwind classes for a schedule action type badge. */
  const actionBadgeColor = (type: string) => {
    switch (type) {
      case 'defer':       return 'bg-gray-100 text-gray-700';
      case 'consolidate': return 'bg-purple-100 text-purple-800';
      case 'reschedule':  return 'bg-orange-100 text-orange-800';
      case 'fast-track':  return 'bg-green-100 text-green-800';
      default:            return 'bg-gray-100 text-gray-700';
    }
  };

  // ─── AI Detailed Analysis Agent ──────────────────────────────────────────
  interface HealthIndicator {
    label: string;
    value: string;
    status: 'good' | 'warning' | 'critical';
  }

  interface AnalysisItem {
    label: string;
    value: string;
    note?: string;
  }

  interface AnalysisSection {
    title: string;
    items: AnalysisItem[];
  }

  interface ProjectAnalysis {
    healthScore: number;
    healthLabel: 'Green' | 'Amber' | 'Red';
    indicators: HealthIndicator[];
    sections: AnalysisSection[];
    keyFindings: string[];
  }

  const [analysisOpen, setAnalysisOpen]   = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [analysisSteps, setAnalysisSteps] = useState<AgentStep[]>([]);
  const [analysisReport, setAnalysisReport] = useState<ProjectAnalysis | null>(null);
  const analysisRunIdRef = useRef(0);

  const ANALYSIS_STEP_CONFIG = [
    { id: 'a1', label: 'Scanning epic progress and health indicators',    detail: 'EPIC-001: 45% vs 65% expected · EPIC-003: 15 days ahead',       delay: 600  },
    { id: 'a2', label: 'Analysing milestone completion trends',            detail: 'Sprint 14 on track · Release 2.5.0 at risk (78% probability)',   delay: 800  },
    { id: 'a3', label: 'Reviewing change request risk and impact',         detail: '3 pending CRs · CR-003 highest risk — 8 days timeline impact',   delay: 700  },
    { id: 'a4', label: 'Evaluating quality gate readiness',                detail: '2 gates pending · Security audit due in 14 days',                delay: 600  },
    { id: 'a5', label: 'Assessing team workload distribution',             detail: 'Sarah Chen over-allocated (3 epics) · David Kim at 65% capacity', delay: 900  },
    { id: 'a6', label: 'Compiling detailed project health report',         detail: 'Overall health: Amber (67/100) · 3 critical risks identified',   delay: 1000 },
  ];

  const runAnalysis = async (runId: number) => {
    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

    setAnalysisPhase('running');
    setAnalysisSteps(ANALYSIS_STEP_CONFIG.map(s => ({ id: s.id, label: s.label, status: 'pending' as AgentStepStatus })));

    for (const step of ANALYSIS_STEP_CONFIG) {
      if (analysisRunIdRef.current !== runId) return;
      setAnalysisSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s));
      await sleep(step.delay);
      if (analysisRunIdRef.current !== runId) return;
      setAnalysisSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done', detail: step.detail } : s));
    }
    if (analysisRunIdRef.current !== runId) return;

    setAnalysisReport({
      healthScore: 67,
      healthLabel: 'Amber',
      indicators: [
        { label: 'Epic Health',      value: '2 / 4 on track',           status: 'warning'  },
        { label: 'Milestone Risk',   value: 'Release 2.5.0 at risk',    status: 'critical' },
        { label: 'Change Control',   value: '3 pending CRs',            status: 'warning'  },
        { label: 'Team Capacity',    value: 'Sarah over-allocated',     status: 'warning'  },
        { label: 'Quality Gates',    value: '2 gates pending',          status: 'warning'  },
        { label: 'Sprint Velocity',  value: '28 / 35 pts (80%)',        status: 'good'     },
      ],
      sections: [
        {
          title: 'Epic Progress',
          items: [
            { label: 'EPIC-001: Customer Portal',       value: '45%', note: 'Behind — 65% expected by today'       },
            { label: 'EPIC-002: API Gateway',           value: '72%', note: 'On track'                             },
            { label: 'EPIC-003: Payment Integration',   value: '88%', note: 'Ahead of schedule by 15 days'         },
            { label: 'EPIC-004: Mobile App',            value: '15%', note: 'Early stage — no risk yet'           },
          ],
        },
        {
          title: 'Milestone Status',
          items: [
            { label: 'Sprint 14  (Mar 15)',   value: 'Active',    note: '87% completion'                          },
            { label: 'Release 2.5.0 (Apr 30)', value: 'At Risk',  note: 'EPIC-001 delay could push by 12 days'   },
            { label: 'UAT Sign-off (May 10)', value: 'Pending',   note: 'Dependent on Release 2.5.0'             },
          ],
        },
        {
          title: 'Change Request Impact',
          items: [
            { label: 'CR-001: Dark Mode UI',          value: 'Approved', note: '3 days — within capacity'         },
            { label: 'CR-002: GDPR Data Export',      value: 'Pending',  note: '5 days — low risk'               },
            { label: 'CR-003: Real-time Sync Engine', value: 'Pending',  note: '8 days — recommend defer'         },
          ],
        },
      ],
      keyFindings: [
        'EPIC-001 is 20% behind its velocity target — primary blocker for the Release 2.5.0 milestone.',
        'CR-003 adds 8 days to the release with marginal business value — strong candidate for deferral.',
        'Security audit (Sprint 15) has a high probability of surfacing 4–6 medium findings; remediation buffer is missing.',
      ],
    });
    setAnalysisPhase('done');
  };

  const openAnalysis = () => {
    const runId = ++analysisRunIdRef.current;
    setAnalysisOpen(true);
    setAnalysisPhase('idle');
    setAnalysisSteps([]);
    setAnalysisReport(null);
    setTimeout(() => { runAnalysis(runId); }, 400);
  };

  /** Returns Tailwind classes for a health indicator status dot and text. */
  const indicatorColor = (status: HealthIndicator['status']) => {
    switch (status) {
      case 'good':     return { dot: 'bg-green-500',  text: 'text-green-700'  };
      case 'warning':  return { dot: 'bg-yellow-500', text: 'text-yellow-700' };
      case 'critical': return { dot: 'bg-red-500',    text: 'text-red-700'   };
    }
  };

  // Transforms mockEpics into the shape that recharts' BarChart expects.
  // 'target' is always 100 so each bar shows progress-to-completion visually.
  const epicProgressData = mockEpics.map(epic => ({
    name: epic.key,
    progress: epic.progress,
    target: 100,
  }));

  const activeEpics = mockEpics.filter(e => e.status === 'in-progress').length;
  const completedEpics = mockEpics.filter(e => e.status === 'completed').length;
  const activeMilestones = mockMilestones.filter(m => m.status === 'active').length;
  const pendingSignOffs = mockSignOffs.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Project Planning & Schedule</h2>
        <p className="text-gray-600 mt-1">Track epics, milestones, releases, and deliverables</p>
      </div>

      {/* AI Insights for Planning Phase */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Sparkles className="size-5" />
              Planning Intelligence
            </h3>
            <div className="space-y-2 text-sm opacity-95">
              <p>
                <strong>Epic Risk Alert:</strong> EPIC-001 (Customer Portal) is at 45% progress but only 21 days from target. 
                AI predicts 78% chance of delay based on current velocity.
              </p>
              <p>
                <strong>Change Request Impact:</strong> 3 pending change requests will add ~12 days to Release 2.5.0. 
                Recommend deferring CR-003 to next release to maintain timeline.
              </p>
              <p>
                <strong>Quality Gate Prediction:</strong> Security audit for Sprint 15 likely to find 4-6 medium findings 
                based on recent code complexity patterns. Allocate 3 extra days for remediation.
              </p>
              <p>
                <strong>Resource Optimization:</strong> Sarah Chen's allocation across 3 epics is causing context switching. 
                Consolidate to 2 epics to improve delivery speed by 25%.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={openAnalysis}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                View Detailed Analysis
              </button>
              <button
                onClick={openAgent}
                className="bg-white text-purple-600 hover:bg-gray-100 px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Auto-Optimize Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Epics</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">{mockEpics.length}</p>
            </div>
            <Layers className="size-10 text-blue-500" />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {activeEpics} active, {completedEpics} completed
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Milestones</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">{mockMilestones.length}</p>
            </div>
            <Target className="size-10 text-purple-500" />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {activeMilestones} in progress
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Change Requests</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">{mockChangeRequests.length}</p>
            </div>
            <AlertCircle className="size-10 text-orange-500" />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {mockChangeRequests.filter(c => c.status === 'pending').length} pending
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sign-offs</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">{pendingSignOffs}</p>
            </div>
            <CheckCircle className="size-10 text-green-500" />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Awaiting approval
          </div>
        </div>
      </div>

      {/* Epic Progress Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Epic Progress Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={epicProgressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: 'Progress %', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <Bar dataKey="progress" fill="#3b82f6" name="Current Progress" />
            <Bar dataKey="target" fill="#e5e7eb" name="Target" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Epics List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Epics</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {mockEpics.map(epic => (
            <div key={epic.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Layers className="size-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">{epic.key}: {epic.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(epic.status)}`}>
                      {epic.status.replace('-', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(epic.priority)}`}>
                      {epic.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{epic.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Owner</p>
                      <p className="font-medium text-gray-900">{epic.owner}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Start Date</p>
                      <p className="font-medium text-gray-900">{new Date(epic.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Target Date</p>
                      <p className="font-medium text-gray-900">{new Date(epic.targetDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Stories</p>
                      <p className="font-medium text-gray-900">{epic.storiesCompleted}/{epic.storiesCount}</p>
                    </div>
                  </div>
                </div>

                <div className="ml-6 text-right">
                  <div className="text-sm text-gray-600 mb-1">Progress</div>
                  <div className="text-3xl font-semibold text-blue-600">{epic.progress}%</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${epic.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones & Releases */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Milestones & Releases</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {mockMilestones.map(milestone => (
            <div key={milestone.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="size-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(milestone.status)}`}>
                      {milestone.status}
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium capitalize">
                      {milestone.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-3">
                    <div>
                      <p className="text-gray-600">Duration</p>
                      <p className="font-medium text-gray-900">
                        {new Date(milestone.startDate).toLocaleDateString()} - {new Date(milestone.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Completion</p>
                      <p className="font-medium text-gray-900">{milestone.completionPercentage}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Sign-off</p>
                      {milestone.signedOff ? (
                        <p className="font-medium text-green-600 flex items-center gap-1">
                          <CheckCircle className="size-4" />
                          Approved by {milestone.signedOffBy}
                        </p>
                      ) : (
                        <p className="font-medium text-orange-600 flex items-center gap-1">
                          <Clock className="size-4" />
                          Pending
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Goals */}
                  {milestone.goals.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Goals:</p>
                      <ul className="space-y-1">
                        {milestone.goals.map((goal, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <CheckCircle className="size-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Related Epics */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {milestone.epics.map((epic, idx) => (
                      <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
                        {epic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Change Control & Quality Gates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Requests */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Change Requests</h3>
          </div>

          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {mockChangeRequests.map(cr => (
              <div key={cr.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{cr.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(cr.status)}`}>
                    {cr.status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{cr.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>Impact: <span className="font-medium capitalize">{cr.impact}</span></span>
                  <span>Effort: <span className="font-medium">{cr.estimatedEffort} days</span></span>
                  <span>By: <span className="font-medium">{cr.requestedBy}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Gates */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Quality Gates</h3>
          </div>

          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {mockQualityGates.map(qg => (
              <div key={qg.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{qg.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(qg.status)}`}>
                    {qg.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                  <span className="capitalize">{qg.type.replace('-', ' ')}</span>
                  <span>Due: {new Date(qg.dueDate).toLocaleDateString()}</span>
                  {qg.reviewedBy && <span>By: {qg.reviewedBy}</span>}
                </div>
                {qg.criticalFindings > 0 && (
                  <div className="text-xs bg-red-50 text-red-800 px-2 py-1 rounded">
                    {qg.criticalFindings} critical finding{qg.criticalFindings > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Handover to Operations */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Handover to Operations</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockHandoverItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">{item.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{item.item}</div>
                    {item.notes && <div className="text-xs text-gray-500">{item.notes}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.owner}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(item.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {item.completedDate ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="size-4" />
                        {new Date(item.completedDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AI Detailed Analysis Agent modal ─────────────────────────────── */}
      {analysisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => analysisPhase !== 'running' && setAnalysisOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="flex items-center gap-3 text-white">
                <Sparkles className="size-5" />
                <h2 className="font-semibold text-lg">AI Project Analysis Agent</h2>
              </div>
              {analysisPhase !== 'running' && (
                <button onClick={() => setAnalysisOpen(false)} className="text-white/70 hover:text-white transition-colors">
                  <X className="size-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {analysisPhase === 'idle' && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                  <Loader2 className="size-8 animate-spin" />
                  <p className="text-sm">Starting analysis…</p>
                </div>
              )}

              {/* Step log */}
              {analysisSteps.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Activity</p>
                  {analysisSteps.map(step => (
                    <div key={step.id} className="flex items-start gap-3">
                      <AgentStepIcon status={step.status} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'
                        }`}>{step.label}</p>
                        {step.detail && step.status === 'done' && (
                          <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {analysisPhase === 'done' && analysisReport && (
                <>
                  {/* Health score */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-6">
                    <div className="text-center flex-shrink-0">
                      <p className="text-5xl font-bold text-yellow-700">{analysisReport.healthScore}</p>
                      <p className="text-xs text-yellow-600 mt-1 font-medium">/ 100</p>
                    </div>
                    <div>
                      <p className="font-semibold text-yellow-900 text-lg">
                        Overall Health: {analysisReport.healthLabel}
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Project is progressing with moderate risk. Three areas require immediate attention.
                      </p>
                    </div>
                  </div>

                  {/* Health indicators grid */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Health Indicators</p>
                    <div className="grid grid-cols-2 gap-2">
                      {analysisReport.indicators.map((ind, i) => {
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

                  {/* Analysis sections */}
                  {analysisReport.sections.map((section, si) => (
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

                  {/* Key findings */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Key Findings</p>
                    <div className="space-y-2">
                      {analysisReport.keyFindings.map((finding, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <AlertCircle className="size-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                          <span>{finding}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setAnalysisOpen(false)}
                disabled={analysisPhase === 'running'}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Close
              </button>
              {analysisPhase === 'done' && (
                <button
                  onClick={openAgent}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Run Optimisation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AI Auto-Optimise Schedule Agent modal ─────────────────────────── */}
      {agentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => agentPhase !== 'running' && setAgentOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600">
              <div className="flex items-center gap-3 text-white">
                <Sparkles className="size-5" />
                <h2 className="font-semibold text-lg">AI Schedule Optimisation Agent</h2>
              </div>
              {agentPhase !== 'running' && (
                <button onClick={() => setAgentOpen(false)} className="text-white/70 hover:text-white transition-colors">
                  <X className="size-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Idle state */}
              {agentPhase === 'idle' && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                  <Loader2 className="size-8 animate-spin" />
                  <p className="text-sm">Starting agent…</p>
                </div>
              )}

              {/* Step-by-step activity log */}
              {agentSteps.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Activity</p>
                  {agentSteps.map(step => (
                    <div key={step.id} className="flex items-start gap-3">
                      <AgentStepIcon status={step.status} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'
                        }`}>
                          {step.label}
                        </p>
                        {step.detail && step.status === 'done' && (
                          <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {agentPhase === 'done' && agentPlan && (
                <>
                  {/* Summary bar */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-purple-900">Optimised Schedule Ready</p>
                    </div>
                    <div className="flex gap-6 mt-2">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-700">{agentPlan.weeksSaved}</p>
                        <p className="text-xs text-purple-600 mt-0.5">weeks saved</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-700">{agentPlan.milestonesAdjusted}</p>
                        <p className="text-xs text-purple-600 mt-0.5">milestones adjusted</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-700">{agentPlan.actions.length}</p>
                        <p className="text-xs text-purple-600 mt-0.5">actions recommended</p>
                      </div>
                    </div>
                  </div>

                  {/* Schedule actions */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Schedule Adjustments</p>
                    <div className="space-y-2">
                      {agentPlan.actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize flex-shrink-0 mt-0.5 ${actionBadgeColor(action.type)}`}>
                            {action.type}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-gray-900">{action.item}</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs font-medium text-purple-700">{action.impact}</span>
                            </div>
                            <p className="text-xs text-gray-600">{action.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI recommendations */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">AI Recommendations</p>
                    <div className="space-y-2">
                      {agentPlan.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="size-4 text-purple-500 flex-shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setAgentOpen(false)}
                disabled={agentPhase === 'running'}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Close
              </button>
              {agentPhase === 'done' && (
                <button
                  onClick={() => setAgentOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Apply Schedule
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}