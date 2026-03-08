/**
 * Layout.tsx — Application Shell
 *
 * This is the persistent chrome that wraps every page in Arc AI.
 * It renders:
 *   - A sticky top header with the Arc AI logo
 *   - A desktop sidebar with full navigation
 *   - A slide-in mobile menu (hidden on lg+ screens)
 *   - A <main> content area where child pages are injected
 *
 * Navigation items are defined in a single config array so adding
 * a new page only requires one change here and a new route in routes.tsx.
 */
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  List,
  AlertTriangle,
  Lightbulb,
  Activity,
  Menu,
  X,
  CheckSquare,
  GitPullRequest,
  Rocket,
  Calendar,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { ArcLogo } from './ArcLogo';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Layout — wraps every page with the header, sidebar, and main content area.
 * The `children` prop is the page component rendered at the current route.
 */
export function Layout({ children }: LayoutProps) {
  const location    = useLocation();
  const navigate    = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // Controls the slide-in mobile navigation drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Single source of truth for sidebar navigation.
  // The active item is highlighted by comparing item.path to the current URL.
  const navigation = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Planning', path: '/planning', icon: Calendar },
    { name: 'Jira Stories', path: '/stories', icon: CheckSquare },
    { name: 'GitHub PRs', path: '/pullrequests', icon: GitPullRequest },
    { name: 'Deployments', path: '/deployments', icon: Rocket },
    { name: 'Guardrails', path: '/guardrails', icon: Shield },
    { name: 'Bottlenecks', path: '/bottlenecks', icon: AlertTriangle },
    { name: 'Preferences', path: '/preferences', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* ── Sticky header: always visible regardless of scroll position ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <ArcLogo className="size-11 transition-transform group-hover:scale-105" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-[#163A5F]">
                    Arc
                  </h1>
                  <span className="px-2 py-0.5 bg-[#0071E3] text-white text-xs font-semibold rounded-full">
                    AI
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">Project Intelligence Platform</p>
              </div>
            </Link>
            
            {/* Right side: user info + logout (desktop) + mobile menu trigger */}
            <div className="flex items-center gap-3">

              {/* Desktop user pill */}
              {user && (
                <div className="hidden lg:flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#163A5F] leading-tight">{user.name}</p>
                    <p className="text-xs text-gray-400 leading-tight">{user.role}</p>
                  </div>
                  <div className="size-9 rounded-full bg-[#163A5F] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {user.initials}
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign out"
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="size-4" />
                  </button>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── Desktop sidebar: hidden on mobile, always shown on lg+ ── */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              // Exact-match active state — avoids '/stories' also lighting up '/'
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[#EBF5FF] text-[#0071E3] shadow-sm'
                      : 'text-[#163A5F] hover:bg-gray-100'
                  }`}
                >
                  <Icon className="size-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
        </aside>

        {/* ── Mobile slide-in drawer ── */}
        {/* The outer overlay closes the menu on backdrop tap.
            stopPropagation on the aside prevents the tap from bubbling up. */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <aside className="w-64 bg-white h-full" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-[#D2D2D7]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArcLogo className="size-8" />
                    <h2 className="text-lg font-bold text-[#163A5F]">Arc</h2>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1">
                    <X className="size-5" />
                  </button>
                </div>
              </div>
              <nav className="p-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#EBF5FF] text-[#0071E3]'
                          : 'text-[#163A5F] hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="size-5" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile user + logout */}
              {user && (
                <div className="border-t border-[#D2D2D7] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-9 rounded-full bg-[#163A5F] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {user.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#163A5F] truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* ── Page content area: the active route component renders here ── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}