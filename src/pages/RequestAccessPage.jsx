import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Link } from 'react-router-dom';
import { api } from '../../convex/_generated/api';
import { ACCESS_REQUEST_LIMITS, validateAccessRequest } from '../../convex/model/accessRequest';
import { SiteNav} from '../components/SiteNav.jsx';
import { DemoDisclaimerFooter } from '../components/DemoDisclaimerFooter.jsx'

export function RequestAccessPage() {
  const submitRequest = useMutation(api.accessRequests.submit);
  const [form, setForm] = useState({ displayName: '', email: '', message: '' });
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const isSending = state === 'sending';

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    if (isSending) return;
    setError('');
    setState('sending');
    try {
      await submitRequest(validateAccessRequest(form));
      setState('sent');
    } catch (reason) {
      setState('failed');
      setError(typeof reason.data === 'string' ? reason.data : reason.message || 'Could not send your request. Please try again.');
    }
  };

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <SiteNav/>
      <section className="panel w-full max-w-md p-8">
        <h1 className="mt-6 text-2xl font-bold text-white">Request an account</h1>
        <p className="mt-2 text-sm text-slate-400">You can create an account with GitHub from the sign-in page. For an account without GitHub, tell us who you are and why you’d like access.</p>

        {state === 'sent' ? (
          <div className="mt-6 rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-300" role="status">
            Your request has been received for review. This does not create an account.
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block" htmlFor="request-display-name">
              <span className="label">Proposed display name</span>
              <input id="request-display-name" className="field" autoComplete="nickname" required maxLength={ACCESS_REQUEST_LIMITS.displayName} value={form.displayName} onChange={update('displayName')} disabled={isSending} />
            </label>
            <label className="block" htmlFor="request-email">
              <span className="label">Email address</span>
              <input id="request-email" className="field" type="email" autoComplete="email" required maxLength={ACCESS_REQUEST_LIMITS.email} value={form.email} onChange={update('email')} disabled={isSending} />
            </label>
            <label className="block" htmlFor="request-message">
              <span className="label">Message</span>
              <textarea id="request-message" className="field min-h-32 resize-y" rows={5} required maxLength={ACCESS_REQUEST_LIMITS.message} value={form.message} onChange={update('message')} disabled={isSending} />
            </label>
            {error ? <p className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300" role="alert">{error}</p> : null}
            <button className="btn-primary w-full" type="submit" disabled={isSending}>{isSending ? 'Sending…' : 'Send Request'}</button>
          </form>
        )}
        <Link className="btn-ghost mt-4 w-full" to="/sign-in">Back to Sign-in</Link>
      </section>
      <DemoDisclaimerFooter/>
    </main>
  );
}
