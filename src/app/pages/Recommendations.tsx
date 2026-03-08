/**
 * Recommendations.tsx — AI-Generated Improvement Recommendations
 *
 * Presents a prioritised list of actionable improvements the AI engine
 * has identified by analysing patterns across planning, development,
 * code review, deployment, and process data.
 *
 * Recommendations are sorted by impact (high first) then effort (low first),
 * so the highest-value, easiest-to-implement items always appear at the top.
 * Items with high impact AND low effort are flagged as "Quick Wins".
 *
 * Each card shows: category, impact level, effort estimate, expected ROI,
 * and a concrete action description teams can act on immediately.
 */
import { Lightbulb, TrendingUp, Target, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { mockRecommendations } from '../data/mockData';

/**
 * Recommendations — prioritised AI improvement suggestions with effort/impact matrix.
 */
export function Recommendations() {
  /** Returns Tailwind badge classes for a recommendation's impact level. */
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Returns Tailwind classes for an effort badge.
   * Intentionally inverted compared to impact: low effort = green (easy),
   * high effort = red (expensive), helping teams spot quick wins fast.
   */
  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /** Returns Tailwind classes for a recommendation category badge. */
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'planning':
        return 'bg-blue-100 text-blue-800';
      case 'development':
        return 'bg-green-100 text-green-800';
      case 'review':
        return 'bg-purple-100 text-purple-800';
      case 'deployment':
        return 'bg-orange-100 text-orange-800';
      case 'process':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Primary sort: impact descending (high → medium → low)
  // Secondary sort: effort ascending (low → medium → high)
  // This surfaces high-impact/low-effort "quick wins" naturally at the top.
  const sortedRecommendations = [...mockRecommendations].sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    const effortOrder = { low: 0, medium: 1, high: 2 };

    const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
    if (impactDiff !== 0) return impactDiff;

    return effortOrder[a.effort] - effortOrder[b.effort];
  });

  // Quick wins = items teams can tackle immediately for disproportionate return
  const quickWins = mockRecommendations.filter(r => r.effort === 'low' && r.impact === 'high');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">AI-Powered Recommendations</h2>
        <p className="text-gray-600 mt-1">Intelligent suggestions to optimize your delivery pipeline</p>
      </div>

      {/* Summary Card */}
      <div className="bg-[#163A5F] rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <Sparkles className="size-10 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-xl mb-2">Optimization Potential Detected</h3>
            <p className="opacity-90 mb-4">
              Our AI has analyzed your Jira stories, GitHub PRs, and deployment data. 
              We've identified <span className="font-semibold">{mockRecommendations.length} actionable recommendations</span> that could 
              reduce your average delivery time from <span className="font-semibold">17.5 days to under 10 days</span>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm opacity-90">High Impact</p>
                <p className="text-2xl font-semibold">{mockRecommendations.filter(r => r.impact === 'high').length}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm opacity-90">Quick Wins</p>
                <p className="text-2xl font-semibold">{quickWins.length}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm opacity-90">Categories</p>
                <p className="text-2xl font-semibold">{new Set(mockRecommendations.map(r => r.category)).size}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Wins Section */}
      {quickWins.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="size-6 text-green-700" />
            <h3 className="font-semibold text-green-900">Quick Wins - Start Here!</h3>
          </div>
          <p className="text-green-800 mb-4">
            These recommendations offer high impact with minimal effort. Perfect for immediate results:
          </p>
          <div className="space-y-2">
            {quickWins.map(rec => (
              <div key={rec.id} className="flex items-center gap-2 text-green-900 bg-white px-4 py-3 rounded border border-green-200 hover:shadow-md transition-shadow">
                <CheckCircle2 className="size-5 text-green-600 flex-shrink-0" />
                <span className="font-medium flex-1">{rec.title}</span>
                <ArrowRight className="size-4 flex-shrink-0 text-green-600" />
                <span className="text-sm whitespace-nowrap font-medium text-green-700">{rec.estimatedImprovement.split(',')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations List */}
      <div className="space-y-4">
        {sortedRecommendations.map((recommendation, index) => (
          <div key={recommendation.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            {/* Recommendation Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="size-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">{recommendation.title}</h3>
                    <p className="text-gray-700">{recommendation.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getImpactColor(recommendation.impact)}`}>
                  {recommendation.impact.toUpperCase()} IMPACT
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEffortColor(recommendation.effort)}`}>
                  {recommendation.effort.toUpperCase()} EFFORT
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getCategoryColor(recommendation.category)}`}>
                  {recommendation.category}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                  <TrendingUp className="size-3" />
                  {recommendation.estimatedImprovement.split(',')[0]}
                </span>
              </div>
            </div>

            {/* Recommendation Details */}
            <div className="p-6 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Target className="size-4 text-blue-600" />
                Action Items
              </h4>
              <ul className="space-y-2">
                {recommendation.actionItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="size-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium text-xs flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Expected Improvement */}
            <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
              <div className="flex items-center gap-2 text-blue-900">
                <Lightbulb className="size-5 text-blue-600" />
                <span className="font-medium text-sm">Expected Improvement:</span>
                <span className="text-sm">{recommendation.estimatedImprovement}</span>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-white border-t border-gray-200">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                <span>Implement This Recommendation</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Implementation Roadmap */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="size-5 text-blue-600" />
          Suggested 90-Day Implementation Roadmap
        </h3>
        
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-green-900">Phase 1: Quick Wins (Weeks 1-2)</h4>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">HIGH PRIORITY</span>
            </div>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✓ Establish PR review SLA with automated reminders</li>
              <li>✓ Implement story refinement gates and Definition of Ready</li>
              <li>✓ Reserve 20% sprint capacity for defects</li>
              <li>✓ Add automated PR size checker</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-sm font-medium text-green-900">
                Expected Impact: Reduce lead time by 30-40%
              </p>
            </div>
          </div>

          <div className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded-r">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-900">Phase 2: Process Optimization (Weeks 3-6)</h4>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">MEDIUM PRIORITY</span>
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Implement WIP limits (2 items per developer)</li>
              <li>✓ Set up bi-weekly refinement sessions</li>
              <li>✓ Track and visualize cycle time metrics</li>
              <li>✓ Establish team working agreements</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-sm font-medium text-blue-900">
                Expected Impact: Improve velocity consistency by 25%
              </p>
            </div>
          </div>

          <div className="border-l-4 border-purple-500 pl-4 py-3 bg-purple-50 rounded-r">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-purple-900">Phase 3: Automation (Weeks 7-12)</h4>
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-medium">LONG-TERM</span>
            </div>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>✓ Automate UAT deployment pipeline</li>
              <li>✓ Implement automated smoke tests</li>
              <li>✓ Set up deployment status notifications</li>
              <li>✓ Enable feature flags for safer releases</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-purple-200">
              <p className="text-sm font-medium text-purple-900">
                Expected Impact: Reduce deployment time by 80%
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-[#EBF5FF] border border-[#D2D2D7] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="size-8 text-blue-600" />
            <div>
              <p className="text-blue-900 font-medium text-lg">
                Total Potential Improvement
              </p>
              <p className="text-blue-800 text-sm mt-1">
                Reduce average delivery time from <span className="font-semibold">17.5 days to under 10 days</span> — 
                that's a <span className="font-semibold">43% improvement</span> in delivery speed!
              </p>
              <p className="text-blue-700 text-sm mt-2">
                Increase sprint predictability to <span className="font-semibold">90%+</span> and 
                stabilize velocity within <span className="font-semibold">±3 story points</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
