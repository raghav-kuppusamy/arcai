/**
 * Stories.tsx — Jira User Stories
 *
 * Displays the current sprint's Jira stories in two ways:
 *   1. Kanban board  — five columns (Backlog → Done) for a visual workflow view
 *   2. Detail table  — all stories in a sortable table for data-heavy reviews
 *
 * An AI Intelligence banner at the top surfaces velocity predictions,
 * refinement alerts, and blocker analysis derived from the story data.
 */
import { useState, useRef } from 'react';
import { CheckCircle, Clock, AlertCircle, AlertTriangle, CheckSquare, Sparkles, ChevronUp, ChevronDown, ChevronsUpDown, Search, X, Loader2 } from 'lucide-react';
import { mockUserStories } from '../data/mockData';

type AgentStepStatus = 'pending' | 'running' | 'done';
interface AgentStep { id: string; label: string; detail?: string; status: AgentStepStatus; }

const AgentStepIcon = ({ status }: { status: AgentStepStatus }) => {
  if (status === 'done')    return <CheckCircle className="size-5 text-green-500 flex-shrink-0 mt-0.5" />;
  if (status === 'running') return <Loader2    className="size-5 text-blue-500 animate-spin flex-shrink-0 mt-0.5" />;
  return <div className="size-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />;
};

type SortKey = 'key' | 'title' | 'type' | 'status' | 'priority' | 'assignee' | 'storyPoints' | 'daysInStatus';

const SortIcon = ({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: 'asc' | 'desc' }) => {
  if (col !== sortKey) return <ChevronsUpDown className="size-3 text-gray-400 inline ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="size-3 text-blue-600 inline ml-1" />
    : <ChevronDown className="size-3 text-blue-600 inline ml-1" />;
};

/**
 * Stories — sprint kanban board + detailed story table.
 */
