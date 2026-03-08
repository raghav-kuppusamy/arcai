/**
 * mockData.ts — Simulated Project Execution Dataset
 *
 * This file serves as the single source of truth for all demo data in Arc AI.
 * Every interface defined here mirrors what a real backend API would return
 * once the platform is connected to live Jira, GitHub, and CI/CD integrations.
 *
 * Data is grouped into the following sections:
 *   1. Type Definitions  — interfaces for all domain entities
 *   2. Planning Data     — epics, milestones, change requests, quality gates, sign-offs, handover items
 *   3. Jira Data         — user stories and sprint activity
 *   4. GitHub Data       — pull requests and commit history
 *   5. Deployment Data   — per-environment deployment records
 *   6. Insight Data      — bottlenecks and AI recommendations
 *   7. Historical Metrics — trend series for charts (velocity, cycle time, defects, PR review time)
 *   8. Guardrail Types & Data — ESLint, SonarQube, Fortify, test runs, security scans
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: TYPE DEFINITIONS
// Each interface maps to a real data entity. Fields are documented inline
// where the name alone doesn't make the intent clear.
// ─────────────────────────────────────────────────────────────────────────────

/** A large unit of work in Jira that groups related user stories under a theme. */
export interface Epic {
  id: string;
  key: string;
  title: string;
  description: string;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold'|'refined'|'blocked'|'in-review'|'backlog';
  priority: 'critical' | 'high' | 'medium' | 'low';
  startDate: string;
  targetDate: string;
  completionDate?: string;
  progress: number; // 0–100 completion percentage
  storiesCount: number;      // total child stories linked to this epic
  storiesCompleted: number;  // how many of those are in 'done'
  owner: string;
}

/** A time-boxed delivery checkpoint — can be a sprint, a release, or a named milestone. */
export interface Milestone {
  id: string;
  name: string;
  type: 'sprint' | 'release' | 'milestone';
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed' | 'delayed';
  goals: string[];
  completionPercentage: number;
  epics: string[];       // epic keys (e.g. 'PROJ-1000') that belong to this milestone
  signOffRequired: boolean; // true = must be formally signed off before closing
  signedOff: boolean;
  signedOffBy?: string;
  signedOffDate?: string;
}

/**
 * A formal request to change the scope, schedule, resources, or requirements
 * of the project. Must go through an approval workflow before being implemented.
 */
export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedDate: string;
  type: 'scope-change' | 'schedule-change' | 'resource-change' | 'requirement-change';
  impact: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  approvedBy?: string;
  approvedDate?: string;
  affectedEpics: string[];
  estimatedEffort: number; // estimated implementation effort in working days
  reason: string;          // the business rationale behind this request
}

/**
 * A quality checkpoint that must be passed before a milestone can be signed off.
 * Each gate type (code-review, security-audit, etc.) has a different owner and criteria.
 */
export interface QualityGate {
  id: string;
  name: string;
  type: 'code-review' | 'security-audit' | 'performance-test' | 'uat' | 'compliance-check';
  status: 'passed' | 'failed' | 'pending' | 'in-progress';
  milestone: string;
  dueDate: string;
  completedDate?: string;
  reviewedBy?: string;
  findings: number;         // total issues found during this gate
  criticalFindings: number;  // subset that are classified as critical severity
  notes?: string;
}

/**
 * A formal approval from a stakeholder (business, tech, security, legal, ops)
 * required before a milestone can be considered complete.
 */
export interface SignOff {
  id: string;
  milestone: string;
  type: 'business' | 'technical' | 'security' | 'legal' | 'operations';
  approver: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'conditional';
  requestedDate: string;
  respondedDate?: string;
  comments?: string;
  conditions?: string[];
}

/**
 * A checklist item for the formal handover to the operations team.
 * Ensures nothing is forgotten when a feature or system moves to production support.
 */
export interface HandoverItem {
  id: string;
  category: 'documentation' | 'training' | 'runbook' | 'access' | 'monitoring' | 'support';
  item: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  owner: string;
  dueDate: string;
  completedDate?: string;
  notes?: string;
}

/**
 * A single work item tracked in Jira — can be a story, defect, or task.
 * This is the most granular unit of deliverable work in the sprint.
 */
export interface UserStory {
  id: string;
  key: string; // Jira issue key, e.g. 'PROJ-1245'
  title: string;
  status: 'backlog' | 'refined' | 'in-progress' | 'in-review' | 'done';
  priority: 'critical' | 'high' | 'medium' | 'low';
  storyPoints: number;
  assignee: string;
  isRefined: boolean;       // true once the team has gone through refinement on this story
  createdDate: string;
  startedDate?: string;      // when the story moved to 'in-progress'
  completedDate?: string;    // when it reached 'done'
  daysInStatus: number;      // how long it has been in its current status (a key aging signal)
  type: 'story' | 'defect' | 'task';
  blockers?: string[];       // human-readable descriptions of what is blocking progress
  epicKey?: string;          // links this story back to its parent epic
}

/** A GitHub pull request, including blocking analysis (review comments, AI issues, pipeline). */
export interface PullRequest {
  id: string;
  number: number;
  title: string;
  author: string;
  status: 'open' | 'under-review' | 'approved' | 'merged' | 'closed';
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
  reviewers: string[];
  commits: number;
  filesChanged: number;
  additions: number;
  deletions: number;
  linkedStory?: string;
  daysOpen: number;          // 0 for merged/closed; active count for open PRs
  hasConflicts?: boolean;    // true when the branch has unresolved merge conflicts

  // --- Blocking analysis ---
  // These fields power the "Code Review Intelligence" panel.
  // A PR can be blocked by one of three root causes:
  //   1. review-comments  — reviewers have left unresolved comments
  //   2. ai-review        — automated AI scan found issues not yet addressed
  //   3. pipeline-failure — CI checks are red, blocking merge
  blockingReason?: 'review-comments' | 'ai-review' | 'pipeline-failure' | null;
  reviewComments?: ReviewComment[];
  aiReviewIssues?: AIReviewIssue[];
  pipelineStatus?: 'success' | 'failed' | 'pending' | 'running';
  pipelineFailureReason?: string; // human-readable CI failure summary
  pipelineUrl?: string;           // deep-link to the failing CI run
}

/** An individual reviewer comment left on a specific line in a pull request. */
export interface ReviewComment {
  id: string;
  reviewer: string;
  comment: string;
  file: string;              // relative path of the file the comment targets
  line: number;
  severity: 'critical' | 'major' | 'minor';
  resolved: boolean;         // true once the author has addressed it
}

/**
 * An issue raised by the automated AI code review tool.
 * Unlike human review comments, these are categorised by type
 * (security, performance, etc.) and carry an actionable suggestion.
 */
export interface AIReviewIssue {
  id: string;
  type: 'security' | 'performance' | 'code-quality' | 'best-practice';
  severity: 'critical' | 'major' | 'minor';
  message: string;
  file: string;
  line: number;
  suggestion: string;  // the concrete fix the AI recommends
  addressed: boolean;  // true once the author has resolved it
}

/** A single Git commit linked to a Jira story for traceability. */
export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  branch: string;
  linkedStory?: string;
}

/** A single deployment event for a specific environment and application version. */
export interface Deployment {
  id: string;
  version: string;
  environment: 'dev' | 'qa' | 'uat' | 'prod';
  status: 'success' | 'failed' | 'in-progress' | 'pending';
  deployedAt: string;
  deployedBy: string;
  duration: number;       // elapsed time in minutes
  features: string[];     // Jira keys of new features included in this build
  defectsFixes: string[]; // Jira keys of defects fixed in this build
}

