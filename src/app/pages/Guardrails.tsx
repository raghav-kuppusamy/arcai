/**
 * Guardrails.tsx — Quality & Security Guardrails
 *
 * Aggregates results from four automated quality gates:
 *   1. ESLint        — static code analysis: errors, warnings, fixable issues
 *   2. SonarQube     — code quality metrics: bugs, vulnerabilities, code smells, coverage
 *   3. Fortify       — SAST (static application security testing): CVE-level findings
 *   4. Unit Tests    — test execution results: pass/fail counts and coverage percentage
 *   (+) Security Scans — secrets detection, dependency vulnerabilities, container image scanning
 *
 * The AI Guardrails Intelligence banner synthesises findings across all tools
 * to produce a unified risk score and actionable remediation advice.
 */
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, AlertCircle as AlertCircleIcon, FileCode, Bug, Lock, TestTube, Sparkles } from 'lucide-react';
import { mockESLintReport, mockSonarQubeAnalysis, mockFortifyScan, mockUnitTestExecution, mockSecurityScans } from '../data/mockData';

/**
 * Guardrails — unified quality and security gate dashboard.
 */
export function Guardrails() {
  // ─── Derive top-level pass/fail/warning status for each tool ────────────────
  // ESLint: 0 errors = passed, 1-5 errors = warning, 6+ = failed
  const eslintStatus   = mockESLintReport.errors === 0 ? 'passed' : mockESLintReport.errors <= 5 ? 'warning' : 'failed';
  // SonarQube, Fortify, and unit tests surface their own status directly
  const sonarQubeStatus = mockSonarQubeAnalysis.qualityGateStatus;
  const fortifyStatus   = mockFortifyScan.status;
  const testStatus      = mockUnitTestExecution.status;
  // Use the secrets scan as the representative security scan status
  const securityStatus  = mockSecurityScans.find(s => s.scanType === 'secrets')?.status || 'warning';

  /**
   * Renders a coloured pill badge for a guardrail tool's overall status.
   * 'review-required' and 'unstable' both map to the amber 'warning' visual
   * since they both mean "needs attention but isn't a hard failure".
   */
  const getStatusBadge = (status: 'passed' | 'failed' | 'warning' | 'review-required' | 'unstable') => {
    const normalizedStatus = status === 'review-required' ? 'warning' : status === 'unstable' ? 'warning' : status;
    
    switch (normalizedStatus) {
      case 'passed':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium"><CheckCircle className="size-3" /> Passed</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium"><XCircle className="size-3" /> Failed</span>;
      case 'warning':
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium"><AlertTriangle className="size-3" /> Warning</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium"><Clock className="size-3" /> Pending</span>;
    }
  };

  /**
   * Returns Tailwind classes for an individual finding's severity badge.
   * ESLint uses 'error'/'warning'/'info' while other tools use 'critical'/'high'/etc.
   * Normalising 'error' → 'critical' keeps the colour logic unified.
   */
  const getSeverityBadge = (severity: 'critical' | 'high' | 'medium' | 'low' | 'error' | 'warning' | 'info') => {
    const normalizedSeverity = severity === 'error' ? 'critical' : severity;
    
    switch (normalizedSeverity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Returns background + text classes for SonarQube's A–E reliability/security ratings.
   * A = green (best), E = red (worst), matching the standard SonarQube colour scheme.
   */
  const getRatingColor = (rating: 'A' | 'B' | 'C' | 'D' | 'E') => {
    switch (rating) {
      case 'A':
        return 'bg-green-600 text-white';
      case 'B':
        return 'bg-blue-600 text-white';
      case 'C':
        return 'bg-yellow-600 text-white';
      case 'D':
        return 'bg-orange-600 text-white';
      case 'E':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Quality & Security Guardrails</h2>
        <p className="text-gray-600 mt-1">Automated quality gates and security scans ensuring code quality and security compliance</p>
      </div>

      {/* Intelligence Section */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Sparkles className="size-5" />
              Guardrails Intelligence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm opacity-95">
              <div>
                <p className="font-semibold mb-2">🎯 Quality Overview</p>
                <ul className="space-y-1 text-sm">
                  <li>• Code Quality: {sonarQubeStatus === 'passed' ? '✓ Passed' : '⚠ Warning'} (Rating: B)</li>
                  <li>• ESLint Issues: {mockESLintReport.errors} errors, {mockESLintReport.warnings} warnings</li>
                  <li>• Test Coverage: {mockUnitTestExecution.overallCoverage}% ({mockUnitTestExecution.failed} tests failing)</li>
                  <li>• Security: {mockFortifyScan.critical} critical vulnerabilities</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">🚨 Critical Actions Required</p>
                <ul className="space-y-1 text-sm">
                  <li>• Fix {mockFortifyScan.critical} critical security issues (SQL Injection, XSS)</li>
                  <li>• Remove {mockSecurityScans.find(s => s.scanType === 'secrets')?.critical || 3} hardcoded secrets from code</li>
                  <li>• Address {mockESLintReport.errors} ESLint errors blocking build</li>
                  <li>• Investigate {mockUnitTestExecution.failed} failing test cases</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm font-semibold">💡 AI Recommendation:</p>
              <p className="text-sm opacity-95 mt-1">
                Prioritize fixing critical security vulnerabilities before next deployment. Implement automated security 
                scanning in CI/CD pipeline to prevent future issues. Target 80%+ test coverage and zero critical findings.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileCode className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">ESLint</p>
              {getStatusBadge(eslintStatus)}
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{mockESLintReport.totalIssues}</p>
          <p className="text-xs text-gray-600 mt-1">Total Issues</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bug className="size-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">SonarQube</p>
              {getStatusBadge(sonarQubeStatus)}
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{mockSonarQubeAnalysis.bugs}</p>
          <p className="text-xs text-gray-600 mt-1">Bugs Found</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="size-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Fortify</p>
              {getStatusBadge(fortifyStatus)}
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{mockFortifyScan.critical}</p>
          <p className="text-xs text-gray-600 mt-1">Critical Issues</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TestTube className="size-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Unit Tests</p>
              {getStatusBadge(testStatus)}
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{mockUnitTestExecution.passed}/{mockUnitTestExecution.totalTests}</p>
          <p className="text-xs text-gray-600 mt-1">Tests Passing</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Lock className="size-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600">Security</p>
              {getStatusBadge(securityStatus)}
            </div>
          </div>
          <p className="text-2xl font-semibold text-gray-900">{mockSecurityScans.reduce((sum, scan) => sum + scan.critical, 0)}</p>
          <p className="text-xs text-gray-600 mt-1">Critical Findings</p>
        </div>
      </div>

      {/* ESLint Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileCode className="size-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">ESLint Code Quality Check</h3>
              <p className="text-sm text-gray-600">Last scan: {new Date(mockESLintReport.lastScan).toLocaleString()}</p>
            </div>
          </div>
          {getStatusBadge(eslintStatus)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-600">Files Scanned</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">{mockESLintReport.totalFiles}</p>
          </div>
          <div className="bg-red-50 rounded p-3">
            <p className="text-xs text-red-600">Errors</p>
            <p className="text-xl font-semibold text-red-900 mt-1">{mockESLintReport.errors}</p>
          </div>
          <div className="bg-orange-50 rounded p-3">
            <p className="text-xs text-orange-600">Warnings</p>
            <p className="text-xl font-semibold text-orange-900 mt-1">{mockESLintReport.warnings}</p>
          </div>
          <div className="bg-green-50 rounded p-3">
            <p className="text-xs text-green-600">Auto-Fixable</p>
            <p className="text-xl font-semibold text-green-900 mt-1">{mockESLintReport.fixableIssues}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Top Issues</h4>
          {mockESLintReport.issues.map((issue) => (
            <div key={issue.id} className={`border rounded-lg p-4 ${getSeverityBadge(issue.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getSeverityBadge(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className="text-xs font-mono text-gray-600">{issue.rule}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{issue.message}</p>
                  <p className="text-xs text-gray-600">
                    {issue.file}:{issue.line}:{issue.column}
                  </p>
                </div>
                {issue.fixable && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    Auto-fixable
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SonarQube Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Bug className="size-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">SonarQube Code Analysis</h3>
              <p className="text-sm text-gray-600">Last analysis: {new Date(mockSonarQubeAnalysis.lastAnalysis).toLocaleString()}</p>
            </div>
          </div>
          {getStatusBadge(sonarQubeStatus)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 rounded p-3">
            <p className="text-xs text-red-600">Bugs</p>
            <p className="text-xl font-semibold text-red-900 mt-1">{mockSonarQubeAnalysis.bugs}</p>
          </div>
          <div className="bg-orange-50 rounded p-3">
            <p className="text-xs text-orange-600">Vulnerabilities</p>
            <p className="text-xl font-semibold text-orange-900 mt-1">{mockSonarQubeAnalysis.vulnerabilities}</p>
          </div>
          <div className="bg-yellow-50 rounded p-3">
            <p className="text-xs text-yellow-600">Code Smells</p>
            <p className="text-xl font-semibold text-yellow-900 mt-1">{mockSonarQubeAnalysis.codeSmells}</p>
          </div>
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs text-blue-600">Coverage</p>
            <p className="text-xl font-semibold text-blue-900 mt-1">{mockSonarQubeAnalysis.coverage}%</p>
          </div>
          <div className="bg-purple-50 rounded p-3">
            <p className="text-xs text-purple-600">Duplications</p>
            <p className="text-xl font-semibold text-purple-900 mt-1">{mockSonarQubeAnalysis.duplications}%</p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-600">Technical Debt</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">{mockSonarQubeAnalysis.technicalDebt}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Quality Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockSonarQubeAnalysis.metrics.map((metric, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{metric.metric}</span>
                  {metric.rating && (
                    <span className={`size-8 rounded flex items-center justify-center font-bold ${getRatingColor(metric.rating)}`}>
                      {metric.rating}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
                <div className="mt-2">
                  {metric.status === 'passed' && <span className="text-xs text-green-600">✓ Passed</span>}
                  {metric.status === 'warning' && <span className="text-xs text-orange-600">⚠ Warning</span>}
                  {metric.status === 'failed' && <span className="text-xs text-red-600">✗ Failed</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fortify Security Scan */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="size-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Fortify Security Scan</h3>
              <p className="text-sm text-gray-600">Scan Date: {new Date(mockFortifyScan.scanDate).toLocaleString()} | Version: {mockFortifyScan.version}</p>
            </div>
          </div>
          {getStatusBadge(fortifyStatus)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 rounded p-3">
            <p className="text-xs text-red-600">Critical</p>
            <p className="text-xl font-semibold text-red-900 mt-1">{mockFortifyScan.critical}</p>
          </div>
          <div className="bg-orange-50 rounded p-3">
            <p className="text-xs text-orange-600">High</p>
            <p className="text-xl font-semibold text-orange-900 mt-1">{mockFortifyScan.high}</p>
          </div>
          <div className="bg-yellow-50 rounded p-3">
            <p className="text-xs text-yellow-600">Medium</p>
            <p className="text-xl font-semibold text-yellow-900 mt-1">{mockFortifyScan.medium}</p>
          </div>
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs text-blue-600">Low</p>
            <p className="text-xl font-semibold text-blue-900 mt-1">{mockFortifyScan.low}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Security Issues</h4>
          {mockFortifyScan.issues.map((issue) => (
            <div key={issue.id} className={`border rounded-lg p-4 ${getSeverityBadge(issue.severity)}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getSeverityBadge(issue.severity)}`}>
                      {issue.severity}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{issue.category}</span>
                    {issue.cwe && <span className="text-xs text-gray-600 font-mono">{issue.cwe}</span>}
                  </div>
                  <p className="text-sm text-gray-900 mb-2">{issue.description}</p>
                  <p className="text-xs text-gray-600 mb-3">
                    {issue.file}:{issue.line}
                  </p>
                </div>
              </div>
              <div className="bg-white/50 rounded p-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">Recommendation:</p>
                <p className="text-xs text-gray-600">{issue.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unit Test Execution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TestTube className="size-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Unit Test Execution</h3>
              <p className="text-sm text-gray-600">Run ID: {mockUnitTestExecution.runId} | {new Date(mockUnitTestExecution.timestamp).toLocaleString()}</p>
            </div>
          </div>
          {getStatusBadge(testStatus)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-600">Total Tests</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">{mockUnitTestExecution.totalTests}</p>
          </div>
          <div className="bg-green-50 rounded p-3">
            <p className="text-xs text-green-600">Passed</p>
            <p className="text-xl font-semibold text-green-900 mt-1">{mockUnitTestExecution.passed}</p>
          </div>
          <div className="bg-red-50 rounded p-3">
            <p className="text-xs text-red-600">Failed</p>
            <p className="text-xl font-semibold text-red-900 mt-1">{mockUnitTestExecution.failed}</p>
          </div>
          <div className="bg-yellow-50 rounded p-3">
            <p className="text-xs text-yellow-600">Skipped</p>
            <p className="text-xl font-semibold text-yellow-900 mt-1">{mockUnitTestExecution.skipped}</p>
          </div>
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs text-blue-600">Coverage</p>
            <p className="text-xl font-semibold text-blue-900 mt-1">{mockUnitTestExecution.overallCoverage}%</p>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Test Suites</h4>
          <div className="space-y-3">
            {mockUnitTestExecution.suites.map((suite, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">{suite.name}</h5>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">{suite.duration}s</span>
                    <span className="text-xs text-blue-600">{suite.coverage}% coverage</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600">✓ {suite.passed} passed</span>
                  {suite.failed > 0 && <span className="text-red-600">✗ {suite.failed} failed</span>}
                  {suite.skipped > 0 && <span className="text-yellow-600">⊘ {suite.skipped} skipped</span>}
                </div>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(suite.passed / suite.totalTests) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {mockUnitTestExecution.failedTests && mockUnitTestExecution.failedTests.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Failed Tests</h4>
            <div className="space-y-3">
              {mockUnitTestExecution.failedTests.map((test, idx) => (
                <div key={idx} className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <XCircle className="size-4 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{test.name}</p>
                      <p className="text-xs text-gray-600 mt-1">{test.suite}</p>
                    </div>
                  </div>
                  <div className="bg-red-100 rounded p-2 mt-2">
                    <p className="text-xs font-mono text-red-900">{test.error}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Security Scan Reports */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Lock className="size-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Security Scan Reports</h3>
              <p className="text-sm text-gray-600">Dependency vulnerabilities and secrets detection</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {mockSecurityScans.map((scan) => (
            <div key={scan.scanId} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 capitalize">{scan.scanType} Scan</h4>
                    {getStatusBadge(scan.status)}
                  </div>
                  <p className="text-xs text-gray-600">Scan Date: {new Date(scan.scanDate).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                <div className="bg-red-50 rounded p-2 text-center">
                  <p className="text-lg font-semibold text-red-900">{scan.critical}</p>
                  <p className="text-xs text-red-600">Critical</p>
                </div>
                <div className="bg-orange-50 rounded p-2 text-center">
                  <p className="text-lg font-semibold text-orange-900">{scan.high}</p>
                  <p className="text-xs text-orange-600">High</p>
                </div>
                <div className="bg-yellow-50 rounded p-2 text-center">
                  <p className="text-lg font-semibold text-yellow-900">{scan.medium}</p>
                  <p className="text-xs text-yellow-600">Medium</p>
                </div>
                <div className="bg-blue-50 rounded p-2 text-center">
                  <p className="text-lg font-semibold text-blue-900">{scan.low}</p>
                  <p className="text-xs text-blue-600">Low</p>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <p className="text-lg font-semibold text-gray-900">{scan.info}</p>
                  <p className="text-xs text-gray-600">Info</p>
                </div>
              </div>

              <div className="space-y-3">
                {scan.findings.map((finding) => (
                  <div key={finding.id} className={`border rounded-lg p-3 ${getSeverityBadge(finding.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getSeverityBadge(finding.severity)}`}>
                            {finding.severity}
                          </span>
                          <span className="text-xs font-medium text-gray-700 capitalize">{finding.type}</span>
                          {finding.cve && <span className="text-xs font-mono text-gray-600">{finding.cve}</span>}
                        </div>
                        {finding.package && (
                          <p className="text-xs text-gray-700 mb-1">
                            <span className="font-medium">Package:</span> {finding.package}@{finding.version}
                          </p>
                        )}
                        <p className="text-sm text-gray-900 mb-2">{finding.description}</p>
                        <div className="bg-white/50 rounded p-2">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Recommendation:</p>
                          <p className="text-xs text-gray-600">{finding.recommendation}</p>
                        </div>
                      </div>
                      {finding.fixAvailable && finding.fixVersion && (
                        <div className="ml-3">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            Fix: v{finding.fixVersion}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
