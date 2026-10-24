import { useEffect, useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth } from 'convex/react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Splash } from '../components/Splash.jsx';
import { SiteNav} from '../components/SiteNav.jsx';
import { DemoDisclaimerFooter } from '../components/DemoDisclaimerFooter.jsx'

const MODE = Object.freeze({ SignIn: 'signIn', Forgot: 'forgot', Reset: 'reset' });

function authErrorText(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Account creation is by request only')) return 'Account creation is by request only. Use Create account to request access.';
  if (message.includes('InvalidSecret') || message.includes('Invalid credentials')) return 'Wrong email or password.';
  if (/Account .+ already exists/.test(message)) return 'That account already exists. Sign in instead.';
  if (message.includes('InvalidAccountId')) return 'No password account for that email.';
  if (message.includes('TooManyFailedAttempts')) return 'Too many attempts. Try again later.';
  if (message.includes('Invalid code') || message.includes('Could not verify code')) return 'Invalid or expired reset link.';
  if (message.includes('Invalid password')) return 'Password must be at least 8 characters.';
  if (message.includes('Username')) return message.split('Uncaught Error: ').at(-1).split('\n')[0];
  if (message.includes('invalid_client') || message.includes('OAuth')) return 'GitHub sign-in is not configured yet.';
  if (message.includes('Failed to fetch')) return 'Could not reach the server. Try again.';
  return 'Authentication failed. Try again.';
}

export function SignInPage() {
  const auth = useConvexAuth();
  const authActions = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const resetCode = searchParams.get('code') ?? '';
  const isResetRoute = location.pathname === '/reset-password';
  const [mode, setMode] = useState(isResetRoute ? (resetCode ? MODE.Reset : MODE.Forgot) : MODE.SignIn);
  const [form, setForm] = useState({ email: searchParams.get('email') ?? '', password: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isResetRoute && resetCode) setMode(MODE.Reset);
  }, [isResetRoute, resetCode]);

  if (auth.isLoading) return <Splash label="Signing in" />;
  if (auth.isAuthenticated && !isResetRoute) return <Navigate to="/" replace />;

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const run = (task, onDone) => {
    setError('');
    setNotice('');
    setIsBusy(true);
    task()
      .then(onDone)
      .catch((reason) => {
        console.error(reason);
        setError(authErrorText(reason));
      })
      .finally(() => setIsBusy(false));
  };

  const submit = (event) => {
    event.preventDefault();
    if (mode === MODE.SignIn) {
      run(() => authActions.signIn('password', { flow: 'signIn', email: form.email, password: form.password }));
    }
    if (mode === MODE.Forgot) {
      run(
        () => authActions.signIn('password', {
          flow: 'reset',
          email: form.email,
          redirectTo: `/reset-password?email=${encodeURIComponent(form.email)}`,
        }),
        () => setNotice('Reset link sent. Check your email.'),
      );
    }
    if (mode === MODE.Reset) {
      run(
        () => authActions.signIn('password', { flow: 'reset-verification', email: form.email, code: resetCode, newPassword: form.password }),
        () => navigate('/', { replace: true }),
      );
    }
  };

  const titles = {
    [MODE.SignIn]: 'Sign in',
    [MODE.Forgot]: 'Forgot password',
    [MODE.Reset]: 'Choose a new password',
  };
  const canSubmit = form.email && (mode === MODE.Forgot || form.password);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <SiteNav/>
      <section className="panel w-full max-w-sm p-8">
        <h1 className="mt-6 text-2xl font-bold text-white">{titles[mode]}</h1>
        <p className="mt-1 text-sm text-slate-400">Meet over a private game of poker or chess. Peer-to-peer video, no middleman.</p>

        {mode === MODE.SignIn ? (
          <>
            <button
              className="btn-ghost mt-6 w-full"
              type="button"
              onClick={() => run(() => authActions.signIn('github', { redirectTo: '/' }))}
            >
              Continue with GitHub
            </button>
            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
              <span className="h-px flex-1 bg-slate-700" />or<span className="h-px flex-1 bg-slate-700" />
            </div>
          </>
        ) : <div className="mt-6" />}

        <form className="space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="label">{mode === MODE.SignIn ? 'Username or email' : 'Email'}</span>
            <input className="field" autoComplete={mode === MODE.SignIn ? 'username' : 'email'} type={mode === MODE.SignIn ? 'text' : 'email'} value={form.email} onChange={update('email')} placeholder={mode === MODE.SignIn ? 'username or you@example.com' : 'you@example.com'} />
          </label>
          {mode !== MODE.Forgot ? (
            <label className="block">
              <span className="label">{mode === MODE.Reset ? 'New password' : 'Password'}</span>
              <input
                className="field"
                autoComplete={mode === MODE.SignIn ? 'current-password' : 'new-password'}
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="8+ characters"
              />
            </label>
          ) : null}
          <button className="btn-primary w-full" disabled={!canSubmit || isBusy} type="submit">
            {mode === MODE.SignIn ? 'Sign in' : mode === MODE.Forgot ? 'Send reset link' : 'Reset password'}
          </button>
        </form>

        <div className="mt-5 flex justify-between text-sm">
          {mode === MODE.SignIn ? (
            <>
              <Link className="text-rose-300 hover:underline" to="/request-access">Create account</Link>
              <button className="text-slate-400 hover:underline" type="button" onClick={() => setMode(MODE.Forgot)}>Forgot password?</button>
            </>
          ) : (
            <button className="text-slate-400 hover:underline" type="button" onClick={() => setMode(MODE.SignIn)}>← Back to sign in</button>
          )}
        </div>

        {notice ? <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{notice}</p> : null}
        {error ? <p className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p> : null}
      </section>
      <DemoDisclaimerFooter/>
    </main>
  );
}
