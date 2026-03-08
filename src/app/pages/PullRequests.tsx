/**
 * PullRequests.tsx — GitHub Pull Request Review Status
 *
 * Monitors all open, under-review, approved, and recently merged PRs.
 * The "Code Review Intelligence" AI banner dynamically summarises blocking reasons:
 *   - Review comments:  unresolved comments left by human reviewers
 *   - AI review issues: critical/major findings from the automated AI scan
 *   - Pipeline failure: CI/CD checks failing, blocking merge eligibility
 *
 * Individual PR cards expand to show the specific blocking reason,
 * file-level comments, AI issue suggestions, and a deep-link to the CI run.
 *
 * A review-time trend chart at the top shows whether cycle times are
 * improving or worsening over the past six weeks.
 */
import { GitPullRequest, GitCommit, GitMerge, Clock, User, FileText, AlertCircle, XCircle, CheckCircle, AlertTriangle, Shield, Zap, Code, ExternalLink, Sparkles } from 'lucide-react';
import { mockPullRequests, prReviewTime } from '../data/mockData';
import type { ReviewComment, AIReviewIssue } from '../data/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * PullRequests — full PR lifecycle view with AI blocking analysis.
 */
export function PullRequests() {
  /** Returns Tailwind badge classes for each PR lifecycle status. */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'merged':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'under-review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'open':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /** Returns the icon that visually represents a PR's current lifecycle state. */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'merged':
        return <GitMerge className="size-5 text-purple-600" />;
      case 'approved':
        return <GitPullRequest className="size-5 text-green-600" />;
      case 'under-review':
        return <Clock className="size-5 text-blue-600" />;
      case 'open':
        return <GitPullRequest className="size-5 text-yellow-600" />;
      default:
        return <GitPullRequest className="size-5 text-gray-600" />;
    }
  };

  // ─── Core PR metrics ────────────────────────────────────────────────
  const openPRs = mockPullRequests.filter(pr => pr.status === 'open' || pr.status === 'under-review');
  // Average age across open/under-review PRs is the primary velocity indicator
  const avgReviewTime = openPRs.length > 0
    ? Math.round(openPRs.reduce((sum, pr) => sum + pr.daysOpen, 0) / openPRs.length)
    : 0;
  // Stale threshold is 3 days — beyond this, developer context-switching risk increases sharply
  const stalePRs = openPRs.filter(pr => pr.daysOpen > 3);

  // ─── Blocking analysis ─────────────────────────────────────────────
  // A PR is blocked if it has a blockingReason and hasn't been merged yet
  const blockedPRs = mockPullRequests.filter(pr => pr.blockingReason && pr.status !== 'merged');
  const reviewCommentBlocked = blockedPRs.filter(pr => pr.blockingReason === 'review-comments');
  const aiReviewBlocked     = blockedPRs.filter(pr => pr.blockingReason === 'ai-review');
  const pipelineBlocked     = blockedPRs.filter(pr => pr.blockingReason === 'pipeline-failure');

  // Count unresolved issues across all blocked PRs for the AI banner summary
  const totalReviewComments = blockedPRs.reduce((sum, pr) => {
    return sum + (pr.reviewComments?.filter(c => !c.resolved).length || 0);
  }, 0);

  const totalAIIssues = blockedPRs.reduce((sum, pr) => {
    return sum + (pr.aiReviewIssues?.filter(i => !i.addressed).length || 0);
  }, 0);

  // Critical AI issues need to surface prominently — they often indicate security risks
  const criticalAIIssues = blockedPRs.reduce((sum, pr) => {
    return sum + (pr.aiReviewIssues?.filter(i => !i.addressed && i.severity === 'critical').length || 0);
  }, 0);

  // ─── PR size and pipeline metrics ───────────────────────────────────────
  // >15 files changed is the threshold for a "large" PR that slows reviewers down
  const largePRs = mockPullRequests.filter(pr => pr.filesChanged > 15 && pr.status !== 'merged');

  const prsWithPipeline = mockPullRequests.filter(pr => pr.pipelineStatus);
  const pipelineSuccessRate = prsWithPipeline.length > 0
    ? Math.round((prsWithPipeline.filter(pr => pr.pipelineStatus === 'success').length / prsWithPipeline.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">GitHub Pull Requests</h2>
        <p className="text-gray-600 mt-1">Monitor PR status, review times, and merge activity</p>
      </div>

      {/* AI Insights for PRs */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Sparkles className="size-5" />
              Code Review Intelligence
            </h3>
            <div className="space-y-2 text-sm opacity-95">
              {/* Blocking Summary */}
              {blockedPRs.length > 0 ? (
                <p>
                  <strong>⚠️ Blocking Issues:</strong> {blockedPRs.length} PR{blockedPRs.length > 1 ? 's are' : ' is'} currently blocked from merging
                  {reviewCommentBlocked.length > 0 && ` - ${reviewCommentBlocked.length} by review comments (${totalReviewComments} total comments)`}
                  {aiReviewBlocked.length > 0 && ` - ${aiReviewBlocked.length} by AI review (${criticalAIIssues} critical ${criticalAIIssues === 1 ? 'issue' : 'issues'})`}
                  {pipelineBlocked.length > 0 && ` - ${pipelineBlocked.length} by pipeline failures`}.
                </p>
              ) : (
                <p>
                  <strong>✅ No Blocking Issues:</strong> All open PRs are progressing smoothly with no critical blockers detected.
                </p>
              )}

              {/* Large PR Alert */}
              {largePRs.length > 0 && (
                <p>
                  <strong>📏 PR Size Alert:</strong> {largePRs.length} large PR{largePRs.length > 1 ? 's' : ''} detected ({largePRs.map(pr => `#${pr.number}`).join(', ')}).
                  Large PRs take 2.3x longer to review. Consider breaking into smaller, focused PRs for faster turnaround.
                </p>
              )}

              {/* Pipeline Health */}
              {prsWithPipeline.length > 0 && (
                <p>
                  <strong>🔧 Pipeline Health:</strong> {pipelineSuccessRate}% success rate across {prsWithPipeline.length} PR{prsWithPipeline.length > 1 ? 's' : ''} with CI/CD checks.
                  {pipelineSuccessRate < 70 && ' Pipeline reliability needs attention - investigate common failure patterns.'}
                  {pipelineSuccessRate >= 70 && pipelineSuccessRate < 90 && ' Room for improvement in test stability.'}
                  {pipelineSuccessRate >= 90 && ' Excellent pipeline stability!'}
                </p>
              )}

              {/* Review Time Insight */}
              <p>
                <strong>⏱️ Review Performance:</strong> {openPRs.length} PR{openPRs.length > 1 ? 's' : ''} currently open, averaging {avgReviewTime} day{avgReviewTime > 1 ? 's' : ''} in review.
                {avgReviewTime > 3 && ' This exceeds the recommended 24-48 hour SLA. Consider implementing reviewer rotation or load balancing.'}
                {avgReviewTime <= 3 && avgReviewTime > 1 && ' Approaching target review time - maintain momentum!'}
                {avgReviewTime <= 1 && ' Outstanding review velocity!'}
              </p>

              {/* AI-Specific Insights */}
              {criticalAIIssues > 0 && (
                <p>
                  <strong>🛡️ Security Alert:</strong> AI detected {criticalAIIssues} critical security/quality {criticalAIIssues === 1 ? 'issue' : 'issues'} requiring immediate attention.
                  Address these before merge to prevent production incidents.
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {blockedPRs.length > 0 && (
                <div className="bg-white/20 px-3 py-1.5 rounded text-xs font-medium">
                  {blockedPRs.length} Blocked PR{blockedPRs.length > 1 ? 's' : ''}
                </div>
              )}
              {criticalAIIssues > 0 && (
                <div className="bg-red-500/80 px-3 py-1.5 rounded text-xs font-medium">
                  {criticalAIIssues} Critical Issue{criticalAIIssues > 1 ? 's' : ''}
                </div>
              )}
              {largePRs.length > 0 && (
                <div className="bg-orange-500/80 px-3 py-1.5 rounded text-xs font-medium">
                  {largePRs.length} Large PR{largePRs.length > 1 ? 's' : ''}
                </div>
              )}
              {pipelineSuccessRate < 90 && prsWithPipeline.length > 0 && (
                <div className="bg-yellow-500/80 px-3 py-1.5 rounded text-xs font-medium">
                  {pipelineSuccessRate}% Pipeline Success
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {stalePRs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="size-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-900">Stale Pull Requests</p>
            <p className="text-sm text-orange-800">
              {stalePRs.length} PR{stalePRs.length > 1 ? 's' : ''} waiting more than 3 days for review. 
              Consider establishing a review SLA to improve flow.
            </p>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Total PRs</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{mockPullRequests.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Open / In Review</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{openPRs.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Avg Review Time</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{avgReviewTime}d</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600">Merged</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">
            {mockPullRequests.filter(pr => pr.status === 'merged').length}
          </p>
        </div>
      </div>

      {/* Review Time Trend */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Average PR Review Time Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={prReviewTime}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `${value} hours`} />
            <Legend />
            <Line key="line-avg-hours" type="monotone" dataKey="avgHours" stroke="#3b82f6" strokeWidth={2} name="Avg Review Time" />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-800">
            ⚠ Review times are 2-3x above target. Consider implementing review SLA and rotation.
          </p>
        </div>
      </div>

      {/* Pull Requests List */}
      <div className="space-y-4">
        {mockPullRequests.map(pr => (
          <div key={pr.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* PR Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(pr.status)}
                    <h3 className="font-semibold text-gray-900">#{pr.number}: {pr.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(pr.status)}`}>
                      {pr.status.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="size-4" />
                      <span>{pr.author}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="size-4" />
                      <span>Opened {new Date(pr.createdAt).toLocaleDateString()}</span>
                    </div>
                    {pr.linkedStory && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <FileText className="size-4" />
                        <span>{pr.linkedStory}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right ml-4">
                  {pr.status !== 'merged' && (
                    <>
                      <p className="text-sm text-gray-600">Days Open</p>
                      <p className={`text-2xl font-semibold ${pr.daysOpen > 3 ? 'text-red-600' : 'text-gray-900'}`}>
                        {pr.daysOpen}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* PR Details */}
            <div className="p-6 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <GitCommit className="size-4" />
                    <span>Commits</span>
                  </div>
                  <p className="font-semibold text-gray-900">{pr.commits}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                    <FileText className="size-4" />
                    <span>Files Changed</span>
                  </div>
                  <p className="font-semibold text-gray-900">{pr.filesChanged}</p>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">Changes</div>
                  <p className="font-semibold">
                    <span className="text-green-600">+{pr.additions}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="text-red-600">-{pr.deletions}</span>
                  </p>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-1">Reviewers</div>
                  <div className="flex flex-wrap gap-1">
                    {pr.reviewers.map((reviewer, idx) => (
                      <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {reviewer.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* PR Size Warning */}
              {pr.filesChanged > 15 && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded p-3">
                  <p className="text-sm text-orange-800">
                    ⚠ Large PR ({pr.filesChanged} files). Consider breaking into smaller PRs for faster review.
                  </p>
                </div>
              )}

              {/* Stale PR Warning */}
              {pr.daysOpen > 3 && pr.status !== 'merged' && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">
                    🚨 Stale PR! Open for {pr.daysOpen} days. Reach out to reviewers: {pr.reviewers.join(', ')}
                  </p>
                </div>
              )}

              {/* Merged Info */}
              {pr.mergedAt && (
                <div className="mt-4 bg-purple-50 border border-purple-200 rounded p-3">
                  <p className="text-sm text-purple-800">
                    ✓ Merged on {new Date(pr.mergedAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Approved Info */}
              {pr.status === 'approved' && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800">
                    ✓ Approved and ready to merge
                  </p>
                </div>
              )}

              {/* Blocking Reasons */}
              {pr.blockingReason && (
                <div className="mt-4 space-y-3">
                  {/* Review Comments Blocking */}
                  {pr.blockingReason === 'review-comments' && pr.reviewComments && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <XCircle className="size-6 text-red-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900">⛔ Blocked by Review Comments</h4>
                          <p className="text-sm text-red-800 mt-1">
                            {pr.reviewComments.filter(c => !c.resolved).length} unresolved review comment{pr.reviewComments.filter(c => !c.resolved).length > 1 ? 's' : ''} blocking merge
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {pr.reviewComments.filter(c => !c.resolved).map((comment) => (
                          <div key={comment.id} className="bg-white border border-red-200 rounded p-3">
                            <div className="flex items-start gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                comment.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                comment.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {comment.severity}
                              </span>
                              <span className="text-sm font-medium text-gray-900">{comment.reviewer}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{comment.comment}</p>
                            <p className="text-xs text-gray-500">
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded">{comment.file}:{comment.line}</code>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Review Issues Blocking */}
                  {pr.blockingReason === 'ai-review' && pr.aiReviewIssues && (
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Shield className="size-6 text-orange-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-orange-900">🤖 Blocked by AI Review Issues</h4>
                          <p className="text-sm text-orange-800 mt-1">
                            {pr.aiReviewIssues.filter(i => !i.addressed).length} AI-detected issue{pr.aiReviewIssues.filter(i => !i.addressed).length > 1 ? 's' : ''} must be addressed before merge
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {pr.aiReviewIssues.filter(i => !i.addressed).map((issue) => (
                          <div key={issue.id} className="bg-white border border-orange-200 rounded p-3">
                            <div className="flex items-start gap-2 mb-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                issue.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {issue.severity}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                issue.type === 'security' ? 'bg-red-100 text-red-800' :
                                issue.type === 'performance' ? 'bg-blue-100 text-blue-800' :
                                issue.type === 'code-quality' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {issue.type}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-1">{issue.message}</p>
                            <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                              <p className="text-xs text-blue-900">
                                <strong>💡 Suggestion:</strong> {issue.suggestion}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500">
                              <code className="bg-gray-100 px-1.5 py-0.5 rounded">{issue.file}:{issue.line}</code>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pipeline Failure Blocking */}
                  {pr.blockingReason === 'pipeline-failure' && pr.pipelineStatus === 'failed' && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Zap className="size-6 text-red-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-900">🚨 Blocked by Pipeline Failure</h4>
                          <p className="text-sm text-red-800 mt-1">
                            CI/CD pipeline must pass before this PR can be merged
                          </p>
                        </div>
                      </div>
                      <div className="bg-white border border-red-200 rounded p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <XCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-red-900 mb-1">Pipeline Status: Failed</p>
                            {pr.pipelineFailureReason && (
                              <p className="text-sm text-gray-700 mb-3">
                                <strong>Failure Reason:</strong> {pr.pipelineFailureReason}
                              </p>
                            )}
                            {pr.pipelineUrl && (
                              <a
                                href={pr.pipelineUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                <ExternalLink className="size-4" />
                                View Pipeline Details
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="bg-red-50 rounded p-3">
                          <p className="text-xs text-red-800">
                            <strong>Action Required:</strong> Fix the failing tests and push new commits to trigger a new pipeline run.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pipeline Status (when not blocking) */}
              {pr.pipelineStatus && !pr.blockingReason && (
                <div className="mt-4">
                  {pr.pipelineStatus === 'success' && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 flex items-center gap-2">
                      <CheckCircle className="size-5 text-green-600" />
                      <span className="text-sm text-green-800 font-medium">Pipeline: All checks passed</span>
                      {pr.pipelineUrl && (
                        <a
                          href={pr.pipelineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-sm text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="size-3" />
                          View
                        </a>
                      )}
                    </div>
                  )}
                  {pr.pipelineStatus === 'running' && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 flex items-center gap-2">
                      <Clock className="size-5 text-blue-600" />
                      <span className="text-sm text-blue-800 font-medium">Pipeline: Running checks...</span>
                      {pr.pipelineUrl && (
                        <a
                          href={pr.pipelineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="size-3" />
                          View
                        </a>
                      )}
                    </div>
                  )}
                  {pr.pipelineStatus === 'pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-center gap-2">
                      <AlertTriangle className="size-5 text-yellow-600" />
                      <span className="text-sm text-yellow-800 font-medium">Pipeline: Pending</span>
                      {pr.pipelineUrl && (
                        <a
                          href={pr.pipelineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-sm text-yellow-600 hover:text-yellow-700 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="size-3" />
                          View
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}