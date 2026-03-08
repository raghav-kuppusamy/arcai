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

/**
 * App — renders the router and nothing else.
 * Adding global providers (auth context, theme, query client) here in future.
 */
export default function App() {
  return <RouterProvider router={router} />;
}