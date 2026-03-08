/**
 * main.tsx — Application Entry Point
 *
 * This is the very first file that runs when the browser loads Arc AI.
 * It mounts the React app into the #root div defined in index.html,
 * and wraps everything in StrictMode to surface any hidden issues during development.
 *
 * Global styles are imported here once so they cascade through the entire app.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './app/App';
import './styles/index.css';

// Mount the React tree into the DOM. The non-null assertion (!) is safe here
// because index.html always has a <div id="root"> — if it's missing, we want to crash loudly.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
