/**
 * routes.tsx — Application Route Definitions
 *
 * This file is the single source of truth for every URL in Arc AI.
 * All routes share the same Layout shell (sidebar + header), so each
 * page just renders its content — navigation chrome is not its concern.
 *
 * Route map at a glance:
 *   /                → Dashboard     — project-wide health overview
 *   /planning        → Planning      — epics, milestones, sign-offs
 *   /stories         → Stories       — Jira story kanban + table
 *   /pullrequests    → PullRequests  — GitHub PR status & review analysis
 *   /deployments     → Deployments   — DEV / QA / UAT / PROD pipeline status
 *   /guardrails      → Guardrails    — code quality & security scan gates
 *   /bottlenecks     → Bottlenecks   — AI-detected delivery blockers
 *   /recommendations → Recommendations — prioritised improvement suggestions
 *   /preferences     → Preferences   — integration credentials & settings
 *   *                → NotFound      — catch-all 404 page
 */
import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { Dashboard } from "./pages/Dashboard";
import { Planning } from "./pages/Planning";
import { Stories } from "./pages/Stories";
import { PullRequests } from "./pages/PullRequests";
import { Deployments } from "./pages/Deployments";
import { Bottlenecks } from "./pages/Bottlenecks";
import { Guardrails } from "./pages/Guardrails";
import { Recommendations } from "./pages/Recommendations";
import { Preferences } from "./pages/Preferences";
import { NotFound } from "./pages/NotFound";

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

/**
 * The browser router instance consumed by <RouterProvider> in App.tsx.
 * Every route (except /login) is wrapped with ProtectedRoute + Layout.
 */
export const router = createBrowserRouter([
  // ─── Public ──────────────────────────────────────────────────────────────
  {
    path: "/login",
    element: <LoginPage />,
  },

  // ─── Primary navigation ──────────────────────────────────────────────────
  {
    path: "/",
    element: <Protected><Dashboard /></Protected>,
  },
  {
    path: "/planning",
    element: <Protected><Planning /></Protected>,
  },
  {
    path: "/stories",
    element: <Protected><Stories /></Protected>,
  },
  {
    path: "/pullrequests",
    element: <Protected><PullRequests /></Protected>,
  },
  {
    path: "/deployments",
    element: <Protected><Deployments /></Protected>,
  },

  // ─── Insights & quality ───────────────────────────────────────────────────
  {
    path: "/guardrails",
    element: <Protected><Guardrails /></Protected>,
  },
  {
    path: "/bottlenecks",
    element: <Protected><Bottlenecks /></Protected>,
  },
  {
    path: "/recommendations",
    element: <Protected><Recommendations /></Protected>,
  },

  // ─── Settings ────────────────────────────────────────────────────────────
  {
    path: "/preferences",
    element: <Protected><Preferences /></Protected>,
  },

  // ─── Fallback — must stay last ────────────────────────────────────────────
  {
    path: "*",
    element: <Protected><NotFound /></Protected>,
  },
]);