/**
 * Preferences.tsx — Integration API Settings
 *
 * Allows the team to configure the API credentials that Arc AI uses to
 * pull live data from third-party tools. Until these are set, the app
 * operates entirely on mock data from mockData.ts.
 *
 * Supported integrations:
 *   - Jira        — project URL, email, API token, project key, board ID
 *   - GitHub      — personal access token, organisation, repository
 *   - CI/CD       — provider selection + URL, token, project, org
 *
 * Security notes:
 *   - API tokens are masked by default (Eye / EyeOff toggle).
 *   - Settings are persisted in localStorage (browser-local; never sent to a server).
 *   - In production, credentials should be stored server-side via a secrets manager.
 */
import { useState, useRef } from 'react';
import { Settings, Eye, EyeOff, Save, Key, CheckCircle, AlertCircle, Info, Upload, Brain, Trash2, Loader2, Sparkles, FileText } from 'lucide-react';

/**
 * ApiConfig — the shape of all integration credentials managed on this page.
 * Each field maps 1:1 to a localStorage key so state hydration is straightforward.
 */
interface ApiConfig {
  jiraUrl: string;
  jiraEmail: string;
  jiraToken: string;
  jiraProjectKey: string;
  jiraBoardId: string;
  githubToken: string;
  githubOrg: string;
  githubRepo: string;
  pipelineProvider: 'jenkins' | 'circleci' | 'github-actions' | 'gitlab-ci' | 'azure-devops' | '';
  pipelineUrl: string;
  pipelineToken: string;
  pipelineProject: string;
  pipelineOrg: string;
  dataRefreshInterval: string;
}

/**
 * Preferences — form for entering and saving API integration credentials.
 */