/**
 * An AI-detected delivery bottleneck at a specific stage of the SDLC.
 * Each bottleneck includes impact context and a trend direction so the
 * team knows whether things are getting better or worse.
 */
export interface Bottleneck {
  id: string;
  stage: 'planning' | 'development' | 'review' | 'deployment';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  impact: string;
  affectedItems: number;  // number of stories, PRs, or deploys affected
  avgDelay: number;        // average delay caused, in days
  trend: 'increasing' | 'stable' | 'decreasing'; // is this bottleneck getting worse?
}

/**
 * A prioritised action the AI recommends to improve delivery throughput.
 * Sorted by impact/effort ratio — high impact + low effort = quick win.
 */
export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'planning' | 'development' | 'review' | 'deployment' | 'process';
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  estimatedImprovement: string; // plain-English description of expected metric improvement
  actionItems: string[];         // step-by-step actions the team should take
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: PLANNING DATA
// Epics, sprints/milestones, change requests, quality gates, sign-offs,
// and operations handover items.
// ─────────────────────────────────────────────────────────────────────────────

export const mockEpics: Epic[] = [
  {
    id: 'ep-001',
    key: 'PROJ-1000',
    title: 'User Authentication System',
    description: 'Implement a robust user authentication system with OAuth2 and SSO support',
    status: 'completed',        // Sprint 1 (ms-001) completed — all auth stories delivered
    priority: 'high',
    startDate: '2026-02-01',
    targetDate: '2026-02-28',   // Sprint 1 end
    completionDate: '2026-02-28',
    progress: 100,
    storiesCount: 5,
    storiesCompleted: 5,
    owner: 'Sarah Chen',
  },
  {
    id: 'ep-002',
    key: 'PROJ-1001',
    title: 'Payment Gateway Integration',
    description: 'Integrate Stripe payment gateway with support for refunds and webhooks',
    status: 'in-progress',      // Sprint 2 is active (28% complete)
    priority: 'high',
    startDate: '2026-03-01',
    targetDate: '2026-03-31',   // Sprint 2 end
    progress: 22,
    storiesCount: 4,
    storiesCompleted: 1,        // 1 story done so far in Sprint 2
    owner: 'Mike Johnson',
  },
  {
    id: 'ep-003',
    key: 'PROJ-1002',
    title: 'Admin Dashboard Analytics',
    description: 'Develop an admin dashboard with real-time analytics and reporting capabilities',
    status: 'planning',          // Sprint 3 starts 2026-03-31 — not yet started
    priority: 'medium',
    startDate: '2026-03-31',
    targetDate: '2026-04-29',   // Sprint 3 end
    progress: 0,
    storiesCount: 6,
    storiesCompleted: 0,
    owner: 'Emma Davis',
  },
  {
    id: 'ep-004',
    key: 'PROJ-1003',
    title: 'Real-time Notifications',
    description: 'Implement real-time in-app and email notifications for critical system events',
    status: 'on-hold',          // Sprint 4 delayed 2 weeks — dependent on Sprint 3 completion
    priority: 'medium',
    startDate: '2026-05-15',
    targetDate: '2026-06-14',   // Sprint 4 revised end
    progress: 0,
    storiesCount: 5,
    storiesCompleted: 0,
    owner: 'Sarah Chen',
  },
  {
    id: 'ep-005',
    key: 'PROJ-1004',
    title: 'Data Export Functionality',
    description: 'Add CSV, Excel and PDF export capabilities for reports and analytics data',
    status: 'backlog',          // Scoped for v1.0 Production Release in June
    priority: 'low',
    startDate: '2026-06-01',
    targetDate: '2026-06-30',   // v1.0 Release window
    progress: 0,
    storiesCount: 4,
    storiesCompleted: 0,
    owner: 'Alex Kumar',
  },
];

export const mockMilestones: Milestone[] = [
  {
    id: 'ms-001',
    name: 'Sprint 1',
    type: 'sprint',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    status: 'completed',
    goals: ['Implement OAuth2 authentication flow', 'Set up CI/CD pipeline', 'Complete API design docs'],
    completionPercentage: 100,
    epics: ['PROJ-1000'],
    signOffRequired: true,
    signedOff: true,
    signedOffBy: 'Mike Johnson',
    signedOffDate: '2026-02-28',
  },
  {
    id: 'ms-002',
    name: 'Sprint 2',
    type: 'sprint',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: 'active',
    goals: ['Integrate Stripe payment gateway', 'Build customer portal UI', 'Unit test coverage ≥ 80%'],
    completionPercentage: 28,
    epics: ['PROJ-1001', 'PROJ-1000'],
    signOffRequired: true,
    signedOff: false,
  },
  {
    id: 'ms-003',
    name: 'Sprint 3',
    type: 'sprint',
    startDate: '2026-03-31',
    endDate: '2026-04-29',
    status: 'planning',
    goals: ['Admin dashboard analytics', 'Performance optimisation', 'Accessibility audit'],
    completionPercentage: 0,
    epics: ['PROJ-1002'],
    signOffRequired: true,
    signedOff: false,
  },
  {
    id: 'ms-004',
    name: 'Sprint 4',
    type: 'sprint',
    startDate: '2026-05-15',     // originally May 1 — pushed 2 weeks due to Sprint 3 dependency risk
    endDate: '2026-06-14',
    status: 'delayed',
    goals: ['Real-time notifications', 'Email alert system', 'Mobile responsive design'],
    completionPercentage: 0,
    epics: ['PROJ-1003'],
    signOffRequired: true,
    signedOff: false,
  },
  {
    id: 'ms-005',
    name: 'v1.0 Production Release',
    type: 'release',
    startDate: '2026-06-15',
    endDate: '2026-06-30',
    status: 'planning',
    goals: ['Full regression testing', 'Security penetration test', 'Go-live sign-off from all stakeholders'],
    completionPercentage: 0,
    epics: ['PROJ-1000', 'PROJ-1001', 'PROJ-1002', 'PROJ-1003', 'PROJ-1004'],
    signOffRequired: true,
    signedOff: false,
  },
];

