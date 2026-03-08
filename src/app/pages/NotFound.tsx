/**
 * NotFound.tsx — 404 Fallback Page
 *
 * Rendered by the catch-all route in routes.tsx whenever a user navigates
 * to a URL that doesn't match any defined route.
 * Provides a clear error message and a single escape hatch back to the Dashboard.
 */
import { Link } from 'react-router';
import { AlertCircle } from 'lucide-react';

/**
 * NotFound — minimal 404 page with a link back to the dashboard.
 */
export function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="size-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-4xl font-semibold text-gray-900 mb-2">404</h1>
        <p className="text-gray-600 mb-6">Page not found</p>
        <Link 
          to="/" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
