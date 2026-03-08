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

/**
 * The browser router instance consumed by <RouterProvider> in App.tsx.
 * Every route is wrapped with <Layout> so the sidebar and header are
 * always present — only the inner page content changes on navigation.
 */
export const router = createBrowserRouter([
  // ─── Primary navigation ──────────────────────────────────────────────────
  {
    path: "/",
    element: <Layout><Dashboard /></Layout>,
  },
  {
    path: "/planning",
    element: <Layout><Planning /></Layout>,
  },
  {
    path: "/stories",
    element: <Layout><Stories /></Layout>,
  },
  {
    path: "/pullrequests",
    element: <Layout><PullRequests /></Layout>,
  },
  {
    path: "/deployments",
    element: <Layout><Deployments /></Layout>,
  },

  // ─── Insights & quality ───────────────────────────────────────────────────
  {
    path: "/guardrails",
    element: <Layout><Guardrails /></Layout>,
  },
  {
    path: "/bottlenecks",
    element: <Layout><Bottlenecks /></Layout>,
  },
  {
    path: "/recommendations",
    element: <Layout><Recommendations /></Layout>,
  },

  // ─── Settings ────────────────────────────────────────────────────────────
  {
    path: "/preferences",
    element: <Layout><Preferences /></Layout>,
  },

  // ─── Fallback — must stay last ────────────────────────────────────────────
  {
    path: "*",
    element: <Layout><NotFound /></Layout>,
  },
]);