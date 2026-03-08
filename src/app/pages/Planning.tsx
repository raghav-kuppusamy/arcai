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
    { id: 's1', label: 'Loading project schedule and epic data',            detail: '5 epics · 5 milestones · 5 change requests loaded',                              delay: 600  },
    { id: 's2', label: 'Analysing epic velocity and completion forecasts',   detail: 'PROJ-1001: 22% (Sprint 2 active) · PROJ-1003: on-hold (Sprint 4 delayed)',      delay: 900  },
    { id: 's3', label: 'Evaluating milestone dependencies and critical path', detail: 'Critical path: Sprint 2 → Sprint 3 → Sprint 4 (delayed 2 wks) → v1.0 Release', delay: 800  },
    { id: 's4', label: 'Assessing change request impact on timeline',        detail: 'CR-001 approved (5 days, Sprint 2) · CR-002 pending (3 days, Sprint 3 risk)',   delay: 700  },
    { id: 's5', label: 'Optimising resource allocation across epics',        detail: 'Mike Johnson: Sprint 2 critical path · Sprint 4 resources available for reuse', delay: 1000 },
    { id: 's6', label: 'Generating optimised schedule with risk buffers',    detail: '3 adjustments identified · 2 weeks recovered if Sprint 4 dependency resolved', delay: 1100 },
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
      weeksSaved: 2,
      milestonesAdjusted: 1,
      actions: [
        { type: 'fast-track',  item: 'PROJ-124 (API Timeout)',    reason: 'Critical defect in Sprint 2 — pull in additional engineer to resolve by Mar 10', impact: 'Unblocks Sprint 2 sign-off'      },
        { type: 'defer',       item: 'CR-002 (PayPal Gateway)',   reason: 'Adds 3 days to Sprint 3 with lower urgency than Stripe — safe to defer',         impact: 'Saves 3 days in Sprint 3'       },
        { type: 'reschedule',  item: 'Sprint 3 kickoff buffer',   reason: 'Add 3-day overlap buffer for story handoff between Sprint 2 and Sprint 3',        impact: 'Reduces Sprint 3 planning risk'  },
        { type: 'consolidate', item: 'Sprint 4 resource pool',    reason: 'PROJ-1003 on-hold — reassign Sarah Chen to Sprint 3 refinement and prep work',    impact: '+20% Sprint 3 delivery velocity' },
      ],
      recommendations: [
        'Resolve PROJ-124 (API timeout) by Mar 10 — it is blocking Sprint 2 sign-off and cascades to Sprint 3 start date.',
        'Schedule Sprint 3 refinement session before Mar 25 — all 6 PROJ-1002 stories are unrefined for the Mar 31 kickoff.',
        'Defer CR-002 (PayPal Gateway) to Sprint 4 — protects Sprint 3 capacity and keeps the Admin Dashboard epic on schedule.',
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
    { id: 'a1', label: 'Scanning epic progress and health indicators',    detail: 'PROJ-1000: 100% done · PROJ-1001: 22% (Sprint 2) · PROJ-1003: on-hold (Sprint 4 delayed)', delay: 600  },
    { id: 'a2', label: 'Analysing milestone completion trends',            detail: 'Sprint 2 active (28%, 23 days left) · Sprint 4 delayed 2 weeks · Sprint 3 unrefined', delay: 800  },
    { id: 'a3', label: 'Reviewing change request risk and impact',         detail: '2 pending CRs · CR-002 (PayPal, 3 days) risks Sprint 3 timeline',               delay: 700  },
    { id: 'a4', label: 'Evaluating quality gate readiness',                detail: 'Security audit in-progress (Sprint 2) · 4 quality gates pending downstream',     delay: 600  },
    { id: 'a5', label: 'Assessing team workload distribution',             detail: 'Mike Johnson: Sprint 2 critical path · Sarah Chen available for Sprint 3 prep',  delay: 900  },
    { id: 'a6', label: 'Compiling detailed project health report',         detail: 'Overall health: Amber (62/100) · 3 risks identified',                           delay: 1000 },
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
      healthScore: 62,
      healthLabel: 'Amber',
      indicators: [
        { label: 'Epic Health',      value: '1 completed · 1 active',       status: 'good'     },
        { label: 'Milestone Risk',   value: 'Sprint 4 delayed 2 weeks',     status: 'critical' },
        { label: 'Change Control',   value: '2 pending CRs',                status: 'warning'  },
        { label: 'Team Capacity',    value: 'Sprint 4 resources idle',      status: 'warning'  },
        { label: 'Quality Gates',    value: '4 gates pending',              status: 'warning'  },
        { label: 'Sprint Velocity',  value: 'Sprint 2 — 28% · 23 days left', status: 'warning'  },
      ],
      sections: [
        {
          title: 'Epic Progress',
          items: [
            { label: 'PROJ-1000: User Authentication',     value: '100%', note: 'Completed in Sprint 1 — signed off'          },
            { label: 'PROJ-1001: Payment Gateway',         value: '22%',  note: 'Sprint 2 active — 1 done, 1 in-review'       },
            { label: 'PROJ-1002: Admin Dashboard',         value: '0%',   note: 'Sprint 3 planning — starts Mar 31'           },
            { label: 'PROJ-1003: Real-time Notifications', value: '0%',   note: 'On hold — Sprint 4 delayed to May 15'        },
            { label: 'PROJ-1004: Data Export',             value: '0%',   note: 'Backlog — scoped for v1.0 Release (Jun)'    },
          ],
        },
        {
          title: 'Milestone Status',
          items: [
            { label: 'Sprint 2  (Mar 31)',    value: 'Active',   note: '28% complete · critical defect in-progress' },
            { label: 'Sprint 3  (Apr 29)',    value: 'Planning', note: '6 unrefined stories — refinement needed by Mar 25' },
            { label: 'Sprint 4  (Jun 14)',    value: 'Delayed',  note: 'Pushed 2 weeks — May 1 → May 15'            },
          ],
        },
        {
          title: 'Change Request Impact',
          items: [
            { label: 'CR-001: Extend Auth System',  value: 'Approved', note: '5 days — within Sprint 2 capacity'   },
            { label: 'CR-002: Add PayPal Gateway',  value: 'Pending',  note: '3 days — recommend defer to Sprint 4' },
            { label: 'CR-004: Email Notifications', value: 'Pending',  note: '4 days — Sprint 4 capacity at risk'  },
          ],
        },
      ],
      keyFindings: [
        'Sprint 4 delayed by 2 weeks (May 1 → May 15) — PROJ-1003 on-hold with 5 unassigned stories. Resource reallocation to Sprint 3 prep recommended.',
        'PROJ-124 (API timeout critical defect) is in-progress in Sprint 2 — must be resolved before end-of-sprint sign-off on Mar 31.',
        'Sprint 3 starts Mar 31 with 6 unrefined stories — a refinement session must be scheduled by Mar 25 to avoid a delayed kickoff.',
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
      <div className="bg-[#163A5F] rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Sparkles className="size-5" />
              Planning Intelligence
            </h3>
            <div className="space-y-2 text-sm opacity-95">
              <p>
                <strong>Sprint 2 Velocity Alert:</strong> Sprint 2 (Payment Gateway) is 28% complete with 23 days remaining.
                1 story done, 1 in review, 1 in progress. Critical defect PROJ-124 (API timeout) must resolve before sign-off.
              </p>
              <p>
                <strong>Sprint 4 Delay Risk:</strong> Sprint 4 pushed 2 weeks (May 1 → May 15) due to Sprint 3 dependency.
                PROJ-1003 (Real-time Notifications) is on hold — 5 stories unassigned. Early resource planning needed.
              </p>
              <p>
                <strong>Sprint 3 Readiness:</strong> Sprint 3 starts Mar 31 with 6 unrefined stories across PROJ-1002.
                Refinement session must be scheduled by Mar 25 to avoid a delayed kickoff.
              </p>
              <p>
                <strong>Change Request Impact:</strong> CR-002 (PayPal Gateway, 3 days) pending against Sprint 3 capacity.
                Recommend deferring to Sprint 4 to protect the Sprint 3 timeline.
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
            <div className="flex items-center justify-between px-6 py-4 bg-[#163A5F]">
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
            <div className="flex items-center justify-between px-6 py-4 bg-[#163A5F]">
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