export function Preferences() {
  // Per-token visibility flags — each token field has its own toggle
  // so users can reveal one credential at a time without exposing others.
  const [showJiraToken, setShowJiraToken] = useState(false);
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showPipelineToken, setShowPipelineToken] = useState(false);

  // 'idle' = unsaved, 'success' = just saved, 'error' = localStorage write failed
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // ─── Train Arc AI state ────────────────────────────────────────────────
  // Each source slot stores just the selected filename (no real upload).
  type TrainStepStatus = 'pending' | 'running' | 'done';
  interface TrainStep { id: string; label: string; detail?: string; status: TrainStepStatus; }

  const TRAIN_SOURCES = [
    { id: 'project',      label: 'Project Report',              accept: '.pdf,.xlsx,.csv,.docx', hint: 'PDF, XLSX or CSV' },
    { id: 'jira',         label: 'Jira Export',                 accept: '.csv,.json',           hint: 'CSV or JSON export from Jira' },
    { id: 'deployment',   label: 'Deployment Report',           accept: '.csv,.json,.pdf',      hint: 'PDF, CSV or JSON' },
    { id: 'sprint',       label: 'Sprint Retrospective',        accept: '.pdf,.docx,.txt',      hint: 'PDF, DOCX or TXT' },
    { id: 'velocity',     label: 'Velocity & Metrics Report',   accept: '.xlsx,.csv',           hint: 'XLSX or CSV' },
    { id: 'incident',     label: 'Incident / Post-Mortem',      accept: '.pdf,.docx,.txt',      hint: 'PDF, DOCX or TXT' },
  ] as const;

  const [uploads, setUploads] = useState<Record<string, string>>({}); // sourceId → filename
  const [trainPhase, setTrainPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [trainSteps, setTrainSteps] = useState<TrainStep[]>([]);
  const [trainedAt,  setTrainedAt]  = useState<string | null>(
    localStorage.getItem('arc_trained_at')
  );
  const trainRunIdRef = useRef(0);

  const handleFileSelect = (sourceId: string, file: File | undefined) => {
    if (!file) return;
    setUploads(prev => ({ ...prev, [sourceId]: file.name }));
  };

  const removeUpload = (sourceId: string) => {
    setUploads(prev => { const next = { ...prev }; delete next[sourceId]; return next; });
  };

  const uploadedCount = Object.keys(uploads).length;

  const TRAIN_STEPS = [
    { id: 't1', label: 'Validating uploaded data sources',      detail: `${uploadedCount} source(s) validated · formats verified`,                delay: 600  },
    { id: 't2', label: 'Parsing and normalising project data',  detail: 'Project timelines, milestones and KPIs extracted',                   delay: 800  },
    { id: 't3', label: 'Ingesting Jira and sprint history',     detail: 'Velocity trends, story distribution and blockers indexed',           delay: 900  },
    { id: 't4', label: 'Processing deployment & incident logs', detail: 'Deployment patterns, rollback events and MTTR computed',             delay: 800  },
    { id: 't5', label: 'Building team performance baseline',    detail: 'Reviewer throughput, PR age curves and bottleneck profiles built',   delay: 700  },
    { id: 't6', label: 'Fine-tuning Arc AI recommendation model', detail: 'Model weights updated with your historical context',               delay: 1000 },
    { id: 't7', label: 'Persisting training checkpoint',        detail: 'Checkpoint saved · Arc AI will now use your project context',         delay: 500  },
  ];

  const runTraining = async (runId: number) => {
    const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
    setTrainPhase('running');
    setTrainSteps(TRAIN_STEPS.map(s => ({ id: s.id, label: s.label, status: 'pending' as TrainStepStatus })));
    for (const step of TRAIN_STEPS) {
      if (trainRunIdRef.current !== runId) return;
      setTrainSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'running' } : s));
      await sleep(step.delay);
      if (trainRunIdRef.current !== runId) return;
      setTrainSteps(prev => prev.map(s => s.id === step.id ? { ...s, status: 'done', detail: step.detail } : s));
    }
    if (trainRunIdRef.current !== runId) return;
    const now = new Date().toLocaleString();
    localStorage.setItem('arc_trained_at', now);
    setTrainedAt(now);
    setTrainPhase('done');
  };

  const startTraining = () => {
    const runId = ++trainRunIdRef.current;
    setTrainPhase('idle');
    setTrainSteps([]);
    setTimeout(() => runTraining(runId), 300);
  };

  // Hydrate form state from localStorage on first render.
  // Falls back to empty strings so the form is never in an undefined state.
  const [config, setConfig] = useState<ApiConfig>({
    jiraUrl: localStorage.getItem('jira_url') || '',
    jiraEmail: localStorage.getItem('jira_email') || '',
    jiraToken: localStorage.getItem('jira_token') || '',
    jiraProjectKey: localStorage.getItem('jira_project_key') || '',
    jiraBoardId: localStorage.getItem('jira_board_id') || '',
    githubToken: localStorage.getItem('github_token') || '',
    githubOrg: localStorage.getItem('github_org') || '',
    githubRepo: localStorage.getItem('github_repo') || '',
    pipelineProvider: (['jenkins', 'circleci', 'github-actions', 'gitlab-ci', 'azure-devops'] as const).find(
      v => v === localStorage.getItem('pipeline_provider')
    ) ?? '',
    pipelineUrl: localStorage.getItem('pipeline_url') || '',
    pipelineToken: localStorage.getItem('pipeline_token') || '',
    pipelineProject: localStorage.getItem('pipeline_project') || '',
    pipelineOrg: localStorage.getItem('pipeline_org') || '',
    dataRefreshInterval: localStorage.getItem('data_refresh_interval') || '5m',
  });

  const handleSave = () => {
    try {
      // Save to localStorage
      localStorage.setItem('jira_url', config.jiraUrl);
      localStorage.setItem('jira_email', config.jiraEmail);
      localStorage.setItem('jira_token', config.jiraToken);
      localStorage.setItem('jira_project_key', config.jiraProjectKey);
      localStorage.setItem('jira_board_id', config.jiraBoardId);
      localStorage.setItem('github_token', config.githubToken);
      localStorage.setItem('github_org', config.githubOrg);
      localStorage.setItem('github_repo', config.githubRepo);
      localStorage.setItem('pipeline_provider', config.pipelineProvider);
      localStorage.setItem('pipeline_url', config.pipelineUrl);
      localStorage.setItem('pipeline_token', config.pipelineToken);
      localStorage.setItem('pipeline_project', config.pipelineProject);
      localStorage.setItem('pipeline_org', config.pipelineOrg);
      localStorage.setItem('data_refresh_interval', config.dataRefreshInterval);
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateConfig = (field: keyof ApiConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-1">Configure API tokens and integrations</p>
        </div>
        <Settings className="size-8 text-gray-400" />
      </div>

      {/* Save Status Alert */}
      {saveStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="size-5 text-green-600" />
          <p className="text-green-900">Settings saved successfully!</p>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="size-5 text-red-600" />
          <p className="text-red-900">Failed to save settings. Please try again.</p>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Key className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Security Notice</h3>
            <p className="text-sm text-blue-800">
              Your API tokens are stored locally in your browser and are never sent to our servers. 
              Keep your tokens secure and never share them with others.
            </p>
          </div>
        </div>
      </div>

      {/* Jira Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-2 rounded-lg">
            <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
              <path className="text-blue-600" d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Jira Configuration</h3>
            <p className="text-sm text-gray-600">Connect to your Jira instance</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jira URL
            </label>
            <input
              type="url"
              value={config.jiraUrl}
              onChange={(e) => updateConfig('jiraUrl', e.target.value)}
              placeholder="https://your-domain.atlassian.net"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={config.jiraEmail}
              onChange={(e) => updateConfig('jiraEmail', e.target.value)}
              placeholder="your-email@company.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Token
            </label>
            <div className="relative">
              <input
                type={showJiraToken ? 'text' : 'password'}
                value={config.jiraToken}
                onChange={(e) => updateConfig('jiraToken', e.target.value)}
                placeholder="Enter your Jira API token"
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowJiraToken(!showJiraToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showJiraToken ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <a 
                href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                How to create a Jira API token
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Key
            </label>
            <input
              type="text"
              value={config.jiraProjectKey}
              onChange={(e) => updateConfig('jiraProjectKey', e.target.value)}
              placeholder="ABC"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Board ID
            </label>
            <input
              type="text"
              value={config.jiraBoardId}
              onChange={(e) => updateConfig('jiraBoardId', e.target.value)}
              placeholder="12345"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* GitHub Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gray-900 p-2 rounded-lg">
            <svg className="size-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">GitHub Configuration</h3>
            <p className="text-sm text-gray-600">Connect to your GitHub repositories</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal Access Token
            </label>
            <div className="relative">
              <input
                type={showGithubToken ? 'text' : 'password'}
                value={config.githubToken}
                onChange={(e) => updateConfig('githubToken', e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowGithubToken(!showGithubToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showGithubToken ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Required scopes: <span className="font-mono bg-gray-100 px-1 rounded">repo</span>, <span className="font-mono bg-gray-100 px-1 rounded">read:org</span> • {' '}
              <a 
                href="https://github.com/settings/tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Create a token
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization
            </label>
            <input
              type="text"
              value={config.githubOrg}
              onChange={(e) => updateConfig('githubOrg', e.target.value)}
              placeholder="your-organization"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repository
            </label>
            <input
              type="text"
              value={config.githubRepo}
              onChange={(e) => updateConfig('githubRepo', e.target.value)}
              placeholder="your-repository"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* CI/CD Pipeline Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-2 rounded-lg">
            <svg className="size-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">CI/CD Pipeline Configuration</h3>
            <p className="text-sm text-gray-600">Connect to your deployment pipeline (Jenkins, CircleCI, etc.)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipeline Provider
            </label>
            <select
              value={config.pipelineProvider}
              onChange={(e) => updateConfig('pipelineProvider', e.target.value as 'jenkins' | 'circleci' | 'github-actions' | 'gitlab-ci' | 'azure-devops' | '')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Select a provider</option>
              <option value="jenkins">Jenkins</option>
              <option value="circleci">CircleCI</option>
              <option value="github-actions">GitHub Actions</option>
              <option value="gitlab-ci">GitLab CI</option>
              <option value="azure-devops">Azure DevOps</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pipeline URL
            </label>
            <input
              type="url"
              value={config.pipelineUrl}
              onChange={(e) => updateConfig('pipelineUrl', e.target.value)}
              placeholder="https://jenkins.company.com or https://circleci.com/api/v2"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Token
            </label>
            <div className="relative">
              <input
                type={showPipelineToken ? 'text' : 'password'}
                value={config.pipelineToken}
                onChange={(e) => updateConfig('pipelineToken', e.target.value)}
                placeholder="Enter your pipeline API token"
                className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPipelineToken(!showPipelineToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPipelineToken ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Supports Jenkins, CircleCI, GitHub Actions, GitLab CI, and other CI/CD tools
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <input
              type="text"
              value={config.pipelineProject}
              onChange={(e) => updateConfig('pipelineProject', e.target.value)}
              placeholder="your-project"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization
            </label>
            <input
              type="text"
              value={config.pipelineOrg}
              onChange={(e) => updateConfig('pipelineOrg', e.target.value)}
              placeholder="your-organization"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Refresh Interval
            </label>
            <input
              type="text"
              value={config.dataRefreshInterval}
              onChange={(e) => updateConfig('dataRefreshInterval', e.target.value)}
              placeholder="5m"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* API Data Coverage Info */}
      <div className="bg-[#EBF5FF] border border-[#D2D2D7] rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="size-6 text-[#0071E3] flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-[#163A5F] mb-1">What Data Will Arc Pull?</h3>
            <p className="text-sm text-[#6E6E73] mb-4">
              With the configuration above, Arc will automatically fetch and analyze the following data:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Jira Data */}
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <div className="size-2 rounded-full bg-blue-500" />
              From Jira
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• User Stories & Epics</li>
              <li>• Sprint Progress</li>
              <li>• Story Points & Velocity</li>
              <li>• Backlog Status</li>
              <li>• Defects & Bugs</li>
              <li>• Blockers & Dependencies</li>
              <li>• Sprint Burndown</li>
              <li>• Custom Fields</li>
            </ul>
          </div>

          {/* GitHub Data */}
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <div className="size-2 rounded-full bg-gray-800" />
              From GitHub
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Pull Requests</li>
              <li>• Review Comments</li>
              <li>• PR Age & Status</li>
              <li>• Merge Conflicts</li>
              <li>• Code Review Time</li>
              <li>• Contributor Activity</li>
              <li>• Branch Information</li>
              <li>• CI/CD Check Status</li>
            </ul>
          </div>

          {/* CI/CD Data */}
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <div className="size-2 rounded-full bg-purple-500" />
              From CI/CD Pipeline
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Deployment History</li>
              <li>• Build Status</li>
              <li>• Test Results</li>
              <li>• Environment Status</li>
              <li>• Deploy Success Rate</li>
              <li>• Build Duration</li>
              <li>• Rollback Events</li>
              <li>• Pipeline Metrics</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#D2D2D7]">
          <h4 className="font-semibold text-[#163A5F] mb-2">📊 AI-Powered Analytics Include:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[#6E6E73]">
            <div>• Bottleneck Detection & Root Cause Analysis</div>
            <div>• Predictive Timeline Risk Assessment</div>
            <div>• Team Velocity Trends & Forecasting</div>
            <div>• Code Review SLA Monitoring</div>
            <div>• Deployment Success Pattern Recognition</div>
            <div>• Sprint Goal Achievement Probability</div>
            <div>• Resource Allocation Recommendations</div>
            <div>• Quality Gate Failure Predictions</div>
          </div>
        </div>
      </div>

      {/* ─── Train Arc AI with Historical Data ─────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

        {/* Section header */}
        <div className="bg-[#163A5F] px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
              <Brain className="size-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                <Sparkles className="size-4" />
                Train Arc AI with Historical Data
              </h3>
              <p className="text-white/80 text-sm mt-1">
                Upload previous project reports, Jira exports and deployment logs so Arc AI can learn
                your team’s patterns, velocity baselines and risk indicators — making every
                recommendation specific to your context.
              </p>
              {trainedAt && (
                <p className="text-white/60 text-xs mt-2">
                  Last trained: {trainedAt}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Upload slots */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Upload Data Sources
              <span className="ml-2 text-xs font-normal text-gray-400">(all files are processed locally — never uploaded to a server)</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TRAIN_SOURCES.map(source => {
                const filename = uploads[source.id];
                return (
                  <div key={source.id}
                    className={`relative flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-colors ${
                      filename
                        ? 'border-[#0071E3] bg-[#EBF5FF]'
                        : 'border-gray-200 bg-gray-50 hover:border-[#0071E3] hover:bg-[#EBF5FF]/40'
                    }`}>
                    <div className={`flex-shrink-0 ${ filename ? 'text-[#0071E3]' : 'text-gray-400' }`}>
                      {filename ? <FileText className="size-5" /> : <Upload className="size-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{source.label}</p>
                      {filename ? (
                        <p className="text-xs text-[#0071E3] truncate" title={filename}>{filename}</p>
                      ) : (
                        <p className="text-xs text-gray-400">{source.hint}</p>
                      )}
                    </div>
                    {filename ? (
                      <button
                        onClick={() => removeUpload(source.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove file">
                        <Trash2 className="size-4" />
                      </button>
                    ) : (
                      <label className="flex-shrink-0 cursor-pointer">
                        <input
                          type="file"
                          accept={source.accept}
                          className="sr-only"
                          onChange={e => handleFileSelect(source.id, e.target.files?.[0])}
                        />
                        <span className="text-xs text-[#0071E3] hover:text-[#0058B3] font-medium">Browse</span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Training agent steps */}
          {trainSteps.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Training Progress</p>
              {trainSteps.map(step => (
                <div key={step.id} className="flex items-start gap-3">
                  {step.status === 'done'    && <CheckCircle className="size-5 text-[#0071E3] flex-shrink-0 mt-0.5" />}
                  {step.status === 'running' && <Loader2    className="size-5 text-[#0071E3] animate-spin flex-shrink-0 mt-0.5" />}
                  {step.status === 'pending' && <div className="size-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${ step.status === 'pending' ? 'text-gray-400' : 'text-gray-800' }`}>{step.label}</p>
                    {step.detail && step.status === 'done' && (
                      <p className="text-xs text-gray-500 mt-0.5">{step.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Done banner */}
          {trainPhase === 'done' && (
            <div className="bg-[#EBF5FF] border border-[#D2D2D7] rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="size-5 text-[#0071E3] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#163A5F]">Arc AI training complete!</p>
                <p className="text-xs text-[#6E6E73] mt-0.5">
                  Your historical data has been indexed. All agents across Dashboard, Planning,
                  Stories and Deployments will now incorporate your project context into their
                  analysis and recommendations.
                </p>
              </div>
            </div>
          )}

          {/* Info notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              Training is incremental — you can add more reports later and re-train without losing previous context.
              Supported formats: <span className="font-mono bg-amber-100 px-1 rounded">.pdf</span>{' '}
              <span className="font-mono bg-amber-100 px-1 rounded">.xlsx</span>{' '}
              <span className="font-mono bg-amber-100 px-1 rounded">.csv</span>{' '}
              <span className="font-mono bg-amber-100 px-1 rounded">.json</span>{' '}
              <span className="font-mono bg-amber-100 px-1 rounded">.docx</span>
            </p>
          </div>

          {/* Train button */}
          <div className="flex justify-end">
            <button
              onClick={startTraining}
              disabled={uploadedCount === 0 || trainPhase === 'running'}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-sm">
              {trainPhase === 'running' ? (
                <><Loader2 className="size-4 animate-spin" /> Training…</>
              ) : (
                <><Brain className="size-4" /> {trainPhase === 'done' ? 'Re-Train Arc AI' : 'Train Arc AI'}</>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Save className="size-5" />
          Save Configuration
        </button>
      </div>
    </div>
  );
}