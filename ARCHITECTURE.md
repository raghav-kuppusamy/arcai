# Arc AI — Solution Architecture

**Version**: 2.0  
**Date**: March 2026  
**Deployment model**: Cloud-native · Kubernetes (GKE/EKS) · multi-region active-passive  
**Tenancy model**: Multi-tenant SaaS · subdomain routing · Postgres RLS · per-tenant LLM context  
**Auth**: OIDC/OAuth2 (Google, GitHub, Okta, Azure AD) · SAML 2.0 · SCIM provisioning · PKCE  
**Integrations**: Jira Cloud/DC · GitHub (REST + GraphQL + App) · GitHub Actions · Jenkins · ArgoCD  
**Intelligence**: Five domain-specific AI agents backed by GPT-4o · heuristic rules engine · semantic evidence packs  

---

## Table of Contents

1. [System Overview & Intelligence Domains](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Deployment Topology](#3-deployment-topology)
4. [Multi-tenancy Model](#4-multi-tenancy-model)
5. [Authentication & Auth Flows](#5-authentication--auth-flows)
6. [Integration Architecture](#6-integration-architecture)
7. [Ingestion Pipeline](#7-ingestion-pipeline)
8. [Five Intelligence Domains](#8-five-intelligence-domains)
9. [LLM Intelligence Pipeline](#9-llm-intelligence-pipeline)
10. [Worker / Background Jobs](#10-worker--background-jobs)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Backend API Architecture](#12-backend-api-architecture)
13. [Data Model (Postgres)](#13-data-model-postgres)
14. [Security Model](#14-security-model)
15. [Local Development Setup](#15-local-development-setup)
16. [Migration Path from Mock Data](#16-migration-path-from-mock-data)
17. [Scale-out Roadmap](#17-scale-out-roadmap)

---

## 1. System Overview

Arc AI is a **multi-tenant Project Intelligence Platform** that continuously ingests engineering execution signals from Jira, GitHub, GitHub Actions, Jenkins, and ArgoCD, and surfaces five domain-specific AI agents that diagnose delivery risk, surface bottlenecks, and generate prioritised remediation plans — in real time.

### The Five Intelligence Domains

Each domain is a self-contained AI agent that owns its own evidence collection, rules engine, LLM summarisation pipeline, and UI surface:

| Domain | Agent Name | Primary Signal Sources | Core Output |
|---|---|---|---|
| **Planning Intelligence** | `PlanningAgent` | Jira epics, milestones, change requests, sign-offs | Schedule risk score · milestone drift forecast · change-request impact analysis |
| **Story Intelligence** | `StoryAgent` | Jira stories, sprint velocity, WIP, blockers | Velocity prediction · refinement alerts · blocker escalation · completion forecast |
| **Guardrails Intelligence** | `GuardrailsAgent` | ESLint, SonarQube, Fortify, test coverage, security scans | Quality gate status · CVE risk summary · fix-priority ranking |
| **Deployment Intelligence** | `DeploymentAgent` | GitHub Actions runs, ArgoCD sync events, Jenkins builds | DORA metrics · deployment risk score · lead-time breakdown · rollback recommendation |
| **Bottlenecks Intelligence** | `BottleneckAgent` | All sources cross-correlated | Systemic delay identification · root-cause chain · lead-time reduction roadmap |

### Platform capabilities

- **Real-time signal ingestion**: webhook-first with polling fallback for each source
- **Heuristic rules engine**: deterministic detection triggers LLM only when conditions change
- **Evidence-grounded LLM**: each agent builds a typed JSON evidence pack; the LLM adds narrative and prioritisation
- **Actionable outputs**: every insight links back to the source artefact (Jira ticket, PR, build, scan finding)
- **Multi-tenant isolation**: RLS at the Postgres layer guarantees zero cross-tenant data leakage
- **Audit trail**: all AI outputs, evidence packs, and token costs logged per tenant

### What this document covers

End-to-end architecture: cloud deployment, tenancy, auth (OIDC/SAML/SCIM), each integration's ingestion contract, all five intelligence pipelines, data model, API contracts, security model, and migration path from the current mock-data SPA.

---

## 2. Technology Stack

### Frontend

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React 18 + Vite + TypeScript | Existing codebase; fast HMR in dev |
| Styling | TailwindCSS 4 + dark-mode theming | Utility-first; CSS custom variants for dark mode |
| Charts | Recharts | Declarative SVG charts; composable for custom shapes |
| Router | React Router v7 | File-based + layout routes |
| Server state | TanStack Query v5 | Cache, background refetch, pagination, optimistic updates |
| Intelligence UI | Custom AI agent modal pattern | Step-by-step animated agent with evidence display |

### Backend

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Node.js 20 LTS + Express 5 | TypeScript-native; large ecosystem; fast to ship |
| ORM | Prisma 5 | Type-safe schema; migration history; Postgres RLS support |
| Database | PostgreSQL 16 | JSONB, RLS, full-text, `pg_trgm`; time-series via `metric_series` table |
| Queue | BullMQ 5 + Redis 7 | Separate queues per domain; rate-limit LLM jobs independently |
| Auth | `openid-client` + `express-session` + `passport` | Standards-compliant OIDC; supports Google, GitHub, Okta, Azure AD, SAML |
| Secrets | AES-256-GCM + KMS envelope encryption | Per-tenant integration tokens never stored in plaintext |
| LLM | OpenAI GPT-4o (primary) · Anthropic Claude 3.5 Sonnet (fallback) | Per-tenant model config; structured JSON outputs via function calling |
| Embeddings | OpenAI `text-embedding-3-small` | Semantic deduplication of insight evidence packs |
| Vector store | `pgvector` extension on Postgres | Keeps vector search in the same DB; no extra infra |

### Infrastructure

| Layer | Technology | Rationale |
|---|---|---|
| Container orchestration | Kubernetes (GKE or EKS) | Horizontal pod autoscaling; rolling deploys; health probes |
| Container build | Docker multi-stage builds | Separate `api`, `worker`, `migrate` images |
| Ingress | Nginx Ingress Controller + cert-manager | Wildcard TLS (`*.arcai.com`) via Let's Encrypt DNS-01 |
| CDN / static | Cloudflare (SPA assets) | Edge caching; DDoS protection; bot management |
| Secrets management | Kubernetes Secrets + external-secrets-operator → AWS Secrets Manager | Secrets never in Git |
| CI/CD | GitHub Actions | Build → test → Docker push → Helm upgrade |
| Observability | OpenTelemetry → Grafana stack (Tempo · Loki · Prometheus) | Distributed traces; structured logs; metrics |
| Local dev | Docker Compose | Postgres + Redis + optional Nginx |

---

## 3. Deployment Topology

Arc AI runs on **Kubernetes** with an active-passive multi-region setup. The primary region serves all traffic; the secondary region holds a warm standby that can be promoted in under 5 minutes.

### Kubernetes cluster layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Cloudflare (DNS + CDN + WAF)                                               │
│  *.arcai.com  →  Cloudflare Proxy  →  Kubernetes Ingress (primary region)  │
└─────────────────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────▼───────────────────────────────────────────────┐
          │  Kubernetes Cluster — Primary Region (us-east-1 / us-central1) │
          │                                                                 │
          │  ┌──────────────────┐   ┌──────────────────┐                   │
          │  │  Nginx Ingress   │   │  cert-manager     │                   │
          │  │  (wildcard TLS)  │   │  (Let's Encrypt   │                   │
          │  └───────┬──────────┘   │   DNS-01 ACME)    │                   │
          │          │              └──────────────────┘                    │
          │    ┌─────▼──────┐   ┌─────────────┐   ┌───────────────────┐    │
          │    │  API Pods   │   │  Worker Pods │   │  Webhook Receiver │    │
          │    │  (3–10 HPA) │   │  (2–8 HPA)   │   │  Pods (2 fixed)   │    │
          │    └─────┬───────┘   └──────┬───────┘   └────────┬──────────┘    │
          │          │                  │                     │               │
          │    ┌─────▼──────────────────▼─────────────────────▼────────────┐ │
          │    │                  Redis Cluster (BullMQ queues)             │ │
          │    │   sync · webhooks · analytics · llm · planning-agent      │ │
          │    │   story-agent · guardrails-agent · deployment-agent       │ │
          │    │   bottleneck-agent                                         │ │
          │    └──────────────────────────┬─────────────────────────────────┘ │
          │                              │                                   │
          │    ┌─────────────────────────▼─────────────────────────────────┐ │
          │    │  PostgreSQL 16 (Cloud SQL / RDS)  +  pgvector extension   │ │
          │    │  Primary (read-write)  ◀──── replica (read-only analytics) │ │
          │    └───────────────────────────────────────────────────────────┘ │
          │                                                                   │
          └───────────────────────────────────────────────────────────────────┘
                     │ async replication
          ┌──────────▼──────────────────────┐
          │  Standby Region (eu-west-1)     │
          │  Postgres follower (promote on  │
          │  failover), Redis replica       │
          └─────────────────────────────────┘
```

### Workload separation

| Deployment | Replicas | HPA trigger | Purpose |
|---|---|---|---|
| `api` | 3–10 | CPU > 60% | REST API + auth + webhooks |
| `worker-sync` | 2–8 | BullMQ `sync` queue depth | Jira/GitHub/Jenkins/ArgoCD polling |
| `worker-llm` | 1–4 | BullMQ `llm` queue depth | LLM calls (rate-limited independently) |
| `worker-analytics` | 1–3 | BullMQ `analytics` queue depth | Metrics rollup + rules engine |
| `webhook-receiver` | 2 (fixed) | — | Accepts + enqueues inbound webhooks fast |

### Traffic flow

1. Browser resolves `acme.arcai.com` → Cloudflare anycast IP
2. Cloudflare terminates TLS, applies WAF rules, forwards to Nginx Ingress
3. Nginx Ingress extracts subdomain, injects `X-Tenant-Slug: acme`, routes `/api/*` to API pods and everything else serves SPA from Cloudflare edge cache
4. API pod resolves tenant slug → `tenant_id` (Redis-cached, 60 s TTL), verifies session, calls Postgres
5. Heavy work enqueued to BullMQ; Worker pods dequeue and process
6. LLM calls go through a dedicated `llm` queue with per-tenant rate limiting

### Environments

| Environment | Cluster | Database | Notes |
|---|---|---|---|
| `production` | Primary region | Cloud SQL / RDS Multi-AZ | Autoscaled; real LLM API keys |
| `staging` | Same cluster, separate namespace | Separate DB | Mirror of prod; used for QA + demo |
| `preview` | Ephemeral (PR-based) | Shared staging DB (read-only schema) | Auto-created by GitHub Actions on PR |
| `local` | Docker Compose | Postgres container | `*.lvh.me` wildcard for subdomain routing |

---

## 4. Multi-tenancy Model

### Subdomain-based tenant routing

Every tenant gets a dedicated subdomain:
```
acme.arcai.com       → tenant "Acme Inc"      (tenant_id: ten_001)
betacorp.arcai.com   → tenant "Beta Corp"     (tenant_id: ten_002)
```

- **DNS**: wildcard `CNAME *.arcai.com → arcai.com` with Cloudflare proxying
- **Ingress**: Nginx regex capture `~^(?<tenant>[a-z0-9-]+)\.arcai\.com$` → sets `X-Tenant-Slug` header
- **API**: `tenantMiddleware` resolves slug → `tenant_id` from Redis (60 s TTL) then DB fallback

### Isolation layers

**Layer 1 — Postgres Row-Level Security (hard boundary)**

Every tenant-scoped table carries `tenant_id uuid NOT NULL`. On each DB transaction the API sets Postgres session variables and RLS policies enforce them automatically:

```sql
-- Set at start of every request transaction
SET LOCAL app.tenant_id = 'ten_uuid_here';
SET LOCAL app.user_id   = 'usr_uuid_here';

-- Policy on every tenant-scoped table (example)
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pull_requests
  USING (tenant_id::text = current_setting('app.tenant_id', true));
```

Even if a bug bypasses the application layer, Postgres will not return another tenant's rows.

**Layer 2 — Application-layer scoping (defence in depth)**

All Prisma queries explicitly include `where: { tenantId }` — the app never relies solely on RLS.

**Layer 3 — LLM context isolation**

Evidence packs sent to the LLM are assembled per-tenant from that tenant's DB rows only. The LLM job picks up only one tenant's evidence pack per call. No batching across tenants. Prompt construction explicitly asserts:

```
System: "You are analysing data for tenant '{tenantName}' only. 
         Do not reference, infer, or speculate about any other organisation."
```

**Layer 4 — Redis key namespacing**

All cache keys are prefixed with `ten:{tenant_id}:` — no shared keys between tenants.

### Per-tenant configuration

Each tenant has a `tenant_config` JSONB column controlling:

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4o",
    "dailyTokenBudget": 500000,
    "insightGenerationMode": "automatic"
  },
  "intelligenceAgents": {
    "planning": true,
    "story": true,
    "guardrails": true,
    "deployment": true,
    "bottleneck": true
  },
  "integrations": {
    "jira": { "projectKeys": ["PROJ", "ARCH"] },
    "github": { "repos": ["org/api", "org/frontend"] }
  },
  "notifications": {
    "slack": { "webhookUrl": "<encrypted>", "channel": "#arc-alerts" }
  }
}
```

### Session and cookie scope

```
Cookie: Domain=.arcai.com; HttpOnly; Secure; SameSite=Lax
Session (server-side, Redis-backed):
{
  userId: "usr_123",
  activeTenantId: "ten_456",
  roles: { "ten_456": "admin" }
}
```

Switching tenants: `POST /api/session/tenant` → server updates `activeTenantId` → browser redirects to new subdomain.

---

## 5. Authentication & Auth Flows

### Supported identity providers

| Provider | Protocol | Use case |
|---|---|---|
| Google Workspace | OIDC (OAuth 2.0) | Corporate teams on GSuite |
| GitHub | OAuth 2.0 | Engineering-first sign-in |
| Okta | OIDC / SAML 2.0 | Enterprise SSO |
| Azure Active Directory | OIDC / SAML 2.0 | Microsoft enterprise tenants |
| Invite-based | Token + OAuth | New users without SSO |

### Auth library stack

- **`openid-client`**: standards-compliant OIDC Discovery, PKCE, token refresh
- **`passport`** with strategy adapters for GitHub and SAML
- **`express-session`** backed by **Redis** (TTL-based expiry, cross-pod consistency)
- SCIM 2.0 endpoint for enterprise auto-provisioning from Okta / Azure AD

### Security defaults for all flows

- **PKCE** (`S256` code challenge) on every OAuth 2.0 flow — prevents authorisation code interception
- **`state` parameter** generated per-request (CSRF protection)
- **Nonce** included in OIDC `id_token` validation
- Sessions use **random UUIDs** (not JWTs — avoids token leakage and signature algorithm confusion)
- Cookie flags: `HttpOnly; Secure; SameSite=Lax; Domain=.arcai.com`

### Flow 1 — First-time OIDC login

```
Browser → GET /api/auth/google/start?returnTo=/dashboard
  └── Generate code_verifier + code_challenge (PKCE S256)
  └── Generate state (CSRF nonce, stored in Redis keyed to session)
  └── Redirect to Google: ?response_type=code&scope=openid+email+profile
                         &code_challenge=...&state=...

Google → GET /api/auth/google/callback?code=...&state=...
  └── Verify state (match Redis entry, then delete it)
  └── Exchange code for tokens (PKCE code_verifier included)
  └── Validate id_token: signature, iss, aud, exp, nonce
  └── Upsert users (email) + oauth_accounts
  └── No tenant membership found
  └── Create session (userId, activeTenantId=null)
  └── Redirect → /create-tenant or /select-tenant
```

### Flow 2 — Returning user, single tenant

```
Callback
  └── User + membership found
  └── Session: { userId, activeTenantId: "ten_123", role: "member" }
  └── Redirect → returnTo (e.g. /dashboard)
```

### Flow 3 — Returning user, multiple tenants

```
Callback → multiple memberships found
  └── Session: { userId, activeTenantId: null }
  └── Redirect → /select-tenant
/select-tenant → GET /api/me → memberships[]
  └── User selects "Acme Inc"
  └── POST /api/session/tenant { tenantSlug: "acme" }
  └── Server: validate membership, update session activeTenantId
  └── Redirect → acme.arcai.com/
```

### Flow 4 — SAML 2.0 Enterprise SSO (Okta / Azure AD)

```
Browser → GET /api/auth/saml/acme/start
  └── Generate RelayState (CSRF)
  └── Build SAML AuthnRequest (signed with Arc AI SP cert)
  └── Redirect to IdP SSO URL (configured per-tenant in integrations table)

IdP → POST /api/auth/saml/acme/callback
  └── Parse + validate SAMLResponse: signature, IssueInstant, Conditions
  └── Extract NameID (email) + attributes (groups, displayName)
  └── Upsert user + provision tenant membership (if SCIM not enabled)
  └── Create session → redirect to tenant subdomain
```

### Flow 5 — Invite-based onboarding

```
Admin → POST /api/tenants/:id/invitations { email, role }
  └── Store invitation: { tokenHash, email, role, expiresAt: +7d }
  └── Send email: https://arcai.com/invite/<raw-token>

New user clicks link
  └── SPA stores invite token in sessionStorage
  └── Detects unauthenticated → /login (preserves invite token)
  └── OAuth/OIDC flow runs
  └── Callback: detect pending invite
  └── POST /api/invitations/accept { token }
      └── Validate token, expiry, email match
      └── Create tenant_memberships
      └── Set activeTenantId → redirect to tenant subdomain
```

### SCIM 2.0 auto-provisioning

Enterprise IdPs (Okta, Azure AD) can provision/deprovision users automatically:

```
POST /scim/v2/Users          → create user + tenant membership
PATCH /scim/v2/Users/:id     → update role or deactivate
DELETE /scim/v2/Users/:id    → remove membership (soft-delete)
GET   /scim/v2/Groups        → return tenant role groups
```

Bearer token for SCIM endpoint is a long-lived tenant-scoped secret (stored encrypted).

### RBAC roles

| Role | Capabilities |
|---|---|
| `owner` | All actions; delete tenant; transfer ownership; manage billing |
| `admin` | Connect/disconnect integrations; invite members; configure agents; manage settings |
| `member` | Read all intelligence; trigger manual syncs; acknowledge insights |
| `viewer` | Read-only access to all dashboards and intelligence outputs |

---

## 6. Integration Architecture

Each integration has three concerns: **connection setup** (credential storage), **real-time ingestion** (webhooks), and **correctness sync** (polling). All five are modelled as `integrations` rows in Postgres with encrypted secrets.

### 6.1 Jira (Cloud & Data Center)

**Connection**: API Token + base URL + email (Cloud) or PAT (Data Center)  
**Auth**: HTTP Basic (`email:token`) for Cloud; Bearer token for DC  
**Intelligence consumers**: Planning Agent (epics, milestones, change requests), Story Agent (stories, WIP, blockers, sprint data)

| Signal | API endpoint | Schedule |
|---|---|---|
| Stories & epics | `GET /rest/api/3/search?jql=updatedDate >= "{cursor}"` | Every 5 min |
| Sprint data | `GET /rest/agile/1.0/board/:id/sprint?state=active,future` | Every 15 min |
| Issue history | `GET /rest/api/3/issue/:key/changelog` | Post-create/update |
| Transitions | Webhook: `jira:issue_updated` | Real-time |

**Webhook events**: `jira:issue_created`, `jira:issue_updated`, `jira:version_released`, `comment_created`  
**Webhook verification**: shared secret header `X-Atlassian-Token`  
**Key fields extracted**: `status`, `priority`, `story_points`, `assignee`, `sprint`, `labels`, `epic_link`, `blocked_by`, `status_category_change_date`

### 6.2 GitHub (REST + GraphQL + GitHub App)

**Connection**: GitHub App installation (preferred) or PAT  
**GitHub App** provides per-repo fine-grained permissions; installation webhook delivers all events  
**Intelligence consumers**: Story Agent (PR linking), Guardrails Agent (check runs, code scan), Deployment Agent (Actions runs), Bottleneck Agent (PR aging, review latency)

| Signal | API | Schedule |
|---|---|---|
| Pull requests | `GET /repos/:owner/:repo/pulls?state=all&sort=updated&since={cursor}` | Every 5 min |
| PR reviews | `GET /pulls/:number/reviews` + webhook | Real-time |
| PR review comments | `GET /pulls/:number/comments` | Post-PR sync |
| Repo code scanning | `GET /repos/:owner/:repo/code-scanning/alerts` | Every 30 min |
| Dependabot alerts | `GET /repos/:owner/:repo/dependabot/alerts` | Every 30 min |

**Webhook events**: `pull_request.*`, `pull_request_review.*`, `check_run.completed`, `check_suite.completed`, `code_scanning_alert.*`, `dependabot_alert.*`  
**Webhook verification**: `X-Hub-Signature-256` HMAC-SHA256

### 6.3 GitHub Actions

**Connection**: same GitHub App installation as GitHub  
**Intelligence consumers**: Deployment Agent (workflow outcomes, build duration, flaky jobs), Guardrails Agent (test reports, coverage)

| Signal | API | Schedule |
|---|---|---|
| Workflow runs | `GET /repos/:owner/:repo/actions/runs?created>={cursor}` | Every 10 min |
| Run jobs | `GET /actions/runs/:run_id/jobs` | Post-run |
| Run artifacts | `GET /actions/runs/:run_id/artifacts` | Post-run (selective) |
| Annotations | `GET /check-runs/:check_run_id/annotations` | Post-run |

**Webhook events**: `workflow_run.completed`, `workflow_job.completed`  
**Key metrics extracted**: `duration_seconds`, `conclusion` (`success/failure/cancelled`), `head_sha`, `head_branch`, job-level failure breakdown

### 6.4 Jenkins

**Connection**: base URL + username + API token  
**Auth**: HTTP Basic  
**Intelligence consumers**: Deployment Agent (build outcomes, deploy jobs), Guardrails Agent (test reports via JUnit XML)

| Signal | API | Schedule |
|---|---|---|
| Job list + last build | `GET /api/json?tree=jobs[name,lastBuild[number,result,timestamp,duration,url]]` | Every 10 min |
| Full build detail | `GET /job/:name/:number/api/json` | When new build detected |
| Test report | `GET /job/:name/:number/testReport/api/json` | Post-build |
| Console log (summary) | `GET /job/:name/:number/logText/progressiveText?start=0` | On failure only |

**Inbound notifications**: Jenkins Notification Plugin → `POST /api/webhooks/jenkins`  
**Webhook body**: `{ name, url, build: { number, phase, status, url, scm } }`  
**Cursor**: last `build.number` per job stored in `integration_cursors`

### 6.5 ArgoCD

**Connection**: base URL + bearer token (service account with `applications, get` RBAC)  
**Intelligence consumers**: Deployment Agent (GitOps sync status, health, rollbacks), Bottleneck Agent (failed syncs blocking delivery)

| Signal | API | Schedule |
|---|---|---|
| Application list | `GET /api/v1/applications?fields=metadata,status.sync,status.health` | Every 10 min |
| Application events | `GET /api/v1/applications/:name/events` | Post-sync |
| Resource tree | `GET /api/v1/applications/:name/resource-tree` | On degraded health |
| Rollout history | `GET /api/v1/applications/:name/rollout/history` | Every 30 min |

**Webhook**: ArgoCD → `POST /api/webhooks/argocd` on sync/health change  
**Webhook verification**: shared secret header `X-ArgoCD-Secret`  
**Key fields**: `sync.status` (`Synced/OutOfSync`), `health.status` (`Healthy/Degraded/Progressing`), `sync.revision` (commit SHA)

---

## 7. Ingestion Pipeline

Two paths: **webhooks** (real-time, <5 s) and **polling** (correctness + backfill).

### 7.1 Webhook path

```
POST /api/webhooks/:source
  1. Verify signature (HMAC-SHA256 per source)
  2. Idempotency: lookup (source, delivery_id) → duplicate? 200 + discard
  3. Persist payload → webhook_deliveries
  4. Enqueue process_webhook job → return 200 in < 20 ms

Worker:
  1. Normalise payload → internal model
  2. Upsert entity (work_item / pull_request / build_run / deployment)
  3. Record status transition → work_item_status_events
  4. Enqueue generate_insights for affected agent
```

### 7.2 Polling schedule

| Source | Cursor type | Interval |
|---|---|---|
| Jira | `JQL updatedDate >= {cursor}` | 5 min |
| GitHub PRs | `?sort=updated&since={cursor}` | 5 min |
| GitHub Actions | `?created>={cursor}` | 10 min |
| Jenkins | last `build.number` per job | 10 min |
| ArgoCD | `sync.revision` per app | 10 min |

---

## 8. Five Intelligence Domains

Each domain: **rules engine → evidence builder → LLM call → insight row → UI**.

### 8.1 Planning Intelligence

**Sources**: Jira epics, milestones, change requests, sprint velocity  
**Detects**: milestone drift · schedule risk · unscheduled approved CRs · sign-off delays  
**LLM outputs**: schedule risk narrative · milestone forecast · CR impact statement

### 8.2 Story Intelligence

**Sources**: Jira stories, sprint state, blockers, cycle-time history, PR links  
**Detects**: velocity < 80% target · stale stories (>5 d, no PR) · blocker not resolved 48 h · refinement rate < 70%  
**LLM outputs**: velocity prediction · completion forecast with % confidence · blocker escalation with owner

### 8.3 Guardrails Intelligence

**Sources**: ESLint, SonarQube, Fortify, Dependabot/code-scanning, test coverage  
**Detects**: quality gate failure on main · new critical CVE · coverage drop > 5% · SAST high-severity unresolved 7 d  
**LLM outputs**: CVE priority ranking · fix-cost estimate · recommended fix sequence

### 8.4 Deployment Intelligence

**Sources**: GitHub Actions runs, ArgoCD sync events, Jenkins builds, deployment records  
**Detects**: 2+ consecutive failures · lead time > 2× baseline · MTTR > 4 h · ArgoCD OutOfSync > 1 h  
**DORA metrics**: Deployment Frequency · Lead Time · Change Failure Rate · MTTR  
**LLM outputs**: deployment risk score · root-cause chain · rollback steps · lead-time bottleneck

### 8.5 Bottlenecks Intelligence

**Sources**: Cross-correlated data from all four agents  
**Detects**: stage cycle time > 5 d backlog / > 3 d review · 3+ stale PRs · sprint predictability < 80% for 2+ sprints · single phase > 40% of lead time  
**LLM outputs**: ranked bottleneck list · root-cause per phase · remediation roadmap with owner + effort + gain

---

## 9. LLM Intelligence Pipeline

### Principles

1. **Always async** — UI reads pre-computed `insights` rows; zero synchronous LLM latency
2. **Evidence first** — typed JSON evidence pack built deterministically before any LLM call
3. **SHA-256 cache** — same evidence → cached summary reused; LLM not re-invoked until evidence changes
4. **Tenant isolation** — one pack per tenant per call; system prompt asserts boundary explicitly
5. **Structured outputs** — OpenAI function calling / `response_format: json_object`
6. **Sanitised** — tokens, credentials, PII stripped before LLM submission

### Pipeline

```
Stage 1 — Rules Engine (per-agent worker)
  generateInsights job → evaluate heuristics → upsert insights rows
  → enqueue agent_llm job per new/changed insight

Stage 2 — Evidence Builder
  Load signals → join cross-domain data → sanitise → SHA-256 hash
  → cache hit? return existing summary (skip LLM)

Stage 3 — LLM Call (worker-llm, rate-limited queue)
  System: "You are {AgentName} for tenant '{tenantName}'. Return JSON:
           { summary, rootCause, actions[{phase,action,effort,gain,owner}], riskLevel }"
  User: JSON.stringify(evidencePack)
  → parse response → update insights.summary + actions_json
  → write llm_runs row (tokens_in, tokens_out, cost_usd, model)

Stage 4 — UI
  GET /api/insights?agent=bottleneck → insights[] with summary + actions_json
  Intelligence Banner + AI Agent Modal render the result
```

### Cost controls

| Control | Detail |
|---|---|
| SHA-256 cache | Skip LLM when evidence unchanged |
| Daily token budget | Per-tenant config (default 500 K); enforced in job scheduler |
| Model tiering | `gpt-4o` for critical/high · `gpt-4o-mini` for medium/low |
| Prompt cap | Evidence truncated to 8 K tokens by `contextPreprocessor` |
| On-demand mode | `insightGenerationMode: "manual"` → LLM runs only on user click |
| Fallback | OpenAI rate-limited → retry Claude 3.5 Sonnet after 30 s |

---

## 10. Worker / Background Jobs

Separate Kubernetes deployments sharing the same codebase and DB.

### Queue topology

| Queue | Worker | Concurrency | Retry |
|---|---|---|---|
| `sync` | `worker-sync` | 10 | 3× exponential |
| `webhooks` | `worker-sync` | 20 | 5× fast |
| `analytics` | `worker-analytics` | 5 | 3× exponential |
| `planning-agent` | `worker-llm` | 2 | 2× long backoff |
| `story-agent` | `worker-llm` | 2 | 2× long backoff |
| `guardrails-agent` | `worker-llm` | 2 | 2× long backoff |
| `deployment-agent` | `worker-llm` | 2 | 2× long backoff |
| `bottleneck-agent` | `worker-llm` | 1 | 2× long backoff |

### Job schedule

| Job | Trigger | Interval |
|---|---|---|
| `sync_jira` | Scheduler | 5 min |
| `sync_github_prs` | Scheduler | 5 min |
| `sync_github_actions` | Scheduler | 10 min |
| `sync_jenkins` | Scheduler | 10 min |
| `sync_argocd` | Scheduler | 10 min |
| `process_webhook` | Inbound | Immediate |
| `rollup_metrics` | Scheduler | 30 min |
| `run_planning_agent` | Post-Jira sync | 60 min |
| `run_story_agent` | Post-Jira sync | 30 min |
| `run_guardrails_agent` | Post check run | 30 min |
| `run_deployment_agent` | Post deploy event | 30 min |
| `run_bottleneck_agent` | Post all-source sync | 60 min |
| `nightly_repair` | Scheduler | Daily 02:00 UTC |

---

## 11. Frontend Architecture

### SPA structure

```
src/
  main.tsx                   ← Vite entry
  app/
    App.tsx                  ← RouterProvider
    routes.tsx               ← createBrowserRouter
    components/
      Layout.tsx             ← sidebar + header (dark-mode toggle, user pill)
      ArcLogo.tsx
    pages/
      Dashboard.tsx          ← KPI cards · sprint velocity · waffle · defect trend
      Planning.tsx           ← Planning Intelligence banner + epics/milestones
      Stories.tsx            ← Story Intelligence banner + Kanban + sprint summary
      PullRequests.tsx       ← PR list + aging indicators + review status
      Deployments.tsx        ← Deployment Intelligence banner + DORA + deploy table
      Bottlenecks.tsx        ← Bottlenecks Intelligence banner + phase + cycle time
      Guardrails.tsx         ← Guardrails Intelligence banner + ESLint/SonarQube/CVEs
      Recommendations.tsx    ← Prioritised AI recommendations
      Settings.tsx           ← Integrations · LLM config · notifications
      Login.tsx              ← OAuth provider buttons
      SelectTenant.tsx       ← Tenant picker
      CreateTenant.tsx       ← First-time setup wizard
      AcceptInvite.tsx       ← /invite/:token
      NotFound.tsx
    data/
      mockData.ts            ← replaced by API hooks in §16
  styles/
    index.css · theme.css · tailwind.css · fonts.css
```

### Intelligence UI pattern (all five domain pages)

1. **Intelligence Banner** (`bg-[#163A5F]`) — AI summary bullets + 2–3 action buttons
2. **AI Agent Modal** — triggered by buttons; 6 animated steps then remediation plan
3. **Evidence Cards** — domain data (phase cards, cycle time chart, deployment table, etc.)

### API client layer

```
src/app/api/
  client.ts        ← fetch wrapper (credentials:'include', 401 interceptor)
  planning.ts      ← useMilestones(), usePlanningInsights()
  stories.ts       ← useWorkItems(), useStoryInsights()
  guardrails.ts    ← useGuardrailsInsights(), useCVEs()
  deployments.ts   ← useDeployments(), useDORA()
  bottlenecks.ts   ← useBottlenecks(), useCycleTime()
  dashboard.ts     ← useDashboardSummary(), useTrends()
  auth.ts          ← useMe(), logout(), switchTenant()
  integrations.ts  ← useIntegrations(), connectJira(), connectGitHub()
```

All hooks: **TanStack Query v5** — stale-time 60 s, background refetch, optimistic updates.

---

## 12. Backend API Architecture

### Folder structure

```
server/src/
  index.ts                    ← Express bootstrap + middleware chain
  config.ts                   ← env vars validated with Zod
  middleware/
    auth.ts                   ← session guard
    tenantContext.ts           ← slug → tenant_id; SET LOCAL app.tenant_id; RLS
    rateLimiter.ts             ← per-tenant sliding window (Redis store)
    requestLogger.ts           ← OpenTelemetry structured logs
    errorHandler.ts
  routes/
    auth.ts                   ← /api/auth/* (OIDC + SAML + GitHub)
    scim.ts                   ← /scim/v2/*
    me.ts · tenants.ts · invitations.ts
    integrations.ts            ← /api/integrations/* (connect/disconnect/sync)
    webhooks.ts                ← /api/webhooks/:source
    dashboard.ts · workItems.ts · pullRequests.ts · deployments.ts
    insights.ts                ← /api/insights?agent=...
  services/
    auth/                     ← oidcStrategy, samlStrategy, sessionManager, inviteService
    integrations/
      jiraClient.ts · githubClient.ts · githubActionsClient.ts
      jenkinsClient.ts · argoCdClient.ts · secretsService.ts
    agents/
      planningAgent.ts · storyAgent.ts · guardrailsAgent.ts
      deploymentAgent.ts · bottleneckAgent.ts
      evidenceBuilder.ts · llmClient.ts · promptTemplates.ts
    analytics/
      dashboardService.ts · metricsService.ts · doraService.ts
  jobs/                       ← BullMQ handlers (shared with worker process)
  db/
    client.ts                 ← Prisma singleton
    migrations/
worker/src/index.ts           ← BullMQ worker bootstrap
```

### Request lifecycle

```
Inbound request
  → requestLogger (OpenTelemetry trace ID)
  → rateLimiter (1000 req/min per tenant, Redis)
  → auth (session cookie → user; 401 if missing)
  → tenantContext (X-Tenant-Slug → tenant_id; RLS SET LOCAL; 403 if not member)
  → Zod validation (400 on schema error)
  → route handler → service → Prisma → Postgres
  → JSON response
```

### Key API surface

```
GET  /api/me
POST /api/session/tenant  { tenantSlug }
POST /api/tenants         { name, slug }
POST /api/tenants/:id/invitations  { email, role }
POST /api/invitations/accept       { token }

GET  /api/integrations
POST /api/integrations/jira/connect    { baseUrl, email, apiToken }
POST /api/integrations/github/connect  { installationId }
POST /api/integrations/jenkins/connect { baseUrl, username, apiToken }
POST /api/integrations/argocd/connect  { baseUrl, token }
DELETE /api/integrations/:id
POST /api/sync/run  { integrationId? }

GET /api/dashboard/summary?projectRef=...
GET /api/dashboard/trends?metric=cycle_time&range=90d
GET /api/work-items?type=story&status=in-progress
GET /api/pull-requests?status=open&sort=age
GET /api/deployments?env=prod&status=failed
GET /api/insights?agent=bottleneck&status=open&severity=high
PATCH /api/insights/:id  { status: "acknowledged" }

GET  /api/auth/google/start · /api/auth/google/callback
GET  /api/auth/github/start · /api/auth/github/callback
POST /api/auth/saml/:tenantSlug/start · callback
POST /api/auth/logout

POST /scim/v2/Users · PATCH · DELETE
```

---

## 13. Data Model (Postgres)

### 13.1 Auth & tenancy

```sql
tenants(id uuid PK, slug text UNIQUE, name text, config_json jsonb, created_at timestamptz)
users(id uuid PK, email citext UNIQUE, name text, avatar_url text, created_at timestamptz)
tenant_memberships(tenant_id, user_id, role tenant_role, created_at)  -- PK (tenant_id, user_id)
oauth_accounts(id, user_id, provider, provider_user_id, access_token_enc, refresh_token_enc, expires_at)
  -- UNIQUE(provider, provider_user_id)
tenant_invitations(id, tenant_id, email, role, token_hash UNIQUE, invited_by_user_id, expires_at, accepted_at)
saml_configs(id, tenant_id, idp_metadata_url, sp_entity_id, acs_url, cert_enc, created_at)
scim_tokens(id, tenant_id, token_hash, expires_at)
```

### 13.2 Integrations

```sql
integrations(
  id uuid PK, tenant_id, type text,  -- 'jira'|'github'|'github_actions'|'jenkins'|'argocd'
  name text, config_json jsonb, secrets_enc text,
  status text,  -- 'active'|'error'|'disconnected'
  last_sync_at timestamptz, error_message text, created_at
)
integration_cursors(id, tenant_id, integration_id, cursor_type, cursor_value, updated_at)
  -- UNIQUE(tenant_id, integration_id, cursor_type)
webhook_deliveries(id, tenant_id, source, delivery_id UNIQUE, payload jsonb, processed_at, created_at)
```

### 13.3 Execution entities

```sql
work_items(
  id uuid PK, tenant_id, integration_id,
  external_id, key, type,  -- 'epic'|'story'|'task'|'defect'
  title, status, priority, story_points numeric,
  assignee_external_id, sprint_id, epic_key, project_key,
  started_date timestamptz, completed_date timestamptz,
  blockers_json jsonb, raw_json jsonb, created_at, updated_at
)
work_item_status_events(id, tenant_id, work_item_id, from_status, to_status, changed_at, changed_by_external_id)

repos(id, tenant_id, integration_id, owner, name, full_name, external_id, default_branch)
pull_requests(
  id, tenant_id, repo_id, number int, title, author_external_id,
  status,  -- 'draft'|'open'|'under-review'|'merged'|'closed'
  base_branch, head_branch, head_sha,
  lines_added, lines_removed, files_changed, has_conflicts boolean,
  opened_at, updated_at, merged_at, closed_at, days_open int
)
pull_request_reviews(id, tenant_id, pr_id, reviewer_external_id, state, submitted_at)

build_runs(
  id, tenant_id, integration_id, source,  -- 'github_actions'|'jenkins'
  external_id, repo_id, pr_id, name, status,
  started_at, finished_at, duration_seconds, branch, commit_sha,
  annotations_json jsonb, metadata_json jsonb
)
deployments(
  id, tenant_id, integration_id, source,  -- 'argocd'|'github_actions'|'jenkins'
  external_id, environment, service, version, commit_sha,
  status,  -- 'success'|'failed'|'running'|'rolled-back'
  started_at, finished_at, duration_seconds, url, metadata_json jsonb
)
```

### 13.4 Intelligence & analytics

```sql
-- Pre-aggregated metrics
metric_series(
  id, tenant_id, project_ref, metric_name, ts timestamptz,
  value numeric, dimensions_json jsonb
)  -- INDEX (tenant_id, metric_name, ts)

-- AI-generated insights (one row per detected condition per agent)
insights(
  id uuid PK, tenant_id,
  agent text,     -- 'planning'|'story'|'guardrails'|'deployment'|'bottleneck'
  type text,      -- 'bottleneck'|'recommendation'|'guardrail'|'risk'
  severity text,  -- 'critical'|'high'|'medium'|'low'
  status text,    -- 'open'|'acknowledged'|'resolved'
  title text,
  summary text,        -- LLM-generated narrative
  actions_json jsonb,  -- [{ phase, action, effort, gain, owner }]
  evidence_json jsonb, -- structured data that produced this insight
  created_at, updated_at
)

-- LLM run tracking (cost + performance audit)
llm_runs(
  id uuid PK, tenant_id,
  agent text, purpose text,
  input_hash text,   -- SHA-256 (cache key)
  model text,        -- 'gpt-4o'|'gpt-4o-mini'|'claude-3-5-sonnet'
  status text,       -- 'queued'|'running'|'succeeded'|'failed'
  prompt text, response text,
  tokens_in int, tokens_out int, cost_usd numeric(10,6),
  duration_ms int, created_at
)
insight_llm_links(insight_id uuid, llm_run_id uuid, PRIMARY KEY (insight_id, llm_run_id))

-- Audit log
audit_events(
  id uuid PK, tenant_id, actor_user_id uuid,
  action text,  -- 'invite.sent'|'integration.connected'|'insight.acknowledged'|...
  target_type text, target_id text,
  metadata_json jsonb, created_at
)
```

### 13.5 Key indexes

```sql
CREATE INDEX ON work_items (tenant_id, status);
CREATE INDEX ON work_items (tenant_id, project_key);
CREATE INDEX ON work_item_status_events (tenant_id, work_item_id, changed_at);
CREATE INDEX ON pull_requests (tenant_id, status, opened_at);
CREATE INDEX ON deployments (tenant_id, environment, started_at);
CREATE INDEX ON build_runs (tenant_id, status, started_at);
CREATE INDEX ON metric_series (tenant_id, metric_name, ts);
CREATE INDEX ON insights (tenant_id, agent, status, created_at);
CREATE INDEX ON llm_runs (tenant_id, input_hash);
CREATE INDEX ON audit_events (tenant_id, created_at);
```

---

## 14. Security Model

### Transport
- All traffic over TLS; wildcard cert `*.arcai.com` via cert-manager DNS-01
- HSTS (`max-age=31536000; includeSubDomains; preload`) enforced at Cloudflare
- Cloudflare WAF blocks SQLi, XSS, and bot traffic before reaching Kubernetes

### Auth security
- PKCE `S256` on every OAuth 2.0 flow
- `state` + `nonce` generated per-request (Redis-backed, single-use)
- Sessions are random UUID (not JWT — no signature algorithm confusion)
- Session TTL: 24 h (configurable); absolute expiry 7 d
- Cookie: `HttpOnly; Secure; SameSite=Lax; Domain=.arcai.com`

### Tenant data isolation
- Postgres RLS on all tenant-scoped tables (hard DB-level guarantee)
- Application layer always adds explicit `WHERE tenant_id = $1` (defence in depth)
- Redis keys namespaced `ten:{tenant_id}:*`
- LLM evidence packs: one tenant per call; system prompt asserts boundary

### Secrets management
- Integration tokens: AES-256-GCM encrypted → `integrations.secrets_enc`
- Envelope key: AWS Secrets Manager → Kubernetes external-secrets-operator → env var `SECRETS_KEY`
- LLM API keys: Kubernetes Secret (never in DB or Git)
- Key rotation: re-encrypt all `secrets_enc` with new key, update env var

### Webhook security
- GitHub: `X-Hub-Signature-256` HMAC-SHA256 per integration secret
- Jira: shared secret header `X-Atlassian-Token`
- Jenkins: configurable HMAC or IP allowlist
- ArgoCD: shared secret `X-ArgoCD-Secret`
- All sources: `(source, delivery_id)` idempotency dedupe

### LLM security
- Evidence packs sanitised: strip tokens, credentials, raw URLs, PII before LLM call
- LLM provider keys in env vars, never in DB
- Response content validated against expected JSON schema before persisting

### Audit logging

Events written to `audit_events`:
- User login / logout
- Tenant created
- Invitation sent / accepted / rejected
- Integration connected / disconnected
- Manual sync triggered
- Insight acknowledged / resolved
- Member role changed / removed
- LLM budget threshold breached

---

## 15. Local Development Setup

### Prerequisites
- Node.js 20 LTS · Docker Desktop · `pnpm` or `npm`

### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: arcai_dev
      POSTGRES_USER: arcai
      POSTGRES_PASSWORD: devpassword
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
```

### Environment variables

```bash
DATABASE_URL=postgresql://arcai:devpassword@localhost:5432/arcai_dev
REDIS_URL=redis://localhost:6379
SESSION_SECRET=<random 64-char hex>
SECRETS_KEY=<random 32-bytes base64>

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://acme.lvh.me:3000/api/auth/google/callback

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://acme.lvh.me:3000/api/auth/github/callback

OPENAI_API_KEY=...
LLM_MODEL=gpt-4o-mini

FRONTEND_URL=http://acme.lvh.me:5173
APP_BASE_DOMAIN=lvh.me
```

### Running locally

```bash
docker compose up -d          # Postgres + Redis
npx prisma migrate dev        # run migrations
npm run dev:api               # Express API on :3000
npm run dev:worker            # BullMQ workers
npm run dev                   # Vite SPA on :5173
# Access: http://acme.lvh.me:5173
```

---

## 16. Migration Path from Mock Data

Incremental: every page stays functional at each step.

1. **Add API client layer** — create `src/app/api/client.ts` + domain files; keep `mockData.ts` as-is
2. **Auth gate + login page** — implement `GET /api/me`; add `<AuthGuard>`; add `/login` behind feature flag
3. **Backend returns mock shapes** — implement endpoints that return same JSON shapes the UI already uses
4. **Wire up page-by-page** (least → most complex):
   - `Deployments.tsx` → `useDeployments()`
   - `PullRequests.tsx` → `usePullRequests()`
   - `Stories.tsx` → `useWorkItems()`
   - `Dashboard.tsx` → `useDashboardSummary()` + `useTrends()`
   - `Planning.tsx`, `Bottlenecks.tsx`, `Guardrails.tsx`, `Recommendations.tsx`
5. **Connect Jira + GitHub** — admin connects via Settings → manual sync → dashboards fill with real data
6. **Enable intelligence agents** — configure LLM API key → workers start generating agent insights → banners and modals show live AI output

---

## 17. Scale-out Roadmap

### Current Kubernetes baseline

Handles ~50 tenants on 3 API pods + 2 worker pods + managed Postgres (Cloud SQL / RDS Multi-AZ) + Redis Cluster.

### Scale signals and actions

| Signal | Action |
|---|---|
| API p95 latency > 300 ms | Add API pod replicas (HPA already configured) |
| LLM queue depth > 50 | Add `worker-llm` replicas (rate-limit LLM API, not workers) |
| Metric query latency > 200 ms | Enable Postgres read replica for analytics queries |
| > 100 active tenants | Add PgBouncer for connection pooling |
| > 500 tenants | Separate OLAP layer (TimescaleDB or BigQuery) for `metric_series` |
| Webhook volume > 500/min | Add dedicated webhook-receiver pod; pre-validate before enqueue |
| Multi-region latency requirement | Enable active-active with CockroachDB or Citus for Postgres |

### Planned v2 additions

- **Slack / Teams notifications** — critical insight alerts with 1-click acknowledge
- **Custom dashboards** — drag-and-drop metric composition per team
- **Goal tracking (OKRs)** — link engineering metrics to business outcomes
- **Predictive risk scoring** — ML regression model on `metric_series` for sprint outcome prediction
- **GitLab + Azure DevOps** — integration adapters following same ingestion contract
- **Audit export** — SOC 2 / ISO 27001 compliance report generation
