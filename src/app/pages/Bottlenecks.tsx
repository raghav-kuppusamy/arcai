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
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Zap, Clock, ChevronRight, Calendar, GitPullRequest, Rocket, CheckSquare } from 'lucide-react';
import { mockBottlenecks, cycleTimeData } from '../data/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

/**
 * Bottlenecks — phased bottleneck analysis with AI root-cause and recommendations.
 */
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Bottleneck Analysis</h2>
        <p className="text-gray-600 mt-1">AI-detected performance issues across your delivery pipeline</p>
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
                    {phaseBottlenecks.map((bottleneck, index) => (
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

                                {/* AI Root Cause */}
                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
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

                                {/* AI Recommendation */}
                                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-green-900 mb-1 flex items-center gap-2">
                                    💡 AI Recommendation
                                  </p>
                                  <p className="text-xs text-green-800">
                                    {phase.id === 'planning' && 'Implement weekly refinement sessions with "Definition of Ready" checklist. Expected reduction: 5 days → 2 days (60% improvement).'}
                                    {phase.id === 'development' && 'Allocate 20% sprint capacity for defect resolution. Use WIP limits to reduce context switching. Expected: +8 story points/sprint.'}
                                    {phase.id === 'review' && 'Set 24hr review SLA with automated reminders. Break large PRs into &lt;300 lines. Expected: 3.5 days → 1 day (71% improvement).'}
                                    {phase.id === 'deployment' && 'Automate UAT deployments and implement scheduled testing windows. Expected: 4 days → 1.5 days (62% improvement).'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
          <BarChart data={cycleTimeData} layout="horizontal">
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
  );
}