# Private Meet

**Author:** [Sonia Code](https://github.com/sadhbh-c0d3)

*Copyright (c) 2026 Sonia Kolasinska / Imperfect Protocol. All Rights Reserved.*

---

## About

Book a meeting, then talk over a two-player game of Texas Hold'em. The app lives in this directory; it has no wallets, subscriptions, blockchain transactions, buy-ins or cash payouts.

Convex stores accounts, availability, bookings, invite responses and peer announcements. Poker and chat travel through `../privatepoker-p2p` over WebRTC. Audio and video use the same peer connection. Each match starts with 1000 play chips per player, with blinds of 10/20.

## Run locally

Dependencies are already installed in this checkout. An isolated anonymous local Convex deployment has been created on ports 33210 (API) and 33211 (auth HTTP). It does not use the Battle Tanks deployment.

```sh
cd /Users/sadhbh/src/ImperfectProtocol/private-meet
npm run dev
```

Open **http://127.0.0.1:5173**. Use `127.0.0.1` consistently; `localhost` is a different origin for auth and cross-tab messages. A backend process may already be running from development. If so, start only the frontend with `npm run dev:vite`.

On a fresh checkout:

```sh
npm install
CONVEX_ALLOW_ANONYMOUS=1 CONVEX_AGENT_MODE=anonymous npx convex dev --once --local-cloud-port 33210 --local-site-port 33211
npm run dev:convex
```

With that backend running, in another terminal:

```sh
npm run setup:auth
npm run dev:vite
```

`setup:auth` creates a local RS256 signing key/JWKS pair and sets `SITE_URL`. It refuses cloud deployments and does not print the keys. `.env.local` and `.convex/` are local state, not source files. Convex supplies `CONVEX_SITE_URL`; do not try to set it yourself.

## Sign-in and email

GitHub users can create an account directly with Continue with GitHub. Account creation without GitHub is by request only. The Create account link opens `/request-access`, where visitors submit a proposed display name, email and message. Submissions are saved in Convex's `accessRequests` table for review; they do not create accounts or send notification emails. Review them in the Convex dashboard. The form rejects invalid or oversized submissions and repeated requests from the same email within one minute.

Existing accounts can still sign in with their username/email and password, or their linked GitHub account. Password resets use the email address. The backend allows new users only through the configured GitHub OAuth provider and rejects direct password sign-up. There is no public approval or password-account provisioning endpoint.

Set these variables on this project's Convex deployment:

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Frontend origin; locally `http://127.0.0.1:5173` |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth app credentials |
| `AUTH_RESEND_KEY` | Resend API key for invitations and password resets |
| `MEET_FROM_EMAIL` | Sender, e.g. `Private Meet <meet@your-verified-domain>` |
| `JWT_PRIVATE_KEY` / `JWKS` | Convex Auth signing keys; local setup generates them |

For GitHub, the callback URL is `${VITE_CONVEX_SITE_URL}/api/auth/callback/github`, or `http://127.0.0.1:33211/api/auth/callback/github` locally.

Use `npx convex env set NAME` to enter secrets without including them in commands. Keep Resend and GitHub secrets out of frontend `VITE_` variables. The default Resend sender is `onboarding@resend.dev`; a verified sender domain is needed for normal guest delivery.

Without `AUTH_RESEND_KEY`, emails are logged by the backend for local development instead of delivered. Run `npx convex logs` to find both personal invitation links. This logging fallback is for development only.

## Flows

1. Sign in and see a seven-day calendar with 15-minute rows, week navigation and a date picker.
2. Set your available days and hours under Settings. Availability follows that stored time zone; every screen displays times in the viewer's browser zone.
3. Copy your booking link. A guest needs no account: they choose 15, 30, 45 or 60 minutes (30 by default), then enter their name and email.
4. Convex checks availability and overlaps again while saving the booking. Both parties receive individual invite links and calendar attachments.
5. Each person accepts or declines their invitation. Convex records the answers; the calendar updates when both accept.
6. Open each person's own table link. Keep both tabs open while the private-mesh bootstrap establishes the WebRTC connection.
7. After connection, choose whether to use video, press OK and allow microphone access. Audio is always on during the call; the camera can be toggled from your avatar.
8. Use Chat for a separate message window, and Console for protocol/connection logs.
9. When a stack reaches zero, both players can agree to start another match with 1000 chips each. “Just chat” leaves the call open.

The chosen duration is a booking interval, not a forced call-disconnection timer.

## Architecture

| Path | Responsibility |
| --- | --- |
| `convex/` | Auth, host settings, transactional booking, invitations, emails, peer announcements |
| `convex/model/` | Time-zone arithmetic, slot generation, email transport and invite status helpers |
| `src/lib/meet/HeadsUpMatch.js` | Heads-up game lifecycle, automatic protocol actions, payout and rematch agreement |
| `src/lib/meet/SessionIdentity.js` | Ephemeral BLS identities |
| `src/lib/meet/MeetLink.js` | Signed peer messaging over the shared networking package |
| `src/lib/meet/MeetSession.js` | Owns the match, link, media, chat and debug log |
| `src/lib/meet/MediaSession.js` | Microphone/camera lifecycle |
| `src/lib/crum_bls`, `crum_pkr`, `crum_net` | Browser engine source copied from `private-poker-vite` |
| `src/hooks/` | React/Convex wiring only |
| `src/pages`, `src/components` | Calendar, booking, invite and table UI |

The per-tab transport key signs messages. A separate random key masks the cards for each hand, because the masking key’s public key and shuffle trace are revealed during hand verification. Each player keeps a full game replica. Convex receives neither hole cards nor bets.

The shared `privatepoker-p2p` package has optional `setLocalStream(stream)`, `MediaStream` events, and `close()` cleanup. Existing data-only consumers do not need to enable media.

## Checks

```sh
npm test
npm run typecheck
npm run build

cd ../privatepoker-p2p
node --test src/**/*.test.js
```

Unit tests cover signed messages, a complete verified hand, all-in and rematch, fold payout, the early-ready handshake, slot overlap/duration/DST, invite status and chat counters. Networking tests include mocked media negotiation and simultaneous-offer handling.

Browser layout, real camera/microphone playback, GitHub redirects, email delivery and two-device gameplay are intentionally left for manual testing. Passing these unit tests does not verify those flows.

## Deployment and limits

For a cloud backend, configure a **new Private Meet Convex project**. Do not reuse Battle Tanks' deployment or auth keys.

Static hosting is wired through `@convex-dev/static-hosting`, so the Vite build can be deployed directly to the Convex site URL:

```sh
npm run deploy
```

### Fresh production deployment

Start from a fresh checkout:

```sh
cd /Users/sadhbh/src/ImperfectProtocol/private-meet
npm install
npx convex login
npx convex dev --once
```

When Convex asks, create or select the dedicated **Private Meet** project. This writes `.env.local` for the development deployment and generates Convex types. Check `.env.local` before continuing and make sure it points at the Private Meet project, not another app.

Run the first production deploy:

```sh
npm run deploy
```

The deploy command builds the frontend with the production Convex URL, deploys the Convex backend, uploads `dist/`, and prints the public site URL, usually `https://<deployment>.convex.site`. Keep that URL; it is the frontend origin for auth and invite links.

### Production auth setup

Configure Convex Auth on the production deployment with the public site URL from the deploy output:

```sh
npx @convex-dev/auth --skip-git-check --prod --web-server-url https://<deployment>.convex.site
```

That command sets `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` on the production Convex deployment. If it asks about overwriting existing auth keys, only say yes when intentionally rotating all production sessions.

Optional GitHub sign-in also needs OAuth credentials:

```sh
npx convex env set --prod AUTH_GITHUB_ID
npx convex env set --prod AUTH_GITHUB_SECRET
```

Use this callback URL in the GitHub OAuth app:

```text
https://<deployment>.convex.site/api/auth/callback/github
```

### Resend email setup

Invitations and password resets use Resend when `AUTH_RESEND_KEY` is present. Set it as a Convex secret and set a verified sender:

```sh
npx convex env set --prod AUTH_RESEND_KEY
npx convex env set --prod MEET_FROM_EMAIL
```

For `MEET_FROM_EMAIL`, use a sender such as `Private Meet <meet@your-verified-domain>`. Without `AUTH_RESEND_KEY`, the backend logs email contents instead of delivering them; that fallback is useful locally but not for production.

### Deploy UX

For normal releases, run:

```sh
npm run deploy
```

Expected output:

1. The static-hosting CLI resolves the production Convex URLs.
2. Vite builds with the production `VITE_CONVEX_URL`.
3. Convex deploys functions and the static-hosting component.
4. The CLI uploads the `dist/` files.
5. It prints the live `https://<deployment>.convex.site` URL.

After changing auth or email environment variables, run `npm run deploy` again so the latest backend and frontend are published together. To smoke-test static hosting on the configured development deployment without touching production, start `npm run dev:convex` in one terminal and run `npm run deploy:static` in another.

Personal invitation URLs are bearer credentials. Anyone holding a participant’s link can use that seat, so do not post those links publicly. Opening another tab for the same participant replaces its announced peer identity. A refresh or reconnection starts a fresh match; in-progress hands and chat are not persisted.

The private-mesh endpoint is a signalling relay, not a media relay. Only STUN is configured by default. Some corporate networks and restrictive NATs will need your own TURN service; direct WebRTC cannot be guaranteed on every network. Bootstrap signalling is not signed by the mesh, while application messages are BLS-signed against Convex-announced keys.

Before opening public booking to large traffic, add abuse/rate controls and email retry monitoring. Calendar-provider synchronization, rescheduling and production delivery monitoring are outside this first version.
