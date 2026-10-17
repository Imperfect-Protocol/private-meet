import { lazy, Suspense, useEffect, useState } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from '../convex/_generated/api';
import { ViewerTime } from './lib/time/ViewerTime.js';
import { BookingDonePage } from './pages/BookingDonePage.jsx';
import { BookingPage } from './pages/BookingPage.jsx';
import { CalendarPage } from './pages/CalendarPage.jsx';
import { InvitePage } from './pages/InvitePage.jsx';
import { SignInPage } from './pages/SignInPage.jsx';
import { RequestAccessPage } from './pages/RequestAccessPage.jsx';
import { Splash } from './components/Splash.jsx';

const MeetPage = lazy(() => import('./pages/MeetPage.jsx').then((module) => ({ default: module.MeetPage })));

export default function App() {
  return (
    <Suspense fallback={<Splash label="Loading" />}>
    <Routes>
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/request-access" element={<RequestAccessPage />} />
      <Route path="/reset-password" element={<SignInPage />} />
      <Route path="/" element={<RequireHost><CalendarPage /></RequireHost>} />
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/book/:slug/done/:meetingId" element={<BookingDonePage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route path="/meet/:meetingId" element={<MeetPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

/** Signed-in route: ensures the host profile exists before rendering. */
function RequireHost({ children }) {
  const auth = useConvexAuth();
  const host = useQuery(api.hosts.me, auth.isAuthenticated ? {} : 'skip');
  const ensureHost = useMutation(api.hosts.ensure);
  const [error, setError] = useState('');

  useEffect(() => {
    if (auth.isAuthenticated && host === null) {
      void ensureHost({ timeZone: ViewerTime.timeZone() }).catch((reason) => setError(reason.message));
    }
  }, [auth.isAuthenticated, host, ensureHost]);

  if (auth.isLoading) return <Splash label="Signing in" />;
  if (!auth.isAuthenticated) return <Navigate to="/sign-in" replace />;
  if (error) return <main className="grid min-h-screen place-items-center p-6"><p className="text-rose-300">Could not prepare your calendar: {error}</p></main>;
  if (!host) return <Splash label="Preparing your calendar" />;
  return children;
}
