/**
 * App.tsx — Root Component
 *
 * The top-level React component. Its only job is to hand control over to
 * React Router so that the correct page is rendered based on the current URL.
 *
 * All page-level layout (sidebar, header, main content area) is handled
 * further down the tree in Layout.tsx — this stays intentionally minimal.
 */
import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider } from './context/AuthContext';

/**
 * App — renders the router wrapped in AuthProvider.
 * AuthProvider must sit above RouterProvider so every route can call useAuth().
 */
export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}