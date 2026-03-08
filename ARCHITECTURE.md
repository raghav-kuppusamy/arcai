# Arc AI — Detailed Solution Architecture

**Version**: 1.0  
**Date**: March 2026  
**Deployment model**: Single-node (Node/Express + Postgres)  
**Tenancy model**: Multi-tenant, subdomain-based (`tenant.arcai.com`)  
**Auth**: SSO/OAuth (Google + GitHub) + invite-based membership  
**Integrations**: Jira, GitHub, GitHub Actions, Jenkins, ArgoCD  
**Intelligence**: LLM-backed insight summaries + heuristic rules engine  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Deployment Topology (Single-node)](#3-deployment-topology)
4. [Multi-tenancy Model](#4-multi-tenancy-model)
5. [Authentication & Auth Flows](#5-authentication--auth-flows)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Backend API Architecture](#7-backend-api-architecture)
8. [Ingestion Architecture](#8-ingestion-architecture)
9. [Worker / Background Jobs Architecture](#9-worker--background-jobs-architecture)
10. [Data Model (Postgres)](#10-data-model-postgres)
11. [API Contracts](#11-api-contracts)
12. [LLM Intelligence Pipeline](#12-llm-intelligence-pipeline)
13. [Security Model](#13-security-model)
14. [Local Development Setup](#14-local-development-setup)
15. [Migration Path from Mock Data](#15-migration-path-from-mock-data)
16. [Architecture Constraints & Future Scale-out](#16-architecture-constraints--future-scale-out)

---

## 1. System Overview

Arc AI is a **multi-tenant Project Intelligence Platform** that aggregates engineering execution signals from Jira, GitHub, GitHub Actions, Jenkins, and ArgoCD, and surfaces AI-generated insights, bottlenecks, guardrails, and recommendations for engineering teams and their managers.

### Core capabilities
- **Planning view**: track epics, milestones, change requests, sign-offs
- **Jira stories view**: WIP, refinement rate, cycle time, blockers
- **GitHub PRs view**: PR aging, review latency, conflict detection
- **Deployments view**: DORA-aligned metrics across Dev/QA/UAT/Prod
- **Guardrails view**: code quality (ESLint, SonarQube, Fortify), test health, security scans
- **Bottlenecks view**: AI-generated identification of systemic blockers
- **Recommendations view**: prioritized, LLM-summarized suggestions

### What this document covers
The complete architecture from browser to database including auth, integrations, jobs, the LLM pipeline, security, and how it maps to the existing React SPA.

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Existing codebase |
| Styling | TailwindCSS 4 + shadcn-style UI primitives | Existing |
| Charts | Recharts | Existing |
| Router (frontend) | React Router v7 | Existing |
| Backend | Node.js + Express | Simple, TypeScript-compatible, fast to ship |
| ORM / Query builder | Prisma (preferred) or Drizzle | Type-safe schemas + migrations |
| Database | PostgreSQL 15+ | JSONB, RLS, full-text, time-series capable |
| Job queue | BullMQ + Redis (preferred) or pg-boss (DB-only) | BullMQ for robustness; pg-boss to avoid Redis dependency |
| Auth | express-session + passport (OAuth 2.0 / OIDC) | Cookie sessions, multi-tenant safe |
| OAuth providers | Google OAuth 2.0, GitHub OAuth App | SSO-first, no password storage |
| Secrets management | App-level AES-256-GCM encryption (env key) | Simple for single-node |
| LLM | OpenAI (GPT-4o) or Anthropic (Claude) via SDK | Configurable per-tenant |
| Reverse proxy | Nginx | SSL termination, static serving, subdomain routing |
| Container orchestration | Docker Compose (single-node) | Simple local + prod |

---

## 3. Deployment Topology

Single-node deployment means **one host** running the following processes as Docker containers or systemd services:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Single Host (VM / VPS)                     │
│                                                                 │
│  ┌──────────┐   ┌─────────────────┐   ┌──────────────────────┐ │
│  │  Nginx   │──▶│  Express API    │──▶│     Postgres 15      │ │
│  │          │   │  (port 3000)    │   │  (port 5432)         │ │
│  │ :443/:80 │   │  auth + REST    │   │  source of truth     │ │
│  └────┬─────┘   │  webhooks       │   └──────────────────────┘ │
│       │         └────────┬────────┘              ▲             │
│       │ /static           │ enqueue               │             │
│       ▼                   ▼                       │             │
│  ┌──────────┐   ┌─────────────────┐   ┌──────────┴───────────┐ │
│  │ SPA      │   │  Redis          │   │  Worker Process      │ │
│  │ (static  │   │  (port 6379)    │◀──│  (port 3001)         │ │
│  │  files)  │   │  job queue      │   │  sync + jobs + LLM   │ │
│  └──────────┘   └─────────────────┘   └──────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Traffic flow
1. Browser resolves `acme.arcai.com` via DNS (wildcard `*.arcai.com` A record)
2. Nginx terminates TLS (Let's Encrypt wildcard cert)
3. Nginx extracts subdomain and forwards `X-Tenant-Slug: acme` header
4. Nginx routes `/api/*` to Express (port 3000); all other paths serve SPA (`index.html`)
5. Express resolves tenant, checks auth, processes request, reads/writes Postgres
6. Heavy/async work is enqueued to Redis/BullMQ; Worker picks up and processes it

### Process management (production)
- Use **Docker Compose** with services: `nginx`, `api`, `worker`, `postgres`, `redis`
- Or: `pm2` for Node processes + Docker for Postgres + Redis

---

## 4. Multi-tenancy Model

### Subdomain-based tenant resolution (`Option B1`)

Every tenant gets their own subdomain:
```
acme.arcai.com    → tenant_id for "Acme Inc"
betacorp.arcai.com → tenant_id for "Beta Corp"
```

DNS: wildcard `A` record `*.arcai.com → <server IP>`  
Nginx: extract subdomain via regex capture group `~^(?<tenant>[a-z0-9-]+)\.arcai\.com$`  
Express: read `X-Tenant-Slug`, resolve to `tenant_id` from DB (cached in Redis/memory with short TTL)

### Isolation strategy: Row-Level Security (RLS)

Every tenant-scoped table includes a `tenant_id uuid` column.

On each DB connection/transaction, the app sets a Postgres session variable:
```sql
SET LOCAL app.tenant_id = 'ten_uuid_here';
SET LOCAL app.user_id   = 'usr_uuid_here';
```

RLS policies enforce that queries only return rows for the current tenant:
```sql
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pull_requests
  USING (tenant_id::text = current_setting('app.tenant_id', true));
```

This provides a **hard boundary** at the database layer — even a bug in the application layer cannot leak cross-tenant data.

### Session cookie scope

Cookie is set with `Domain=.arcai.com` so it works across all subdomains. The active tenant is stored in the session server-side, not the cookie itself:

```
Session data (server-side):
{
  userId: "usr_123",
  activeTenantId: "ten_456",
  ...
}
```

When a user switches tenants, the server updates `activeTenantId` in the session. The browser is redirected to the new subdomain.

### Local development

Use `*.lvh.me` (resolves to `127.0.0.1`):
- `acme.lvh.me:3000` for API
- `acme.lvh.me:5173` for Vite SPA

---

## 5. Authentication & Auth Flows

### Providers

| Provider | Use case |
|---|---|
| Google OAuth 2.0 (OIDC) | Corporate Google Workspace users |
| GitHub OAuth | Engineers already using GitHub |
| (Future) Okta / Azure AD | Enterprise SSO via OIDC |

### Auth library

- `passport` with `passport-google-oauth20` and `passport-github2`
- OR: `openid-client` (more standards-compliant, future-proof for Okta)
- Sessions: `express-session` backed by Postgres (`connect-pg-simple`) or Redis

### Flow 1: First-time login (new user, no tenant)

```
Browser → GET /api/auth/google/start?returnTo=/
  └── Server generates state (CSRF) + code_verifier (PKCE)
  └── Redirect to Google consent screen
Google → GET /api/auth/google/callback?code=...&state=...
  └── Verify state, PKCE
  └── Exchange code for tokens
  └── Upsert users + oauth_accounts
  └── No tenant membership found
  └── Set session (userId, activeTenantId=null)
  └── Redirect to /create-tenant or /select-tenant
```

### Flow 2: Returning user with one tenant

```
Browser → GET /api/auth/github/start
Google callback
  └── User found, membership found (one tenant)
  └── Set session (userId, activeTenantId=ten_123)
  └── Redirect to returnTo (e.g. /)
```

### Flow 3: Returning user with multiple tenants

```
Callback
  └── User found, multiple memberships
  └── Set session (userId, activeTenantId=null)
  └── Redirect to /select-tenant
/select-tenant
  └── GET /api/me returns memberships[]
  └── User clicks a tenant
  └── POST /api/session/tenant { tenantSlug: "acme" }
  └── Server validates membership, updates session activeTenantId
  └── Browser redirects to acme.arcai.com/
```

### Flow 4: Invite-based onboarding (new user, invited to tenant)

```
Admin → POST /api/tenants/:id/invitations { email, role }
  └── Server creates tenant_invitations row (token_hash stored, raw token emailed)
Email link: https://app.arcai.com/invite/<raw-token>
User clicks link
  └── SPA stores invite token in localStorage
  └── User is not authenticated → /login
  └── OAuth flow runs (start → callback)
  └── Callback detects pending invite token
  └── POST /api/invitations/accept { token }
  └── Server: validate token, create tenant_memberships, mark invitation accepted_at
  └── Set activeTenantId, redirect to acme.arcai.com/
```

### RBAC roles

| Role | Capabilities |
|---|---|
| `owner` | all actions, delete tenant, transfer ownership |
| `admin` | manage integrations, invite members, manage settings |
| `member` | read all data, trigger manual syncs |
| `viewer` | read-only access to all dashboards |

---

## 6. Frontend Architecture

### Existing structure (unchanged)

```
src/
  main.tsx               ← Vite entry point (added)
  app/
    App.tsx              ← RouterProvider
    routes.tsx           ← createBrowserRouter
    components/
      Layout.tsx         ← nav shell (sidebar + header)
      ArcLogo.tsx
      ui/                ← shadcn-style primitives
    pages/
      Dashboard.tsx
      Planning.tsx
      Stories.tsx
      PullRequests.tsx
      Deployments.tsx
      Bottlenecks.tsx
      Guardrails.tsx
      Recommendations.tsx
      Preferences.tsx
      NotFound.tsx
    data/
      mockData.ts        ← to be replaced by API hooks
  styles/
    index.css
    theme.css
    tailwind.css
    fonts.css
```

### Pages to add (auth/tenancy)

```
src/app/pages/
  Login.tsx              ← OAuth provider buttons
  SelectTenant.tsx       ← Tenant picker (multiple memberships)
  CreateTenant.tsx       ← First-time setup
  AcceptInvite.tsx       ← /invite/:token
```

### Auth gate

Wrap all protected routes with an `<AuthGuard>` component:
- Calls `GET /api/me` on mount
- If `401` → redirects to `/login`
- If `activeTenantId = null` → redirects to `/select-tenant`
- Otherwise renders children

### API client layer (replacing mockData.ts)

Create `src/app/api/` with one file per domain:

```
src/app/api/
  client.ts              ← base fetch wrapper (credentials: 'include', base URL, error handling)
  dashboard.ts           ← getSummary(), getTrends()
  workItems.ts           ← getStories(), getEpics()
  pullRequests.ts        ← getPullRequests()
  deployments.ts         ← getDeployments()
  insights.ts            ← getInsights(), getBottlenecks(), getRecommendations()
  planning.ts            ← getMilestones(), getChangeRequests(), getSignOffs()
  integrations.ts        ← getIntegrations(), connectJira(), connectGitHub(), etc.
  auth.ts                ← getMe(), logout(), switchTenant(), acceptInvite()
```

Pair with `@tanstack/react-query` for:
- Caching
- Background refetch
- Loading + error states
- Pagination

---

## 7. Backend API Architecture

### Folder structure

```
server/
  src/
    index.ts             ← Express app bootstrap
    config.ts            ← env vars, validated with zod
    middleware/
      auth.ts            ← session guard, tenant resolution
      tenantContext.ts   ← sets app.tenant_id in DB session
      rateLimiter.ts
      requestLogger.ts
    routes/
      auth.ts            ← /api/auth/*
      me.ts              ← /api/me
      tenants.ts         ← /api/tenants/*
      invitations.ts     ← /api/invitations/*
      integrations.ts    ← /api/integrations/*
      sync.ts            ← /api/sync/*
      dashboard.ts       ← /api/dashboard/*
      workItems.ts       ← /api/work-items
      pullRequests.ts    ← /api/pull-requests
      deployments.ts     ← /api/deployments
      insights.ts        ← /api/insights
      webhooks.ts        ← /api/webhooks/*
    services/
      auth/
        passportSetup.ts
        sessionManager.ts
        inviteService.ts
      integrations/
        jiraClient.ts    ← Jira REST API v3 wrapper
        githubClient.ts  ← GitHub REST + GraphQL wrapper
        githubActionsClient.ts
        jenkinsClient.ts
        argoCdClient.ts
        integrationSecretsService.ts  ← encrypt/decrypt tokens
      analytics/
        dashboardService.ts           ← compute summary + trends
        metricsService.ts             ← query metric_series
        bottleneckService.ts          ← rules engine
      llm/
        evidenceBuilder.ts            ← builds structured context pack
        llmClient.ts                  ← OpenAI/Anthropic wrapper
        insightSummarizer.ts          ← orchestrates evidence → LLM → insight
    jobs/
      registry.ts        ← register all job handlers
      handlers/
        syncJira.ts
        syncGitHub.ts
        syncGitHubActions.ts
        syncJenkins.ts
        syncArgoCD.ts
        rollupMetrics.ts
        generateInsights.ts
        processWebhook.ts
    db/
      client.ts          ← Prisma client singleton
      migrations/        ← Prisma migration files
    types/
      tenant.ts
      auth.ts
      integrations.ts
worker/
  src/
    index.ts             ← BullMQ worker bootstrap (imports job registry)
```

### Request lifecycle

```
Request hits Express
  1. requestLogger middleware
  2. rateLimiter middleware
  3. auth middleware
     → read session cookie
     → load user from DB (or session cache)
     → if unauthenticated: 401
  4. tenantContext middleware
     → read X-Tenant-Slug (from Nginx)
     → resolve tenant_id from slug (cached)
     → verify user is a member
     → SET LOCAL app.tenant_id on DB transaction
     → if not member: 403
  5. Route handler
     → validates input (Zod)
     → calls service
     → returns JSON
```

---

## 8. Ingestion Architecture

Data enters Arc AI via two paths: **webhooks** (near real-time) and **polling sync** (correctness + backfill).

### 8.1 Webhook ingestion

All webhooks hit `/api/webhooks/:source` and go through this pipeline:

```
POST /api/webhooks/github
  1. Verify HMAC-SHA256 signature (X-Hub-Signature-256)
  2. Check idempotency: lookup (source, delivery_id) in webhook_deliveries
  3. If duplicate: return 200 (acknowledge, discard)
  4. Persist raw payload to webhook_deliveries (for audit + replay)
  5. Enqueue job: { type: 'process_webhook', source: 'github', deliveryId }
  6. Return 200 immediately (must be fast)

Worker processes job:
  1. Load raw payload from webhook_deliveries
  2. Map to internal model
  3. Upsert affected entity in DB (pull_requests, work_items, etc.)
  4. Record status events (transitions)
  5. Mark webhook processed
  6. Optionally trigger: generateInsights job
```

#### Webhook sources and events handled

| Source | Events |
|---|---|
| GitHub | pull_request (opened/edited/closed/merged), pull_request_review (submitted), check_run (completed) |
| Jira | jira:issue_updated, jira:issue_created, comment_created |
| GitHub Actions | workflow_run (completed), check_run (completed/rerequested) |
| Jenkins | Build notification plugin: onStarted, onCompleted, onFailure |
| ArgoCD | Application sync status, health status (via webhook receiver) |

### 8.2 Polling sync

Polling ensures correctness: webhooks can miss events, and polling provides backfill on initial setup.

#### Polling strategies per source

**Jira**
- Incremental: `GET /rest/api/3/search?jql=updatedDate >= "{cursor}" ORDER BY updated ASC`
- Page through with `startAt` + `maxResults`
- Cursor: last `updated` timestamp stored in `integration_cursors`
- Schedule: every 5 minutes (configurable)
- Nightly: full scan of key fields for data consistency check

**GitHub PRs**
- `GET /repos/:owner/:repo/pulls?state=all&sort=updated&direction=desc&since={cursor}`
- Also: `GET /repos/:owner/:repo/events?per_page=100` for review events
- Cursor: `since` = last synced `updated_at`
- Schedule: every 5 minutes

**GitHub Actions**
- `GET /repos/:owner/:repo/actions/runs?created=>={cursor}`
- `GET /repos/:owner/:repo/actions/runs/:run_id/jobs` for job details
- Schedule: every 10 minutes

**Jenkins**
- `GET {baseUrl}/api/json?tree=jobs[name,lastBuild[number,url,result,timestamp,duration]]`
- For each job with a new build number: fetch full build details
- Cursor: last build number per job stored in `integration_cursors`
- Schedule: every 10 minutes

**ArgoCD**
- `GET {baseUrl}/api/v1/applications?fields=items.metadata.name,items.status.sync,items.status.health`
- For each app: `GET /api/v1/applications/:name/resource-tree` if needed
- `GET /api/v1/applications/:name/events` for history
- Schedule: every 10 minutes

#### Sync cursor management

```sql
integration_cursors(
  tenant_id, integration_id, cursor_type, cursor_value, updated_at
)
```

Examples:
- `cursor_type = 'jira_issues_updated_at'`, `cursor_value = '2026-03-07T12:00:00Z'`
- `cursor_type = 'github_pr_repo_myrepo'`, `cursor_value = '2026-03-07T12:00:00Z'`
- `cursor_type = 'jenkins_job_build_pipeline_main'`, `cursor_value = '1452'`

---

## 9. Worker / Background Jobs Architecture

The worker is a separate Node.js process (`node dist/worker/index.js`) that shares the same codebase and DB.

### Job types

| Job | Trigger | Schedule |
|---|---|---|
| `sync_jira` | Scheduler | Every 5 min |
| `sync_github_prs` | Scheduler | Every 5 min |
| `sync_github_actions` | Scheduler | Every 10 min |
| `sync_jenkins` | Scheduler | Every 10 min |
| `sync_argocd` | Scheduler | Every 10 min |
| `process_webhook` | Webhook enqueue | Immediate |
| `rollup_metrics` | Scheduler | Every 30 min |
| `generate_insights` | Post-sync / Scheduler | Every 60 min |
| `summarize_insight_llm` | Post-generate_insights | Triggered by parent |
| `nightly_repair` | Scheduler | Daily 2am UTC |

### Queue design (BullMQ)

- **Queues**: `sync`, `webhooks`, `analytics`, `llm`
- Separate queues allow rate limiting LLM jobs without blocking sync jobs
- Retry strategy:
  - `sync` jobs: 3 retries, exponential backoff
  - `webhooks` jobs: 5 retries, fast
  - `llm` jobs: 2 retries, long backoff (avoid hammering LLM API)

### Metrics rollup pipeline

After each sync:
1. Compute daily KPIs from raw entities:
   - Cycle time (per story): `done_at - started_at`
   - PR age (open PRs): `now - created_at`
   - PR merge rate: `merged_count / total_prs` for the period
   - Deployment frequency + MTTR
   - Story refinement rate: `refined_count / total_count`
   - Velocity: story points completed per sprint/week
2. Insert/upsert into `metric_series(tenant_id, project_ref, metric_name, ts, value, dimensions_json)`
3. Dashboard API reads only from `metric_series` (fast, pre-aggregated)

---

## 10. Data Model (Postgres)

### 10.1 Auth & tenancy tables

```sql
-- Tenants
tenants(id uuid PK, slug text UNIQUE, name text, created_at timestamptz)

-- Users (identity, no passwords)
users(id uuid PK, email citext UNIQUE, name text, avatar_url text, created_at timestamptz)

-- Membership
tenant_memberships(tenant_id, user_id, role tenant_role, created_at)  -- PK: (tenant_id, user_id)

-- OAuth (one user can connect Google + GitHub)
oauth_accounts(id, user_id, provider, provider_user_id, access_token_enc, refresh_token_enc, expires_at)
  -- UNIQUE(provider, provider_user_id)

-- Invitations
tenant_invitations(id, tenant_id, email, role, token_hash UNIQUE, invited_by_user_id, expires_at, accepted_at)

-- Sessions (if DB-backed)
sessions(id text PK, user_id, active_tenant_id, data jsonb, expires_at)
```

### 10.2 Integration configuration tables

```sql
-- One row per connected tool per tenant
integrations(
  id uuid PK, tenant_id, type text, -- 'jira'|'github'|'github_actions'|'jenkins'|'argocd'
  name text, config_json jsonb,
  secrets_enc text,                  -- AES-256-GCM encrypted JSON
  status text,                       -- 'active'|'error'|'disconnected'
  last_sync_at timestamptz, created_at
)

-- Incremental sync cursors
integration_cursors(
  id uuid PK, tenant_id, integration_id,
  cursor_type text, cursor_value text, updated_at
)  -- UNIQUE(tenant_id, integration_id, cursor_type)

-- Raw webhook delivery log (idempotency + audit + replay)
webhook_deliveries(
  id uuid PK, tenant_id, source text, delivery_id text,
  payload jsonb, processed_at timestamptz, created_at
)  -- UNIQUE(source, delivery_id)
```

### 10.3 Execution entities (Jira, GitHub, CI/CD)

```sql
-- Jira-sourced (also maps to epics/tasks/bugs)
work_items(
  id uuid PK, tenant_id, integration_id,
  external_id text, key text,
  type text,    -- 'epic'|'story'|'task'|'defect'
  title text, description text,
  status text, priority text, story_points numeric,
  assignee_external_id text, reporter_external_id text,
  project_key text, epic_key text,  -- hierarchy
  started_date timestamptz, completed_date timestamptz,
  created_at timestamptz, updated_at timestamptz,
  raw_json jsonb  -- original payload for fields we don't normalize
)

-- Status history (enables cycle time, time-in-status analytics)
work_item_status_events(
  id uuid PK, tenant_id, work_item_id,
  from_status text, to_status text, changed_at timestamptz,
  changed_by_external_id text
)

-- GitHub repos
repos(
  id uuid PK, tenant_id, integration_id,
  owner text, name text, full_name text, external_id text, default_branch text
)

-- Pull requests
pull_requests(
  id uuid PK, tenant_id, repo_id,
  number int, title text, body text,
  author_external_id text,
  status text,   -- 'draft'|'open'|'under-review'|'merged'|'closed'
  base_branch text, head_branch text, head_sha text,
  lines_added int, lines_removed int, files_changed int,
  has_conflicts boolean,
  opened_at timestamptz, updated_at timestamptz, merged_at timestamptz, closed_at timestamptz,
  days_open int  -- computed, updated by worker
)

-- PR review activity
pull_request_reviews(
  id uuid PK, tenant_id, pr_id,
  reviewer_external_id text, state text,  -- 'approved'|'changes_requested'|'commented'
  submitted_at timestamptz
)

-- Generalized CI/CD build runs (GitHub Actions, Jenkins)
build_runs(
  id uuid PK, tenant_id, integration_id,
  source text,  -- 'github_actions'|'jenkins'
  external_id text,
  repo_id uuid, pr_id uuid,
  name text, status text,  -- 'success'|'failure'|'running'|'cancelled'
  started_at timestamptz, finished_at timestamptz,
  duration_seconds int, url text,
  branch text, commit_sha text,
  metadata_json jsonb
)

-- Deployments (GitHub Actions, ArgoCD, Jenkins deploy jobs)
deployments(
  id uuid PK, tenant_id, integration_id,
  source text,  -- 'argocd'|'github_actions'|'jenkins'
  external_id text,
  environment text,  -- 'dev'|'qa'|'uat'|'prod'
  service text, version text, commit_sha text,
  status text,  -- 'success'|'failed'|'running'|'rolled-back'
  started_at timestamptz, finished_at timestamptz,
  duration_seconds int, url text,
  metadata_json jsonb
)
```

### 10.4 Analytics & insight tables

```sql
-- Pre-computed time-series metrics (fast dashboard queries)
metric_series(
  id uuid PK, tenant_id,
  project_ref text,  -- project key or '*' for global
  metric_name text,  -- 'cycle_time_p50'|'deployment_frequency'|'pr_age_avg'|...
  ts timestamptz,    -- bucketed to day or week
  value numeric,
  dimensions_json jsonb  -- e.g. { env: 'prod', team: 'platform' }
)  -- INDEX on (tenant_id, metric_name, ts)

-- Insights: bottlenecks, recommendations, guardrails
insights(
  id uuid PK, tenant_id,
  type text,      -- 'bottleneck'|'recommendation'|'guardrail'
  severity text,  -- 'critical'|'high'|'medium'|'low'
  status text,    -- 'open'|'acknowledged'|'resolved'
  title text,
  summary text,   -- LLM-generated human-readable summary
  evidence_json jsonb,  -- structured data used to produce this insight
  created_at timestamptz, updated_at timestamptz
)

-- Audit log (all significant actions)
audit_events(
  id uuid PK, tenant_id,
  actor_user_id uuid,
  action text,  -- 'invite.sent'|'integration.connected'|'insight.acknowledged'|...
  target_type text, target_id text,
  metadata_json jsonb,
  created_at timestamptz
)

-- LLM run tracking (cost + performance monitoring)
llm_runs(
  id uuid PK, tenant_id,
  purpose text,      -- 'insight_summary'|'bottleneck_analysis'|...
  input_hash text,   -- SHA-256 of prompt input (cache key)
  model text,        -- 'gpt-4o'|'claude-3-5-sonnet'|...
  status text,       -- 'queued'|'running'|'succeeded'|'failed'
  prompt text,
  response text,
  tokens_in int, tokens_out int,
  cost_usd numeric(10,6),
  duration_ms int,
  created_at timestamptz
)

-- Links insight → llm_run (many-to-many, some insights have multiple LLM runs)
insight_llm_links(insight_id uuid, llm_run_id uuid, PRIMARY KEY (insight_id, llm_run_id))
```

### 10.5 Key indexes

```sql
CREATE INDEX ON work_items (tenant_id, status);
CREATE INDEX ON work_items (tenant_id, project_key);
CREATE INDEX ON work_item_status_events (tenant_id, work_item_id, changed_at);
CREATE INDEX ON pull_requests (tenant_id, status, opened_at);
CREATE INDEX ON pull_requests (tenant_id, repo_id);
CREATE INDEX ON deployments (tenant_id, environment, started_at);
CREATE INDEX ON build_runs (tenant_id, status, started_at);
CREATE INDEX ON metric_series (tenant_id, metric_name, ts);
CREATE INDEX ON insights (tenant_id, type, status, created_at);
CREATE INDEX ON llm_runs (tenant_id, input_hash);  -- cache hit check
CREATE INDEX ON audit_events (tenant_id, created_at);
```

---

## 11. API Contracts

### Base

All endpoints:
- Require authentication (`express-session`)
- Are scoped to the `activeTenantId` from the session (no tenant param needed in URL for most)
- Return `401` if unauthenticated, `403` if unauthorized within tenant

### Auth endpoints

```
GET  /api/auth/google/start?returnTo=/
GET  /api/auth/google/callback
GET  /api/auth/github/start?returnTo=/
GET  /api/auth/github/callback
POST /api/auth/logout
```

### Identity + tenant

```
GET  /api/me
     → { user, memberships[], activeTenant }

POST /api/session/tenant
     → { tenantSlug: "acme" }
     ← { activeTenant }

GET  /api/tenants
     ← [{ id, slug, name, role }]

POST /api/tenants
     → { name, slug }
     ← { tenant, membership }

POST /api/tenants/:id/invitations
     → { email, role }
     ← { invitation }

POST /api/invitations/accept
     → { token }
     ← { accepted, tenant, role }
```

### Integrations

```
GET    /api/integrations
       ← [{ id, type, name, status, lastSyncAt }]

POST   /api/integrations/jira/connect
       → { baseUrl, email, apiToken }
       ← { integration }

POST   /api/integrations/github/connect
       → { installationId }         ← GitHub App
       ← { integration }

POST   /api/integrations/jenkins/connect
       → { baseUrl, username, apiToken }
       ← { integration }

POST   /api/integrations/argocd/connect
       → { baseUrl, token }
       ← { integration }

DELETE /api/integrations/:id

POST   /api/sync/run
       → { integrationId? }         ← omit to sync all
       ← { jobIds[] }

GET    /api/sync/status
       ← [{ integrationId, lastSync, status, nextSync }]
```

### Dashboard + analytics

```
GET /api/dashboard/summary?projectRef=...
    ← {
        stories: { total, refined, inProgress, blocked, refinementRate },
        pullRequests: { total, open, stale, avgAgeDays, mergeRate },
        deployments: { successRate, failedCount, environments: { dev, qa, uat, prod } },
        insights: { criticalCount, bottleneckCount, openRecommendations }
      }

GET /api/dashboard/trends?metric=cycle_time&range=90d&projectRef=...
    ← { series: [{ ts, value }], unit, metricName }

GET /api/work-items?type=story&status=in-progress&limit=50&cursor=...
    ← { items[], total, nextCursor }

GET /api/pull-requests?status=open&sort=age&limit=50
    ← { prs[], total, nextCursor }

GET /api/deployments?env=prod&status=failed&limit=20
    ← { deployments[], total, nextCursor }

GET /api/insights?type=bottleneck&status=open&severity=high
    ← { insights[], total }

PATCH /api/insights/:id
      → { status: "acknowledged" }
```

---

## 12. LLM Intelligence Pipeline

### Principles

1. **LLM calls are always async** — UI never waits on LLM, it reads from `insights` table
2. **Evidence first** — build a structured JSON evidence pack before calling LLM
3. **Cache by input hash** — same evidence = same summary, don't re-run
4. **Tenant boundary** — never mix data from two tenants in one prompt
5. **Redact secrets** — strip tokens, keys, and URLs with embedded credentials from all prompts

### Pipeline stages

```
Stage 1: Insight detection (rules engine)
  Worker: generateInsights job
  - Run deterministic heuristics against DB:
    - PR stale > 7 days for multiple PRs → bottleneck
    - Cycle time increased > 30% vs 30-day baseline → bottleneck
    - WIP > configured threshold → bottleneck
    - Deployment failure spike → guardrail
    - Test pass rate drop → guardrail
    - Low refinement rate → recommendation
    - Story blocked > 5 days → bottleneck
  - Create/update insight rows (status='open', summary=null initially)
  - Enqueue: summarize_insight_llm job for each new/updated insight

Stage 2: LLM summarization (async)
  Worker: summarize_insight_llm job
  - Load insight + evidence from DB
  - Check input_hash in llm_runs → cache hit? use existing summary, skip LLM
  - Build evidence pack:
    {
      insightType: "bottleneck",
      metric: "cycle_time_p50",
      currentValue: 14.2,
      baselineValue: 9.1,
      delta: "+56%",
      timeRange: "last 30 days",
      affectedItems: [
        { key: "PROJ-123", title: "...", daysInStatus: 12, currentStatus: "in-review" },
        ...
      ],
      relatedPRs: [{ number: 142, agedays: 9, reviewers: 0, checkStatus: "failed" }],
      relatedDeployments: [...]
    }
  - Construct prompt:
    "You are an engineering intelligence assistant for a software delivery team.
     Below is structured execution data. Summarize in 2-3 sentences why this
     bottleneck is occurring, and suggest one or two concrete actions the team
     can take. Be direct, specific, and cite the data. Do not speculate beyond
     what the data shows.
     
     Data: {evidence_pack_json}"
  - Call LLM API (OpenAI / Anthropic)
  - Save: llm_runs row + update insights.summary + link insight_llm_links
  - Mark job complete

Stage 3: UI consumption
  GET /api/insights → returns insights with summary field populated
  SPA renders summary alongside evidence data
```

### Cost controls

| Control | Implementation |
|---|---|
| Input hash cache | Only call LLM if evidence has changed |
| Max LLM calls per tenant per day | Configurable limit (default: 100), enforced in job scheduler |
| On-demand mode | Insight card has "Generate AI summary" button → manual trigger only |
| Model selection | Use smaller model for low-severity insights (GPT-4o-mini vs GPT-4o) |
| Prompt token budget | Truncate evidence pack to fit context window with a summarizer preprocessor |

---

## 13. Security Model

### Transport
- All traffic over TLS (Let's Encrypt wildcard `*.arcai.com`)
- HSTS enabled in Nginx

### Auth security
- OAuth `state` parameter for CSRF (verified on callback)
- PKCE (`code_verifier` / `code_challenge`) for all OAuth flows
- Cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax`, `Domain=.arcai.com`
- Session IDs are random UUIDs (not JWTs — avoid token leakage)
- Sessions expire after configurable TTL (default: 24h)

### Tenant data isolation
- RLS policies on all tenant-scoped tables (hard DB-level guarantee)
- App layer also scopes all queries explicitly (defense in depth)
- Audit events logged for all sensitive actions

### Integration secrets
- Tokens stored encrypted (AES-256-GCM) in `integrations.secrets_enc`
- Encryption key sourced from env var `SECRETS_KEY` (never stored in DB)
- Key rotation: re-encrypt all secrets with new key + update env var

### Webhook security
- GitHub: verify `X-Hub-Signature-256` HMAC with per-integration webhook secret
- Jira: verify shared secret header
- Jenkins: configurable HMAC or IP allowlist
- ArgoCD: verify shared secret
- All webhooks: dedupe via `(source, delivery_id)` idempotency check

### LLM security
- Prompts never include integration tokens, OAuth tokens, passwords, or raw secrets
- Evidence packs are sanitized before insertion into prompts
- LLM provider API keys stored in env vars, never in DB

### Audit logging
All of the following are written to `audit_events`:
- User login / logout
- Tenant creation
- Invitation sent / accepted / rejected
- Integration connected / disconnected
- Manual sync triggered
- Insight status changed (acknowledged / resolved)
- Member role changed
- Member removed

---

## 14. Local Development Setup

### Prerequisites
- Node.js 20+
- Docker Desktop (for Postgres + Redis)
- `pnpm` or `npm`

### docker-compose.yml (local)

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: arcai_dev
      POSTGRES_USER: arcai
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### Environment variables

```bash
# .env (server)
DATABASE_URL=postgresql://arcai:devpassword@localhost:5432/arcai_dev
REDIS_URL=redis://localhost:6379
SESSION_SECRET=<random 64 char hex>
SECRETS_KEY=<random 32 bytes base64>    # for encrypting integration tokens

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://acme.lvh.me:3000/api/auth/google/callback

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://acme.lvh.me:3000/api/auth/github/callback

OPENAI_API_KEY=...        # or ANTHROPIC_API_KEY
LLM_MODEL=gpt-4o-mini     # or claude-3-5-haiku

FRONTEND_URL=http://acme.lvh.me:5173
APP_BASE_DOMAIN=lvh.me
```

### Running locally

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Run DB migrations
npx prisma migrate dev

# 3. Start API server
npm run dev:api          # nodemon watching server/src

# 4. Start worker (separate terminal)
npm run dev:worker

# 5. Start frontend (separate terminal)
npm run dev              # Vite on port 5173

# Access: http://acme.lvh.me:5173
```

---

## 15. Migration Path from Mock Data

Migrate incrementally: each page continues to work throughout.

### Step 1: Add API client layer (no UI change yet)

Create `src/app/api/client.ts` and per-domain API files. Keep `mockData.ts` importing as-is.

### Step 2: Add auth gate and login page

- Add `GET /api/me` endpoint
- Add `<AuthGuard>` wrapper (falls back to mock data if auth disabled via flag)
- Add `/login` page (behind feature flag initially)

### Step 3: Implement backend endpoints (return mock shapes at first)

Implement endpoints that return the same JSON shapes the UI currently uses (just served from the API instead of in-memory). This lets you wire up the UI without real data yet.

### Step 4: Wire up one page at a time

Suggested order (least complex → most complex):
1. `Deployments.tsx` — replace `mockDeployments` with `useDeployments()`
2. `PullRequests.tsx` — replace `mockPullRequests` with `usePullRequests()`
3. `Stories.tsx` — replace `mockUserStories` with `useWorkItems()`
4. `Dashboard.tsx` — replace all mock imports with `useDashboardSummary()` + `useTrends()`
5. `Planning.tsx`, `Bottlenecks.tsx`, `Guardrails.tsx`, `Recommendations.tsx`

### Step 5: Add real integrations (connect first Jira + GitHub)

- Admin user connects Jira + GitHub via `/preferences` page (Integrations tab)
- Manual sync to populate DB
- Watch dashboards fill with real data

### Step 6: Enable LLM insights

- Configure LLM API key in preferences
- Worker begins generating LLM summaries
- Insight pages show AI-generated content

---

## 16. Architecture Constraints & Future Scale-out

### Current constraints (single-node)
- Postgres is both OLTP (entities) and light analytics (metric_series): OK for 5–50 tenants
- Worker runs on same host as API: CPU spike in worker can affect API latency (mitigate with CPU limits)
- Redis is a single point of failure for the job queue (mitigate: pg-boss fallback, or Redis Sentinel)

### When to scale out
| Signal | Action |
|---|---|
| API response times increasing | Move worker to a second VM |
| Metric query latency > 200ms | Add a dedicated analytics DB or TimescaleDB |
| > 50 active tenants | Connection pooling (PgBouncer) |
| > 200 tenants | Read replica for analytics queries |
| LLM cost / latency concern | Add a dedicated LLM queue with separate rate limits |
| Webhook volume spikes | Dedicate a lightweight webhook receiver process |

### Potential next additions (not in scope of v1)
- **Slack / Teams notifications**: alerts on critical insights
- **SAML/SCIM**: enterprise SSO + auto-provisioning
- **Custom dashboards**: drag-and-drop metric composition
- **Goal tracking (OKRs)**: link engineering metrics to business outcomes
- **Predictive risk scoring**: ML model on top of metric_series
