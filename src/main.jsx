import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) throw new Error('Missing VITE_CONVEX_URL. Run `npx convex dev` to connect this app.');

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexAuthProvider
      client={convex}
      replaceURL={(relativeUrl) => window.history.replaceState(null, '', relativeUrl)}
      shouldHandleCode={() => window.location.pathname !== '/reset-password'}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexAuthProvider>
  </StrictMode>,
);