export const mockChangeRequests: ChangeRequest[] = [
  {
    id: 'cr-001',
    title: 'Extend User Authentication System',
    description: 'Add support for SSO and multi-factor authentication',
    requestedBy: 'Sarah Chen',
    requestedDate: '2026-03-05',
    type: 'scope-change',
    impact: 'high',
    status: 'approved',
    approvedBy: 'Mike Johnson',
    approvedDate: '2026-03-07',
    affectedEpics: ['PROJ-1000'],
    estimatedEffort: 5,
    reason: 'Enhance security and user experience',
  },
  {
    id: 'cr-002',
    title: 'Add PayPal Payment Gateway',
    description: 'Integrate PayPal as an additional payment gateway',
    requestedBy: 'Mike Johnson',
    requestedDate: '2026-03-03',
    type: 'scope-change',
    impact: 'medium',
    status: 'pending',
    approvedBy: 'Sarah Chen',
    approvedDate: '2026-03-07',
    affectedEpics: ['PROJ-1001'],
    estimatedEffort: 3,
    reason: 'Expand payment options for users',
  },
  {
    id: 'cr-003',
    title: 'Enhance Admin Dashboard',
    description: 'Add predictive analytics and forecasting features to the admin dashboard',
    requestedBy: 'Emma Davis',
    requestedDate: '2026-04-01',
    type: 'scope-change',
    impact: 'high',
    status: 'approved',
    approvedBy: 'Mike Johnson',
    approvedDate: '2026-04-03',
    affectedEpics: ['PROJ-1002'],
    estimatedEffort: 7,
    reason: 'Improve decision-making with data insights',
  },
  {
    id: 'cr-004',
    title: 'Add Email Notifications',
    description: 'Implement email notifications for critical system events and alerts',
    requestedBy: 'Sarah Chen',
    requestedDate: '2026-05-01',
    type: 'scope-change',
    impact: 'medium',
    status: 'pending',
    approvedBy: 'Mike Johnson',
    approvedDate: '2026-05-03',
    affectedEpics: ['PROJ-1003'],
    estimatedEffort: 4,
    reason: 'Ensure users are informed of important updates',
  },
  {
    id: 'cr-005',
    title: 'Add PDF Export Option',
    description: 'Add functionality to export data to PDF format',
    requestedBy: 'Alex Kumar',
    requestedDate: '2026-06-01',
    type: 'scope-change',
    impact: 'low',
    status: 'approved',
    approvedBy: 'Sarah Chen',
    approvedDate: '2026-06-03',
    affectedEpics: ['PROJ-1004'],
    estimatedEffort: 2,
    reason: 'Provide additional export format for users',
  },
];

export const mockQualityGates: QualityGate[] = [
  {
    id: 'qg-001',
    name: 'Code Review',
    type: 'code-review',
    status: 'passed',
    milestone: 'ms-001',
    dueDate: '2026-02-28',
    completedDate: '2026-02-26',
    reviewedBy: 'Mike Johnson',
    findings: 0,
    criticalFindings: 0,
    notes: 'No issues found during code review',
  },
  {
    id: 'qg-002',
    name: 'Security Audit',
    type: 'security-audit',
    status: 'in-progress',
    milestone: 'ms-002',
    dueDate: '2026-03-28',
    reviewedBy: 'Sarah Chen',
    findings: 0,
    criticalFindings: 0,
    notes: 'No security vulnerabilities detected',
  },
  {
    id: 'qg-003',
    name: 'Performance Test',
    type: 'performance-test',
    status: 'pending',
    milestone: 'ms-003',
    dueDate: '2026-04-26',
    reviewedBy: 'Emma Davis',
    findings: 0,
    criticalFindings: 0,
    notes: 'Performance metrics within acceptable range',
  },
  {
    id: 'qg-004',
    name: 'UAT',
    type: 'uat',
    status: 'pending',
    milestone: 'ms-004',
    dueDate: '2026-06-10',  // shifted with Sprint 4 delay
    reviewedBy: 'Sarah Chen',
    findings: 0,
    criticalFindings: 0,
    notes: 'User acceptance testing completed successfully',
  },
  {
    id: 'qg-005',
    name: 'Compliance Check',
    type: 'compliance-check',
    status: 'pending',
    milestone: 'ms-005',
    dueDate: '2026-06-20',
    reviewedBy: 'Alex Kumar',
    findings: 0,
    criticalFindings: 0,
    notes: 'All compliance requirements met',
  },
];

export const mockSignOffs: SignOff[] = [
  {
    id: 'so-001',
    milestone: 'ms-001',
    type: 'business',
    approver: 'John Doe',
    role: 'Business Analyst',
    status: 'approved',
    requestedDate: '2026-02-28',
    respondedDate: '2026-02-28',
    comments: 'All requirements met, ready for deployment',
  },
  {
    id: 'so-002',
    milestone: 'ms-002',
    type: 'technical',
    approver: 'Mike Johnson',
    role: 'Technical Lead',
    status: 'pending',
    requestedDate: '2026-03-25',
    comments: 'Awaiting sprint completion before technical review',
  },
  {
    id: 'so-003',
    milestone: 'ms-003',
    type: 'security',
    approver: 'Sarah Chen',
    role: 'Security Engineer',
    status: 'pending',
    requestedDate: '2026-04-25',
    comments: 'Sprint not yet started — security review scheduled post-sprint',  
  },
  {
    id: 'so-004',
    milestone: 'ms-004',
    type: 'legal',
    approver: 'Jane Smith',
    role: 'Legal Advisor',
    status: 'pending',
    requestedDate: '2026-05-25',
    comments: 'Sprint 4 delayed by 2 weeks — legal review rescheduled to Jun 10',
  },
  {
    id: 'so-005',
    milestone: 'ms-005',
    type: 'operations',
    approver: 'Alex Kumar',
    role: 'Operations Manager',
    status: 'pending',
    requestedDate: '2026-06-20',
    comments: 'Go-live approval required from all stakeholders',
  },
];

