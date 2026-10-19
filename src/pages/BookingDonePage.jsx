import { Link, useParams } from 'react-router-dom';
import { Brand } from '../components/Splash.jsx';

export function BookingDonePage() {
  const params = useParams();
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="panel max-w-md p-8 text-center">
        <div className="flex justify-center"><Brand /></div>
        <p className="mt-6 text-5xl">📬</p>
        <h1 className="mt-4 text-2xl font-bold text-white">Invites are on their way</h1>
        <p className="mt-3 text-sm text-slate-400">
          Your booking is saved. We’re sending you and your host an invite. Open it and press <strong className="text-slate-200">Accept</strong> to
          confirm. The email also has your personal link to the game table.
        </p>
        <Link className="btn-ghost mt-6" to={`/book/${params.slug}`}>Book another time</Link>
      </section>
    </main>
  );
}