export function Stories() {
  /**
   * Returns Tailwind classes for a story's status badge.
   * Each status has a unique colour so reviewers can scan the board at a glance.
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in-review':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'refined':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'backlog':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Returns Tailwind classes for a priority badge.
   * Colours follow a traffic-light convention: red = critical, green = low.
   */
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

  /**
   * Returns an icon representing the work item type.
   * Defects use a red alert icon so they stand out visually on the board.
   */
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'defect':
        return <AlertCircle className="size-5 text-red-600" />;
      case 'story':
        return <CheckSquare className="size-5 text-blue-600" />;
      default:
        return <CheckCircle className="size-5 text-gray-600" />;
    }
  };

  // ─── Table sort state ──────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>('key');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // ─── Table filter state ──────────────────────────────────────────────────
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterType, setFilterType]       = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterRefined, setFilterRefined] = useState<'' | 'yes' | 'no'>('');

  /** Toggles sort direction or sets a new sort column. */
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  /** Resets all filter inputs to their default (empty) values. */
  const clearFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterType('');
    setFilterPriority('');
    setFilterRefined('');
  };

  const hasActiveFilters = search || filterStatus || filterType || filterPriority || filterRefined;

  // ─── AI Sprint Optimisation Agent ───────────────────────────────────────────
  interface SprintAction {
    type: 'escalate' | 'defer' | 'reassign' | 'split';
    story: string;
    reason: string;
    impact: string;
  }

  interface OptimisedPlan {
    achievablePoints: number;
    targetPoints: number;
    actions: SprintAction[];
    recommendations: string[];
  }

  const [agentOpen, setAgentOpen]   = useState(false);
  const [agentPhase, setAgentPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [agentPlan, setAgentPlan]   = useState<OptimisedPlan | null>(null);
  const agentRunIdRef = useRef(0);

  // Static config for the agent's sequential processing steps.
  // Each step has a simulated delay to mimic real AI processing latency.
  const AGENT_STEP_CONFIG = [
    { id: 's1', label: 'Fetching sprint and backlog data',               detail: '4 Sprint 2 stories · 29 pts committed · 5 pts done so far',               delay: 600  },
    { id: 's2', label: 'Analysing story distribution and team capacity', detail: 'Mike Johnson: 24 pts active · PROJ-1246 in-review · PROJ-124 in-progress',  delay: 900  },
    { id: 's3', label: 'Detecting blockers and at-risk items',           detail: 'PROJ-124 (API timeout, critical) in-progress · Sprint 3 has 6 unrefined',  delay: 700  },
    { id: 's4', label: 'Rebalancing workload across team members',       detail: 'Mike Johnson on critical path · Sarah Chen available for Sprint 3 prep',   delay: 1000 },
    { id: 's5', label: 'Applying velocity and capacity constraints',     detail: 'Sprint 2 velocity: 28% · 23 days left · 24 pts outstanding',              delay: 700  },
    { id: 's6', label: 'Generating optimised sprint recommendations',    detail: '3 actions identified · Sprint 2 sign-off achievable by Mar 28',           delay: 1100 },
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
      achievablePoints: 29,
      targetPoints: 29,
      actions: [
        { type: 'escalate', story: 'PROJ-124 (API Timeout)',  reason: 'Critical defect in-progress — assign second engineer to resolve by Mar 10',  impact: 'Unblocks Sprint 2 sign-off'       },
        { type: 'defer',    story: 'PROJ-128 (Update Deps)',  reason: 'Lowest priority refined story — defer if API timeout resolution overruns',    impact: 'Protects Sprint 2 capacity'       },
        { type: 'reassign', story: 'Sprint 3 Refinement',    reason: 'Sarah Chen available (PROJ-1003 on-hold) — assign to Sprint 3 story prep',   impact: 'Sprint 3 kickoff on Mar 31 safe'  },
      ],
      recommendations: [
        'Resolve PROJ-124 (API timeout) by Mar 10 — it is the last critical blocker for Sprint 2 sign-off on Mar 31.',
        'Schedule Sprint 3 refinement with Sarah Chen before Mar 25 — 6 unrefined PROJ-1002 stories risk delaying the Mar 31 kickoff.',
        'Defer PROJ-128 (update deps) if PROJ-124 overruns — 3 pts saved keeps Sprint 2 velocity on target.',
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
    // Small delay gives the modal time to render before the agent starts
    setTimeout(() => { runOptimisation(runId); }, 400);
  };

  /** Returns Tailwind classes for a sprint action type badge. */
  const actionBadgeColor = (type: string) => {
    switch (type) {
      case 'escalate': return 'bg-red-100 text-red-800';
      case 'defer':    return 'bg-gray-100 text-gray-700';
      case 'reassign': return 'bg-blue-100 text-blue-800';
      case 'split':    return 'bg-purple-100 text-purple-800';
      default:         return 'bg-gray-100 text-gray-700';
    }
  };

  // Priority ordering used for sort comparison
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const statusOrder:   Record<string, number> = { 'in-progress': 0, 'in-review': 1, refined: 2, backlog: 3, done: 4 };

  // Apply filters first, then sort the result
  const displayedStories = [...mockUserStories]
    .filter(s => {
      if (search        && !s.key.toLowerCase().includes(search.toLowerCase())
                        && !s.title.toLowerCase().includes(search.toLowerCase())
                        && !s.assignee.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus  && s.status   !== filterStatus)   return false;
      if (filterType    && s.type     !== filterType)     return false;
      if (filterPriority && s.priority !== filterPriority) return false;
      if (filterRefined === 'yes' && !s.isRefined)  return false;
      if (filterRefined === 'no'  &&  s.isRefined)  return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'key':          cmp = a.key.localeCompare(b.key); break;
        case 'title':        cmp = a.title.localeCompare(b.title); break;
        case 'type':         cmp = a.type.localeCompare(b.type); break;
        case 'status':       cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9); break;
        case 'priority':     cmp = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9); break;
        case 'assignee':     cmp = a.assignee.localeCompare(b.assignee); break;
        case 'storyPoints':  cmp = a.storyPoints - b.storyPoints; break;
        case 'daysInStatus': cmp = a.daysInStatus - b.daysInStatus; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  // Kanban column expand/collapse — default all collapsed
  const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set());
  const toggleCol = (col: string) =>
    setExpandedCols(prev => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });

  // Pre-group stories by status for kanban columns, using the already-filtered
  // displayedStories so the board stays consistent with the active filters.
  const storyGroups = {
    backlog:       displayedStories.filter(s => s.status === 'backlog'),
    refined:       displayedStories.filter(s => s.status === 'refined'),
    'in-progress': displayedStories.filter(s => s.status === 'in-progress'),
    'in-review':   displayedStories.filter(s => s.status === 'in-review'),
    done:          displayedStories.filter(s => s.status === 'done'),
  };

  // Alert thresholds — shown as warning banners above the board
  const unrefinedCount = displayedStories.filter(s => !s.isRefined && s.status === 'backlog').length;
  const blockedCount   = displayedStories.filter(s => s.blockers && s.blockers.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Jira User Stories</h2>
        <p className="text-gray-600 mt-1">Track story refinement, progress, and blockers</p>
      </div>

      {/* AI Insights for Stories */}
      <div className="bg-[#163A5F] rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Sparkles className="size-5" />
              Story Intelligence
            </h3>
            <div className="space-y-2 text-sm opacity-95">
              <p>
                <strong>Sprint 2 Progress:</strong> 1 story done (def-002), 1 in-review (PROJ-1246 Stripe integration),
                1 in-progress (PROJ-124 API timeout — critical), 1 refined and queued (PROJ-128). Sprint at 28% with 23 days left.
              </p>
              <p>
                <strong>Critical Blocker:</strong> PROJ-124 (API timeout on payment endpoints) is in-progress and must resolve
                before Sprint 2 sign-off on Mar 31. Escalate to Mike Johnson — each day of delay risks Sprint 3 kickoff.
              </p>
              <p>
                <strong>Refinement Alert:</strong> Sprint 3 starts Mar 31 with 6 unrefined stories across PROJ-1002 (Admin Dashboard).
                Schedule a refinement session before Mar 25 to ensure the sprint can kick off on time.
              </p>
              <p>
                <strong>Story Forecast:</strong> PROJ-1246 (Stripe integration) in-review — expected to complete by Mar 13.
                If PROJ-124 resolves by Mar 10, Sprint 2 is on track for sign-off. Sprint 4 stories remain on-hold pending delay resolution.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded text-sm font-medium transition-colors">
                View Sprint Forecast
              </button>
              <button
                onClick={openAgent}
                className="bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Optimize Sprint Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(unrefinedCount > 0 || blockedCount > 0) && (
        <div className="space-y-3">
          {unrefinedCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="size-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900">Unrefined Stories in Backlog</p>
                <p className="text-sm text-orange-800">
                  {unrefinedCount} {unrefinedCount === 1 ? 'story' : 'stories'} in backlog without refinement. 
                  Consider scheduling a refinement session to improve sprint planning.
                </p>
              </div>
            </div>
          )}
          
          {blockedCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="size-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Blocked Stories</p>
                <p className="text-sm text-red-800">
                  {blockedCount} {blockedCount === 1 ? 'story has' : 'stories have'} active blockers requiring immediate attention.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Story Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(storyGroups).map(([status, stories]) => (
          <div key={status} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 capitalize">{status.replace('-', ' ')}</p>
            <p className="text-3xl font-semibold text-gray-900 mt-1">{stories.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stories.reduce((sum: number, s) => sum + s.storyPoints, 0)} points
            </p>
          </div>
        ))}
      </div>

      {/* Stories Kanban View */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {Object.entries(storyGroups).map(([status, stories]) => {
          const isExpanded = expandedCols.has(status);
          return (
          <div key={status} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleCol(status)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 capitalize">{status.replace('-', ' ')}</h3>
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  {stories.length}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{stories.reduce((s, st) => s + st.storyPoints, 0)} pts</span>
                {isExpanded
                  ? <ChevronUp className="size-4 text-gray-500" />
                  : <ChevronDown className="size-4 text-gray-500" />}
              </div>
            </button>

            {isExpanded && <div className="px-4 pb-4 space-y-3">
              {stories.map(story => (
                <div key={story.id} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
                  {/* Story Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(story.type)}
                      <span className="font-medium text-sm text-gray-900">{story.key}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(story.priority)}`}>
                      {story.priority.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Story Title */}
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{story.title}</p>

                  {/* Story Meta */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{story.assignee.split(' ')[0]}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600">{story.storyPoints} pts</span>
                    </div>
                    
                    {!story.isRefined && story.status === 'backlog' && (
                      <span className="text-orange-600 font-medium">!</span>
                    )}
                  </div>

                  {/* Days in Status */}
                  {story.daysInStatus > 0 && story.status !== 'done' && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="size-3" />
                      <span>{story.daysInStatus} days</span>
                      {story.daysInStatus > 5 && status !== 'backlog' && (
                        <AlertTriangle className="size-3 text-orange-500 ml-1" />
                      )}
                    </div>
                  )}

                  {/* Blockers */}
                  {story.blockers && story.blockers.length > 0 && (
                    <div className="mt-2 bg-red-50 border border-red-200 rounded px-2 py-1">
                      <p className="text-xs text-red-800 font-medium">🚫 {story.blockers[0]}</p>
                    </div>
                  )}
                </div>
              ))}

              {stories.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No stories
                </div>
              )}
            </div>}
          </div>
        );
        })}
      </div>

      {/* Story Details Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table header + filter bar */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Detailed Story List</h3>
            <span className="text-sm text-gray-500">
              {displayedStories.length} of {mockUserStories.length} stories
            </span>
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Free-text search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search key, title, assignee…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="backlog">Backlog</option>
              <option value="refined">Refined</option>
              <option value="in-progress">In Progress</option>
              <option value="in-review">In Review</option>
              <option value="done">Done</option>
            </select>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="story">Story</option>
              <option value="defect">Defect</option>
              <option value="task">Task</option>
            </select>

            {/* Priority filter */}
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Refined filter */}
            <select
              value={filterRefined}
              onChange={e => setFilterRefined(e.target.value as '' | 'yes' | 'no')}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Refined: All</option>
              <option value="yes">Refined: Yes</option>
              <option value="no">Refined: No</option>
            </select>

            {/* Clear button — only visible when a filter is active */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 border border-gray-300 rounded-md px-3 py-1.5 transition-colors"
              >
                <X className="size-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {([
                  { label: 'Key',      col: 'key'          },
                  { label: 'Title',    col: 'title'        },
                  { label: 'Type',     col: 'type'         },
                  { label: 'Status',   col: 'status'       },
                  { label: 'Priority', col: 'priority'     },
                  { label: 'Assignee', col: 'assignee'     },
                  { label: 'Points',   col: 'storyPoints'  },
                  { label: 'Refined',  col: null           },
                  { label: 'Days',     col: 'daysInStatus' },
                ] as { label: string; col: SortKey | null }[]).map(({ label, col }) => (
                  <th
                    key={label}
                    onClick={() => col && handleSort(col)}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none ${
                      col ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                  >
                    {label}
                    {col && <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedStories.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-sm text-gray-400">
                    No stories match the current filters.
                  </td>
                </tr>
              )}
              {displayedStories.map(story => (
                <tr key={story.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(story.type)}
                      <span className="font-medium text-sm text-gray-900">{story.key}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md">{story.title}</div>
                    {story.blockers && story.blockers.length > 0 && (
                      <div className="text-xs text-red-600 mt-1">🚫 {story.blockers[0]}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700 capitalize">{story.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(story.status)}`}>
                      {story.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(story.priority)}`}>
                      {story.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{story.assignee}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{story.storyPoints}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {story.isRefined ? (
                      <CheckCircle className="size-5 text-green-500" />
                    ) : (
                      <AlertCircle className="size-5 text-orange-500" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {story.daysInStatus > 0 ? `${story.daysInStatus}d` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AI Sprint Optimisation Agent modal ─────────────────────────────── */}
      {agentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop — click to dismiss unless agent is still running */}
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
                <h2 className="font-semibold text-lg">AI Sprint Optimisation Agent</h2>
              </div>
              {agentPhase !== 'running' && (
                <button onClick={() => setAgentOpen(false)} className="text-white/70 hover:text-white transition-colors">
                  <X className="size-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Idle / initial state — shown briefly before steps begin */}
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

              {/* ── Results (shown after agent completes) ── */}
              {agentPhase === 'done' && agentPlan && (
                <>
                  {/* Summary bar */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-green-900">Optimised Sprint Plan Ready</p>
                      <span className="text-2xl font-bold text-green-700">
                        {agentPlan.achievablePoints} / {agentPlan.targetPoints} pts
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${Math.round((agentPlan.achievablePoints / agentPlan.targetPoints) * 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {Math.round((agentPlan.achievablePoints / agentPlan.targetPoints) * 100)}% of sprint target achievable with suggested actions
                    </p>
                  </div>

                  {/* Recommended actions */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Recommended Actions</p>
                    <div className="space-y-2">
                      {agentPlan.actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize flex-shrink-0 mt-0.5 ${actionBadgeColor(action.type)}`}>
                            {action.type}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-gray-900">{action.story}</span>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs font-medium text-blue-700">{action.impact}</span>
                            </div>
                            <p className="text-xs text-gray-600">{action.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI narrative recommendations */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">AI Recommendations</p>
                    <div className="space-y-2">
                      {agentPlan.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="size-4 text-blue-500 flex-shrink-0 mt-0.5" />
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
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Apply to Sprint
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}