export const mockHandoverItems: HandoverItem[] = [
  {
    id: 'hi-001',
    category: 'documentation',
    item: 'User Authentication System Documentation',
    status: 'completed',
    owner: 'Sarah Chen',
    dueDate: '2026-03-25',
    completedDate: '2026-03-25',
    notes: 'Detailed documentation for user authentication system',
  },
  {
    id: 'hi-002',
    category: 'training',
    item: 'Payment Gateway Integration Training',
    status: 'completed',
    owner: 'Mike Johnson',
    dueDate: '2026-04-20',
    completedDate: '2026-04-20',
    notes: 'Training materials for payment gateway integration',
  },
  {
    id: 'hi-003',
    category: 'runbook',
    item: 'Admin Dashboard Analytics Runbook',
    status: 'completed',
    owner: 'Emma Davis',
    dueDate: '2026-05-25',
    completedDate: '2026-05-25',
    notes: 'Runbook for admin dashboard analytics',
  },
  {
    id: 'hi-004',
    category: 'access',
    item: 'Real-time Notifications Access',
    status: 'completed',
    owner: 'Sarah Chen',
    dueDate: '2026-06-25',
    completedDate: '2026-06-25',
    notes: 'Access details for real-time notifications',
  },
  {
    id: 'hi-005',
    category: 'support',
    item: 'Data Export Functionality Support',
    status: 'completed',
    owner: 'Alex Kumar',
    dueDate: '2026-07-25',
    completedDate: '2026-07-25',
    notes: 'Support documentation for data export functionality',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: JIRA DATA
// User stories currently tracked in the active sprint plus the backlog.
// Stories prefixed 'us-' are feature work; 'def-' are defects; 'jira-' are
// imported from the external security-scan-results.json fixture.
// ─────────────────────────────────────────────────────────────────────────────

export const mockUserStories: UserStory[] = [
  // --- Core sprint stories ---
  {
    id: 'us-001',
    key: 'PROJ-1245',
    title: 'Implement user authentication with OAuth2',
    status: 'done',
    priority: 'high',
    storyPoints: 8,
    assignee: 'Sarah Chen',
    isRefined: true,
    createdDate: '2026-02-15',
    startedDate: '2026-02-16',
    completedDate: '2026-02-24',
    daysInStatus: 0,
    type: 'story',
    epicKey: 'PROJ-1000',
  },
  {
    id: 'us-002',
    key: 'PROJ-1246',
    title: 'Add Stripe payment gateway integration',
    status: 'in-review',
    priority: 'high',
    storyPoints: 13,
    assignee: 'Mike Johnson',
    isRefined: true,
    createdDate: '2026-02-20',
    startedDate: '2026-03-03',
    daysInStatus: 5,
    type: 'story',
    epicKey: 'PROJ-1001',
  },
  {
    id: 'us-003',
    key: 'PROJ-1247',
    title: 'Create admin dashboard analytics',
    status: 'backlog',
    priority: 'medium',
    storyPoints: 5,
    assignee: 'Emma Davis',
    isRefined: false,
    createdDate: '2026-02-25',
    daysInStatus: 10,
    type: 'story',
    epicKey: 'PROJ-1002',
  },
  {
    id: 'def-001',
    key: 'PROJ-1248',
    title: 'Fix login page crashes on mobile',
    status: 'done',
    priority: 'critical',
    storyPoints: 3,
    assignee: 'Alex Kumar',
    isRefined: true,
    createdDate: '2026-02-18',
    startedDate: '2026-02-18',
    completedDate: '2026-02-21',
    daysInStatus: 0,
    type: 'defect',
    epicKey: 'PROJ-1000',
  },
  {
    id: 'us-004',
    key: 'PROJ-1249',
    title: 'Implement real-time in-app notifications',
    status: 'backlog',
    priority: 'medium',
    storyPoints: 8,
    assignee: 'Sarah Chen',
    isRefined: false,
    createdDate: '2026-03-01',
    daysInStatus: 7,
    type: 'story',
    epicKey: 'PROJ-1003',
  },
  {
    id: 'def-002',
    key: 'PROJ-1250',
    title: 'Database connection timeout issue',
    status: 'done',
    priority: 'high',
    storyPoints: 5,
    assignee: 'Mike Johnson',
    isRefined: true,
    createdDate: '2026-02-22',
    startedDate: '2026-02-23',
    completedDate: '2026-03-04',
    daysInStatus: 0,
    type: 'defect',
    epicKey: 'PROJ-1001',
  },
  {
    id: 'us-005',
    key: 'PROJ-1251',
    title: 'User profile customization',
    status: 'backlog',
    priority: 'low',
    storyPoints: 5,
    assignee: 'Emma Davis',
    isRefined: false,
    createdDate: '2026-03-01',
    daysInStatus: 6,
    type: 'story',
    epicKey: 'PROJ-1002',
  },
  {
    id: 'us-006',
    key: 'PROJ-1252',
    title: 'Export data to CSV and Excel',
    status: 'backlog',
    priority: 'low',
    storyPoints: 3,
    assignee: 'Unassigned',
    isRefined: false,
    createdDate: '2026-03-05',
    daysInStatus: 3,
    type: 'story',
    epicKey: 'PROJ-1004',
  },
  
  // --- Issues imported from security-scan-results.json ---
  // These represent real defects and tasks surfaced by automated scans.
  {
    id: 'jira-001',
    key: 'PROJ-123',
    title: 'Login page broken on Safari',
    status: 'done',
    priority: 'critical',
    storyPoints: 5,
    assignee: 'Sarah Chen',
    isRefined: true,
    createdDate: '2026-02-10',
    startedDate: '2026-02-10',
    completedDate: '2026-02-20',
    daysInStatus: 0,
    type: 'defect',
    epicKey: 'PROJ-1000',
  },
  {
    id: 'jira-002',
    key: 'PROJ-124',
    title: 'API timeout on payment service endpoints',
    status: 'in-progress',
    priority: 'critical',
    storyPoints: 8,
    assignee: 'Mike Johnson',
    isRefined: true,
    createdDate: '2026-03-02',
    startedDate: '2026-03-06',
    daysInStatus: 2,
    type: 'defect',
    epicKey: 'PROJ-1001',
  },
  {
    id: 'jira-003',
    key: 'PROJ-125',
    title: 'Admin dashboard chart rendering glitch',
    status: 'backlog',
    priority: 'high',
    storyPoints: 3,
    assignee: 'Emma Davis',
    isRefined: false,
    createdDate: '2026-03-05',
    daysInStatus: 3,
    type: 'defect',
    epicKey: 'PROJ-1002',
  },
  {
    id: 'jira-004',
    key: 'PROJ-126',
    title: 'Mobile responsive admin dashboard layout',
    status: 'backlog',
    priority: 'medium',
    storyPoints: 5,
    assignee: 'Emma Davis',
    isRefined: false,
    createdDate: '2026-03-06',
    daysInStatus: 2,
    type: 'story',
    epicKey: 'PROJ-1002',
  },
  {
    id: 'jira-005',
    key: 'PROJ-127',
    title: 'Write e2e tests',
    status: 'backlog',
    priority: 'low',
    storyPoints: 13,
    assignee: 'Dana',
    isRefined: false,
    createdDate: '2026-03-04',
    daysInStatus: 4,
    type: 'task',
    epicKey: 'PROJ-1003',
  },
  {
    id: 'jira-006',
    key: 'PROJ-128',
    title: 'Update payment library dependencies',
    status: 'refined',
    priority: 'medium',
    storyPoints: 3,
    assignee: 'Mike Johnson',
    isRefined: true,
    createdDate: '2026-03-05',
    daysInStatus: 3,
    type: 'task',
    epicKey: 'PROJ-1001',
  },
  {
    id: 'jira-007',
    key: 'PROJ-129',
    title: 'Documentation update',
    status: 'backlog',
    priority: 'low',
    storyPoints: 2,
    assignee: 'Unassigned',
    isRefined: false,
    createdDate: '2026-03-06',
    daysInStatus: 2,
    type: 'task',
    epicKey: 'PROJ-1004',
  },
  {
    id: 'jira-008',
    key: 'PROJ-130',
    title: 'Database indexing',
    status: 'in-progress',
    priority: 'high',
    storyPoints: 5,
    assignee: 'Bob',
    isRefined: true,
    createdDate: '2026-03-03',
    startedDate: '2026-03-04',
    daysInStatus: 4,
    type: 'story',
    epicKey: 'PROJ-1001',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: GITHUB DATA
// Pull requests and commits. PR data includes blocking analysis so the
// "Code Review Intelligence" panel can surface the root cause of delays.
// ─────────────────────────────────────────────────────────────────────────────

export const mockPullRequests: PullRequest[] = [
  {
    id: 'pr-001',
    number: 342,
    title: 'feat: Add OAuth2 authentication flow',
    author: 'Sarah Chen',
    status: 'under-review',
    createdAt: '2026-03-05T10:30:00Z',
    updatedAt: '2026-03-07T08:15:00Z',
    reviewers: ['Mike Johnson', 'Emma Davis'],
    commits: 12,
    filesChanged: 18,
    additions: 450,
    deletions: 120,
    linkedStory: 'PROJ-1245',
    daysOpen: 2,
    blockingReason: 'review-comments',
    reviewComments: [
      {
        id: 'rc-001',
        reviewer: 'Mike Johnson',
        comment: 'Add unit tests for OAuth2 configuration',
        file: 'src/auth/oauth2.ts',
        line: 45,
        severity: 'major',
        resolved: false,
      },
      {
        id: 'rc-002',
        reviewer: 'Emma Davis',
        comment: 'Update documentation with OAuth2 setup instructions',
        file: 'docs/auth.md',
        line: 10,
        severity: 'minor',
        resolved: true,
      },
    ],
    aiReviewIssues: [
      {
        id: 'ai-001',
        type: 'code-quality',
        severity: 'major',
        message: 'Potential security vulnerability in OAuth2 configuration',
        file: 'src/auth/oauth2.ts',
        line: 45,
        suggestion: 'Implement additional security checks',
        addressed: false,
      },
    ],
    pipelineStatus: 'running',
    pipelineUrl: 'https://ci.example.com/pipelines/342',
  },
  {
    id: 'pr-002',
    number: 343,
    title: 'feat: Payment gateway integration with Stripe',
    author: 'Mike Johnson',
    status: 'approved',
    createdAt: '2026-03-03T14:20:00Z',
    updatedAt: '2026-03-07T09:00:00Z',
    reviewers: ['Sarah Chen', 'Alex Kumar'],
    commits: 8,
    filesChanged: 12,
    additions: 380,
    deletions: 45,
    linkedStory: 'PROJ-1246',
    daysOpen: 4,
  },
  {
    id: 'pr-003',
    number: 344,
    title: 'fix: Mobile login crash on iOS',
    author: 'Alex Kumar',
    status: 'open',
    createdAt: '2026-03-06T16:45:00Z',
    updatedAt: '2026-03-06T16:45:00Z',
    reviewers: ['Sarah Chen'],
    commits: 3,
    filesChanged: 4,
    additions: 85,
    deletions: 32,
    linkedStory: 'PROJ-1248',
    daysOpen: 1,
  },
  {
    id: 'pr-004',
    number: 341,
    title: 'fix: Database connection pool management',
    author: 'Mike Johnson',
    status: 'merged',
    createdAt: '2026-03-02T11:00:00Z',
    updatedAt: '2026-03-04T15:30:00Z',
    mergedAt: '2026-03-04T15:30:00Z',
    reviewers: ['Emma Davis'],
    commits: 5,
    filesChanged: 6,
    additions: 120,
    deletions: 80,
    linkedStory: 'PROJ-1250',
    daysOpen: 0,
  },
  {
    id: 'pr-005',
    number: 345,
    title: 'feat: CSV/Excel export functionality',
    author: 'Alex Kumar',
    status: 'under-review',
    createdAt: '2026-03-04T09:15:00Z',
    updatedAt: '2026-03-07T07:30:00Z',
    reviewers: ['Mike Johnson', 'Sarah Chen'],
    commits: 7,
    filesChanged: 10,
    additions: 280,
    deletions: 15,
    linkedStory: 'PROJ-1252',
    daysOpen: 3,
    blockingReason: 'pipeline-failure',
    pipelineStatus: 'failed',
    pipelineFailureReason: 'Unit tests failed: 3 tests in src/export/csv-generator.test.ts',
    pipelineUrl: 'https://ci.example.com/pipelines/345',
  },
  {
    id: 'pr-006',
    number: 346,
    title: 'feat: Real-time notifications with WebSocket',
    author: 'Sarah Chen',
    status: 'open',
    createdAt: '2026-03-05T11:00:00Z',
    updatedAt: '2026-03-07T10:00:00Z',
    reviewers: ['Mike Johnson', 'Alex Kumar'],
    commits: 15,
    filesChanged: 22,
    additions: 620,
    deletions: 180,
    linkedStory: 'PROJ-1249',
    daysOpen: 2,
    blockingReason: 'ai-review',
    aiReviewIssues: [
      {
        id: 'ai-002',
        type: 'security',
        severity: 'critical',
        message: 'WebSocket connection not properly authenticated',
        file: 'src/notifications/websocket-client.ts',
        line: 78,
        suggestion: 'Add JWT token authentication to WebSocket handshake',
        addressed: false,
      },
      {
        id: 'ai-003',
        type: 'performance',
        severity: 'major',
        message: 'Memory leak detected in event listener cleanup',
        file: 'src/notifications/event-manager.ts',
        line: 142,
        suggestion: 'Implement proper cleanup in useEffect return function',
        addressed: false,
      },
      {
        id: 'ai-004',
        type: 'best-practice',
        severity: 'minor',
        message: 'Missing error boundary for notification components',
        file: 'src/notifications/NotificationCenter.tsx',
        line: 25,
        suggestion: 'Wrap component with ErrorBoundary to handle failures gracefully',
        addressed: true,
      },
    ],
    pipelineStatus: 'pending',
    pipelineUrl: 'https://ci.example.com/pipelines/346',
  },
  {
    id: 'pr-007',
    number: 347,
    title: 'fix: Performance optimization for dashboard queries',
    author: 'Emma Davis',
    status: 'under-review',
    createdAt: '2026-03-06T14:30:00Z',
    updatedAt: '2026-03-07T11:00:00Z',
    reviewers: ['Sarah Chen', 'Mike Johnson'],
    commits: 6,
    filesChanged: 8,
    additions: 150,
    deletions: 95,
    linkedStory: 'PROJ-1247',
    daysOpen: 1,
    blockingReason: 'review-comments',
    reviewComments: [
      {
        id: 'rc-003',
        reviewer: 'Sarah Chen',
        comment: 'Add performance benchmarks to verify the optimization',
        file: 'src/dashboard/queries.ts',
        line: 67,
        severity: 'critical',
        resolved: false,
      },
      {
        id: 'rc-004',
        reviewer: 'Sarah Chen',
        comment: 'Consider adding database indexes for these queries',
        file: 'src/dashboard/queries.ts',
        line: 89,
        severity: 'major',
        resolved: false,
      },
      {
        id: 'rc-005',
        reviewer: 'Mike Johnson',
        comment: 'Update the migration scripts',
        file: 'migrations/001_optimize_queries.sql',
        line: 12,
        severity: 'major',
        resolved: false,
      },
    ],
    pipelineStatus: 'success',
    pipelineUrl: 'https://ci.example.com/pipelines/347',
  },
];

export const mockCommits: Commit[] = [
  {
    sha: 'a3f2b91',
    message: 'Add OAuth2 configuration',
    author: 'Sarah Chen',
    date: '2026-03-07T08:30:00Z',
    branch: 'feature/oauth2',
    linkedStory: 'PROJ-1245',
  },
  {
    sha: 'b7e1c45',
    message: 'Implement Stripe payment hooks',
    author: 'Mike Johnson',
    date: '2026-03-07T07:45:00Z',
    branch: 'feature/payment',
    linkedStory: 'PROJ-1246',
  },
  {
    sha: 'c9d4a22',
    message: 'Fix mobile viewport issue',
    author: 'Alex Kumar',
    date: '2026-03-06T16:50:00Z',
    branch: 'fix/mobile-crash',
    linkedStory: 'PROJ-1248',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: DEPLOYMENT DATA
// One record per deployment event, covering all four environments.
// ─────────────────────────────────────────────────────────────────────────────

export const mockDeployments: Deployment[] = [
  {
    // Sprint 1 release — all PROJ-1000 auth stories are done and shipped to prod
    id: 'dep-001',
    version: 'v1.1.0',
    environment: 'prod',
    status: 'success',
    deployedAt: '2026-02-28T10:00:00Z',
    deployedBy: 'CI/CD Pipeline',
    duration: 8,
    features: ['PROJ-1245', 'PROJ-123'],
    defectsFixes: ['PROJ-1248'],
  },
  {
    // Sprint 2 partial UAT — only done items (PROJ-1250 DB fix) promoted to UAT;
    // PROJ-1246 (Stripe) is still in-review in QA, not yet UAT-ready
    id: 'dep-002',
    version: 'v1.1.1-uat',
    environment: 'uat',
    status: 'success',
    deployedAt: '2026-03-06T08:30:00Z',
    deployedBy: 'Mike Johnson',
    duration: 5,
    features: [],
    defectsFixes: ['PROJ-1250'],
  },
  {
    // Sprint 2 QA build — PROJ-1246 (Stripe) is in-review = under QA testing
    id: 'dep-003',
    version: 'v1.1.1-rc',
    environment: 'qa',
    status: 'success',
    deployedAt: '2026-03-07T09:00:00Z',
    deployedBy: 'Sarah Chen',
    duration: 5,
    features: ['PROJ-1246'],
    defectsFixes: ['PROJ-1250'],
  },
  {
    // Sprint 2 latest dev snapshot — includes PROJ-124 (API timeout) fix in-progress;
    // build is in-progress because PROJ-124 is not yet resolved
    id: 'dep-004',
    version: 'v1.1.2-snapshot',
    environment: 'dev',
    status: 'in-progress',
    deployedAt: '2026-03-08T08:00:00Z',
    deployedBy: 'CI/CD Pipeline',
    duration: 3,
    features: ['PROJ-1246'],
    defectsFixes: ['PROJ-1250', 'PROJ-124'],
  },
  {
    // Pre-Sprint 1 baseline prod release
    id: 'dep-005',
    version: 'v1.0.0',
    environment: 'prod',
    status: 'success',
    deployedAt: '2026-01-30T14:00:00Z',
    deployedBy: 'CI/CD Pipeline',
    duration: 9,
    features: [],
    defectsFixes: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: INSIGHT DATA
// AI-detected bottlenecks and prioritised recommendations.
// ─────────────────────────────────────────────────────────────────────────────

export const mockBottlenecks: Bottleneck[] = [
  {
    id: 'bn-001',
    stage: 'planning',
    title: 'Unrefined Stories in Backlog',
    description: '28% of user stories in backlog are not refined, causing delays in sprint planning',
    severity: 'high',
    impact: 'Sprint planning takes 3x longer, team velocity unpredictable',
    affectedItems: 2,
    avgDelay: 8,
    trend: 'increasing',
  },
  {
    id: 'bn-002',
    stage: 'review',
    title: 'Pull Requests Stuck in Review',
    description: 'PRs waiting an average of 3.5 days for review, slowing down delivery',
    severity: 'high',
    impact: 'Features delayed by 3-4 days, developer context switching',
    affectedItems: 3,
    avgDelay: 3.5,
    trend: 'stable',
  },
  {
    id: 'bn-003',
    stage: 'development',
    title: 'Defects Taking Priority Over Features',
    description: 'Critical defects interrupting planned sprint work',
    severity: 'medium',
    impact: 'Sprint goals at risk, team morale affected',
    affectedItems: 2,
    avgDelay: 2,
    trend: 'increasing',
  },
  {
    id: 'bn-004',
    stage: 'deployment',
    title: 'Manual UAT Deployment Process',
    description: 'UAT deployments require manual intervention, creating bottleneck',
    severity: 'medium',
    impact: 'Delays in stakeholder feedback, testing cycles extended',
    affectedItems: 5,
    avgDelay: 1,
    trend: 'stable',
  },
];

export const mockRecommendations: AIRecommendation[] = [
  {
    id: 'rec-001',
    title: 'Implement Story Refinement Gates',
    description: 'Require all stories to be refined before entering sprint planning, establish refinement sessions 2x per week',
    category: 'planning',
    impact: 'high',
    effort: 'low',
    estimatedImprovement: 'Reduce sprint planning time by 60%, increase sprint predictability',
    actionItems: [
      'Schedule bi-weekly refinement sessions with PO and tech lead',
      'Create "Definition of Ready" checklist in Jira',
      'Block unrefined stories from being pulled into sprint',
      'Track refinement metrics in sprint retrospectives',
    ],
  },
  {
    id: 'rec-002',
    title: 'Establish PR Review SLA',
    description: 'Set 24-hour review SLA with automated reminders and rotation schedule',
    category: 'review',
    impact: 'high',
    effort: 'low',
    estimatedImprovement: 'Reduce PR review time from 3.5 days to <1 day',
    actionItems: [
      'Configure GitHub Actions to send Slack reminders after 12 hours',
      'Implement round-robin reviewer assignment',
      'Block PRs with >500 lines, encourage smaller commits',
      'Add "review time" metric to team dashboard',
      'Dedicate first 30 min of day to PR reviews',
    ],
  },
  {
    id: 'rec-003',
    title: 'Create Dedicated Defect Sprint',
    description: 'Reserve 20% sprint capacity for defects, create separate defect resolution sprint every 3 sprints',
    category: 'development',
    impact: 'medium',
    effort: 'low',
    estimatedImprovement: 'Protect 80% of sprint commitments, reduce technical debt',
    actionItems: [
      'Reserve 20% capacity in each sprint for unplanned work',
      'Prioritize critical defects immediately, defer low priority',
      'Run dedicated "bug bash" sprint quarterly',
      'Track defect escape rate from QA to production',
    ],
  },
  {
    id: 'rec-004',
    title: 'Automate UAT Deployment Pipeline',
    description: 'Enable one-click deployments to UAT with automated smoke tests',
    category: 'deployment',
    impact: 'medium',
    effort: 'medium',
    estimatedImprovement: 'Reduce deployment time from 45 min to 5 min',
    actionItems: [
      'Create GitHub Actions workflow for UAT deployment',
      'Implement automated smoke tests post-deployment',
      'Set up Slack notifications for deployment status',
      'Document rollback procedures',
      'Enable feature flags for safer releases',
    ],
  },
  {
    id: 'rec-005',
    title: 'Implement WIP Limits',
    description: 'Limit work-in-progress to 2 items per developer to improve flow and reduce context switching',
    category: 'process',
    impact: 'high',
    effort: 'low',
    estimatedImprovement: 'Increase completion rate by 40%, reduce cycle time',
    actionItems: [
      'Set WIP limit of 2 items per developer in Jira board',
      'Encourage "finish before starting" mindset',
      'Daily standup focus on blockers for in-progress work',
      'Track cycle time and throughput metrics',
      'Celebrate completed work over started work',
    ],
  },
  {
    id: 'rec-006',
    title: 'Add Automated PR Size Checker',
    description: 'Reject PRs with >500 lines of code, encourage smaller, reviewable chunks',
    category: 'development',
    impact: 'medium',
    effort: 'low',
    estimatedImprovement: 'Reduce review time by 50%, improve code quality',
    actionItems: [
      'Configure GitHub Action to flag large PRs',
      'Add PR template with checklist',
      'Encourage feature flags for incremental releases',
      'Train team on vertical slicing techniques',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: HISTORICAL METRICS
// Pre-aggregated time-series data used by charts in Dashboard and Bottlenecks.
// In a real system these would come from a metrics API, not be hardcoded.
// ─────────────────────────────────────────────────────────────────────────────

/** Sprint-over-sprint velocity: planned vs actually completed story points. */
export const velocityTrend = [
  { sprint: 'Sprint 1', planned: 34, completed: 28, velocity: 28 },
  { sprint: 'Sprint 2', planned: 32, completed: 32, velocity: 32 },
  { sprint: 'Sprint 3', planned: 36, completed: 30, velocity: 30 },
  { sprint: 'Sprint 4', planned: 34, completed: 25, velocity: 25 },
  { sprint: 'Sprint 5', planned: 35, completed: 31, velocity: 31 },
  { sprint: 'Sprint 6', planned: 38, completed: 29, velocity: 29 },
];

/** Average days a story spends in each workflow stage — highlights where work stalls. */
export const cycleTimeData = [
  { stage: 'Backlog', avgDays: 8 },
  { stage: 'Refined', avgDays: 2 },
  { stage: 'In Progress', avgDays: 4 },
  { stage: 'In Review', avgDays: 3.5 },
  { stage: 'Done', avgDays: 0 },
];

/** Weekly defect counts — used to detect whether quality is improving or degrading. */
export const defectTrend = [
  { date: '2026-02-01', newDefects: 5, resolvedDefects: 3, openDefects: 8 },
  { date: '2026-02-08', newDefects: 3, resolvedDefects: 4, openDefects: 7 },
  { date: '2026-02-15', newDefects: 6, resolvedDefects: 2, openDefects: 11 },
  { date: '2026-02-22', newDefects: 4, resolvedDefects: 5, openDefects: 10 },
  { date: '2026-03-01', newDefects: 7, resolvedDefects: 3, openDefects: 14 },
  { date: '2026-03-07', newDefects: 2, resolvedDefects: 6, openDefects: 10 },
];

/** Weekly average PR review turnaround in hours — a leading indicator of delivery speed. */
export const prReviewTime = [
  { week: 'Week 1', avgHours: 48 },
  { week: 'Week 2', avgHours: 72 },
  { week: 'Week 3', avgHours: 84 },
  { week: 'Week 4', avgHours: 60 },
  { week: 'Week 5', avgHours: 90 },
  { week: 'Week 6', avgHours: 78 },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: GUARDRAIL TYPES & DATA
// Quality and security scan results that feed the Guardrails page.
// Covers: ESLint, SonarQube, Fortify SAST, unit tests, and dependency/secrets scans.
// ─────────────────────────────────────────────────────────────────────────────

/** A single lint violation found by ESLint during a CI run. */
export interface ESLintIssue {
  id: string;
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  fixable: boolean;
}

/** Aggregated ESLint report for the entire codebase — mirrors the JSON output of `eslint --format json`. */
export interface ESLintReport {
  totalFiles: number;
  filesWithIssues: number;
  totalIssues: number;
  errors: number;        // hard violations that fail the CI check
  warnings: number;      // softer rules — don't fail CI but should be addressed
  fixableIssues: number; // can be auto-fixed by running `eslint --fix`
  lastScan: string;
  issues: ESLintIssue[];
}

/** A single SonarQube metric dimension (reliability, security, coverage, etc.). */
export interface SonarQubeMetric {
  metric: string;
  value: string | number;           // numeric for coverage/LoC; letter grade for ratings
  rating?: 'A' | 'B' | 'C' | 'D' | 'E'; // SQALE rating: A = best, E = worst
  status: 'passed' | 'failed' | 'warning';
}

/** Full SonarQube analysis report for a project, including the overall quality gate result. */
export interface SonarQubeAnalysis {
  projectKey: string;
  projectName: string;
  lastAnalysis: string;
  qualityGateStatus: 'passed' | 'failed' | 'warning'; // the single gate result blocking deployment
  metrics: SonarQubeMetric[];
  bugs: number;           // reliability issues that will likely cause incorrect behaviour
  vulnerabilities: number; // security flaws that could be exploited
  codeSmells: number;      // maintainability issues accumulating technical debt
  coverage: number;        // percentage of code exercised by tests
  duplications: number;    // percentage of duplicated code blocks
  technicalDebt: string;   // estimated time to fix all code smells (e.g. '8d 4h')
}

/** A single SAST finding from Fortify Static Code Analyzer. */
export interface FortifyIssue {
  id: string;
  category: string;   // e.g. 'SQL Injection', 'XSS', 'Hardcoded Password'
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  description: string;
  recommendation: string;
  cwe?: string;        // Common Weakness Enumeration identifier (e.g. 'CWE-89')
}

/** Aggregated results of a Fortify SAST scan for a specific application version. */
export interface FortifyScan {
  scanId: string;
  scanDate: string;
  applicationName: string;
  version: string;
  totalIssues: number;
  critical: number;  // must be fixed before any production deployment
  high: number;
  medium: number;
  low: number;
  status: 'passed' | 'failed' | 'review-required';
  issues: FortifyIssue[];
}

/** Results for a single test suite (a logical grouping of related test files). */
export interface TestSuite {
  name: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;  // total time taken in seconds
  coverage: number;  // line coverage percentage for this suite
}

/**
 * A complete unit test run result, aggregating all test suites.
 * 'unstable' means the run completed but some tests failed — common in CI
 * when flaky tests cause intermittent red builds.
 */
export interface UnitTestExecution {
  runId: string;
  timestamp: string;
  status: 'passed' | 'failed' | 'unstable';
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;          // total run time in seconds
  overallCoverage: number;   // weighted average coverage across all suites
  suites: TestSuite[];
  failedTests?: {            // detailed error information for each failed test
    name: string;
    suite: string;
    error: string;
  }[];
}

/** A single finding from a security scan (dependency audit, container scan, secrets detection). */
export interface SecurityScanFinding {
  id: string;
  type: 'vulnerability' | 'misconfiguration' | 'secret' | 'license';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  package?: string;      // npm/pip/maven package name (for dependency scans)
  version?: string;      // the affected version currently in use
  cve?: string;          // CVE identifier if this is a known public vulnerability
  description: string;
  recommendation: string;
  fixAvailable: boolean;
  fixVersion?: string;   // the version that patches this vulnerability
}

/** Aggregated report from a specific type of security scan tool. */
export interface SecurityScanReport {
  scanId: string;
  scanDate: string;
  scanType: 'dependencies' | 'container' | 'infrastructure' | 'secrets';
  status: 'passed' | 'failed' | 'warning';
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;  // informational findings that don't require immediate action
  findings: SecurityScanFinding[];
}

// --- Guardrail data fixtures ---

export const mockESLintReport: ESLintReport = {
  totalFiles: 247,
  filesWithIssues: 23,
  totalIssues: 67,
  errors: 8,
  warnings: 59,
  fixableIssues: 42,
  lastScan: '2026-03-08T10:30:00Z',
  issues: [
    {
      id: 'eslint-001',
      file: 'src/components/UserProfile.tsx',
      line: 45,
      column: 12,
      severity: 'error',
      rule: 'react-hooks/exhaustive-deps',
      message: 'React Hook useEffect has a missing dependency: \'userId\'',
      fixable: false,
    },
    {
      id: 'eslint-002',
      file: 'src/utils/apiClient.ts',
      line: 89,
      column: 5,
      severity: 'warning',
      rule: 'no-console',
      message: 'Unexpected console statement',
      fixable: true,
    },
    {
      id: 'eslint-003',
      file: 'src/pages/Dashboard.tsx',
      line: 120,
      column: 18,
      severity: 'error',
      rule: '@typescript-eslint/no-explicit-any',
      message: 'Unexpected any. Specify a different type',
      fixable: false,
    },
    {
      id: 'eslint-004',
      file: 'src/components/Table.tsx',
      line: 67,
      column: 8,
      severity: 'warning',
      rule: 'prefer-const',
      message: '\'rowData\' is never reassigned. Use \'const\' instead',
      fixable: true,
    },
    {
      id: 'eslint-005',
      file: 'src/hooks/useAuth.ts',
      line: 34,
      column: 3,
      severity: 'error',
      rule: 'no-unused-vars',
      message: '\'refreshToken\' is assigned a value but never used',
      fixable: false,
    },
  ],
};

export const mockSonarQubeAnalysis: SonarQubeAnalysis = {
  projectKey: 'arc-project',
  projectName: 'Arc - AI Project Intelligence',
  lastAnalysis: '2026-03-08T09:15:00Z',
  qualityGateStatus: 'warning',
  bugs: 12,
  vulnerabilities: 3,
  codeSmells: 127,
  coverage: 78.5,
  duplications: 3.2,
  technicalDebt: '8d 4h',
  metrics: [
    {
      metric: 'Reliability',
      value: 'B',
      rating: 'B',
      status: 'warning',
    },
    {
      metric: 'Security',
      value: 'A',
      rating: 'A',
      status: 'passed',
    },
    {
      metric: 'Maintainability',
      value: 'C',
      rating: 'C',
      status: 'warning',
    },
    {
      metric: 'Coverage',
      value: 78.5,
      status: 'warning',
    },
    {
      metric: 'Duplications',
      value: 3.2,
      status: 'passed',
    },
    {
      metric: 'Lines of Code',
      value: 24578,
      status: 'passed',
    },
  ],
};

export const mockFortifyScan: FortifyScan = {
  scanId: 'fortify-20260308',
  scanDate: '2026-03-08T08:00:00Z',
  applicationName: 'Arc Application',
  version: 'v2.4.1',
  totalIssues: 18,
  critical: 2,
  high: 5,
  medium: 7,
  low: 4,
  status: 'review-required',
  issues: [
    {
      id: 'fort-001',
      category: 'SQL Injection',
      severity: 'critical',
      file: 'src/api/queryBuilder.ts',
      line: 156,
      description: 'SQL query constructed from user input without proper sanitization',
      recommendation: 'Use parameterized queries or ORM methods to prevent SQL injection',
      cwe: 'CWE-89',
    },
    {
      id: 'fort-002',
      category: 'Cross-Site Scripting (XSS)',
      severity: 'critical',
      file: 'src/components/MessageDisplay.tsx',
      line: 78,
      description: 'User input rendered without sanitization, potential XSS vulnerability',
      recommendation: 'Sanitize user input before rendering or use framework-provided escaping',
      cwe: 'CWE-79',
    },
    {
      id: 'fort-003',
      category: 'Insecure Cryptographic Storage',
      severity: 'high',
      file: 'src/utils/encryption.ts',
      line: 23,
      description: 'Using deprecated MD5 hashing algorithm for sensitive data',
      recommendation: 'Use SHA-256 or bcrypt for hashing sensitive information',
      cwe: 'CWE-327',
    },
    {
      id: 'fort-004',
      category: 'Hardcoded Password',
      severity: 'high',
      file: 'src/config/database.ts',
      line: 12,
      description: 'Database credentials hardcoded in source code',
      recommendation: 'Use environment variables or secure vault for credentials',
      cwe: 'CWE-798',
    },
    {
      id: 'fort-005',
      category: 'Path Traversal',
      severity: 'high',
      file: 'src/api/fileHandler.ts',
      line: 45,
      description: 'File path constructed from user input without validation',
      recommendation: 'Validate and sanitize file paths, use allowlist of permitted paths',
      cwe: 'CWE-22',
    },
  ],
};

export const mockUnitTestExecution: UnitTestExecution = {
  runId: 'test-run-20260308',
  timestamp: '2026-03-08T11:45:00Z',
  status: 'unstable',
  totalTests: 1247,
  passed: 1231,
  failed: 12,
  skipped: 4,
  duration: 342,
  overallCoverage: 78.5,
  suites: [
    {
      name: 'Authentication Tests',
      totalTests: 87,
      passed: 87,
      failed: 0,
      skipped: 0,
      duration: 23,
      coverage: 92.3,
    },
    {
      name: 'API Integration Tests',
      totalTests: 156,
      passed: 149,
      failed: 7,
      skipped: 0,
      duration: 89,
      coverage: 81.2,
    },
    {
      name: 'Component Tests',
      totalTests: 534,
      passed: 531,
      failed: 3,
      skipped: 0,
      duration: 145,
      coverage: 75.8,
    },
    {
      name: 'Utility Functions Tests',
      totalTests: 298,
      passed: 296,
      failed: 2,
      skipped: 0,
      duration: 45,
      coverage: 88.9,
    },
    {
      name: 'E2E Tests',
      totalTests: 172,
      passed: 168,
      failed: 0,
      skipped: 4,
      duration: 40,
      coverage: 65.4,
    },
  ],
  failedTests: [
    {
      name: 'should handle concurrent API requests',
      suite: 'API Integration Tests',
      error: 'AssertionError: expected 200 to equal 201',
    },
    {
      name: 'should validate user permissions',
      suite: 'API Integration Tests',
      error: 'TypeError: Cannot read property \'role\' of undefined',
    },
    {
      name: 'should render error state correctly',
      suite: 'Component Tests',
      error: 'Expected element to have class "error-message" but found "warning-message"',
    },
  ],
};

export const mockSecurityScans: SecurityScanReport[] = [
  {
    scanId: 'sec-dep-20260308',
    scanDate: '2026-03-08T07:30:00Z',
    scanType: 'dependencies',
    status: 'warning',
    totalFindings: 23,
    critical: 1,
    high: 4,
    medium: 11,
    low: 5,
    info: 2,
    findings: [
      {
        id: 'dep-001',
        type: 'vulnerability',
        severity: 'critical',
        package: 'lodash',
        version: '4.17.19',
        cve: 'CVE-2021-23337',
        description: 'Command Injection vulnerability in lodash',
        recommendation: 'Upgrade to lodash version 4.17.21 or later',
        fixAvailable: true,
        fixVersion: '4.17.21',
      },
      {
        id: 'dep-002',
        type: 'vulnerability',
        severity: 'high',
        package: 'axios',
        version: '0.21.1',
        cve: 'CVE-2021-3749',
        description: 'Regular Expression Denial of Service (ReDoS) in axios',
        recommendation: 'Upgrade to axios version 0.21.2 or later',
        fixAvailable: true,
        fixVersion: '0.21.4',
      },
      {
        id: 'dep-003',
        type: 'vulnerability',
        severity: 'high',
        package: 'moment',
        version: '2.29.1',
        cve: 'CVE-2022-31129',
        description: 'ReDoS vulnerability in moment.js',
        recommendation: 'Consider migrating to date-fns or day.js, or upgrade to moment 2.29.4',
        fixAvailable: true,
        fixVersion: '2.29.4',
      },
      {
        id: 'dep-004',
        type: 'license',
        severity: 'medium',
        package: 'react-native-vector-icons',
        version: '9.0.0',
        description: 'Package uses GPL-3.0 license which may not be compatible with commercial use',
        recommendation: 'Review license compatibility or find alternative package',
        fixAvailable: false,
      },
    ],
  },
  {
    scanId: 'sec-secrets-20260308',
    scanDate: '2026-03-08T07:35:00Z',
    scanType: 'secrets',
    status: 'failed',
    totalFindings: 5,
    critical: 3,
    high: 2,
    medium: 0,
    low: 0,
    info: 0,
    findings: [
      {
        id: 'secret-001',
        type: 'secret',
        severity: 'critical',
        description: 'AWS Access Key found in source code',
        recommendation: 'Remove hardcoded credentials, use AWS Secrets Manager or environment variables',
        fixAvailable: false,
      },
      {
        id: 'secret-002',
        type: 'secret',
        severity: 'critical',
        description: 'Private SSH key committed to repository',
        recommendation: 'Remove private key, rotate credentials, use SSH agent',
        fixAvailable: false,
      },
      {
        id: 'secret-003',
        type: 'secret',
        severity: 'critical',
        description: 'Database connection string with password in config file',
        recommendation: 'Use environment variables or secrets management service',
        fixAvailable: false,
      },
    ],
  },
];