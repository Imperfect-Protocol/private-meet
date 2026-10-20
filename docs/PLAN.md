# Private Meet implementation

- Date: 2026-10-10
- POC: Sadhbh
- Status: First implementation complete; browser testing belongs to Sadhbh.
- TL;DR: A Vite app in `private-meet/` uses Convex for accounts and booking, with peer-to-peer video, audio, chat and a booking-selected heads-up game: Poker or Chess. Poker uses `privatepoker-p2p`; both games use the connected peer data channel. GitHub OAuth and real Resend delivery need deployment credentials.

## Scope

Private Meet is separate from the existing poker frontends. It has no blockchain, wallet, subscription, lobby, table creation, buy-in or cash settlement screens.

Poker starts with 1000 play chips per player and 10/20 blinds. When a Poker player runs out, both participants can agree to play again; otherwise their call stays open. Chess is standard two-player Chess, with no chips or stakes; players can request a new game after it ends.

## Implemented flows

| Flow | Behaviour |
| --- | --- |
| Host sign-in | GitHub OAuth or username/email and password. Signup collects a unique username, email and password. Password reset uses Resend. |
| Host calendar | Seven day columns, 96 quarter-hour rows, previous/next week, Today and a date picker. A badge shows the viewer's browser time zone. |
| Meeting popup | Subject, date, time, duration, guest name/email, both invitation states and a personal table link opening in another tab. |
| Availability | Settings for available weekdays, daily hours and the time zone defining those hours. Defaults to weekdays 09:00–17:00. |
| Public booking | A guest with no account opens `/book/:slug`, sees slots in their own browser time zone, chooses 15/30/45/60 minutes and supplies a name/email. Default duration is 30 minutes. |
| Game selection | The guest chooses Poker or Chess while booking; the confirmed meeting carries that choice to both table links. |
| Invitations | Both participants get individual Accept/Decline links and `.ics` files. Responses are stored in Convex. Both acceptances confirm the meeting; a decline releases the booking interval. |
| Table connection | Personal table links select the participant's seat. Convex announces each tab's peer address and BLS public key; private-mesh bootstraps `privatepoker-p2p`. |
| Media | After connection, a popup requests microphone permission and offers a video switch. Audio stays on. Videos render in round avatars; the local camera can be toggled. |
| Chat | Separate floating chat window, send input and unread badge. Chat also appears in the debug console. |
| Rematch | Both peers exchange votes. Agreement starts a new match at 1000 chips each. “Just chat” dismisses the prompt without ending the call. |

Duration is a scheduled interval, not a forced call cutoff.

## Architecture

| Component | Ownership |
| --- | --- |
| Convex Auth | Accounts, password hashing, password reset and GitHub OAuth |
| Convex host functions | Host profile and recurring availability |
| Convex booking functions | Available UTC slots and transactional overlap checks |
| Convex invitation/email functions | Pending/confirmed/declined state, Resend delivery and calendar attachments |
| Convex meeting functions | Host calendar reads and participant-specific peer announcements |
| `HeadsUpMatch` | Full replicated Poker state, automatic shuffle/unmask steps, bets, showdown, payout and rematch |
| `ChessSession` | Full replicated Chess state, legal-move validation, terminal results and new-game agreement |
| `MeetLink` | Signed transport through `privatepoker-p2p` |
| `MeetSession` | Selects and owns the Poker or Chess session, link, media, chat and console |
| `MediaSession` | Permission, capture, camera toggle and stream cleanup |
| React hooks | Convex subscriptions and lifecycle wiring only |
| `privatepoker-p2p` | Bootstrap, data channel, optional media tracks and whole-network disposal |

The browser engine directories `crum_bls`, `crum_pkr` and `crum_net` were copied from `private-poker-vite`. The new table UI uses that engine through focused library classes instead of porting the chain-dependent gameplay hook.

## Time zones

Availability is defined in the host's stored zone. Slot generation converts it to UTC instants. All screens format those instants in the viewer's browser zone, including hosts viewing from a different zone. Invitations use the recipient's captured zone; calendar attachments use UTC.

## Keys and networking

Each tab owns a random BLS transport key, independent of any wallet. It is announced through Convex and signs application messages. Each hand gets a separate fresh card-masking key for shuffle/unmask verification.

Participant-specific invitation tokens select seat 0 (host) or seat 1 (guest). Tokens are bearer credentials and must remain private. A new tab for a participant replaces that seat's announcement. Reconnection starts a fresh game; in-progress Poker and Chess games are not persisted.

The mesh context uses lobby ID `private-meet` and the Convex meeting ID as the table ID. These are valid string identifiers for the existing relay.

`privatepoker-p2p` additions:

- `setLocalStream(stream)` enables audio/video on the existing peer connection.
- `MediaStream` events deliver remote streams.
- Offer/answer renegotiation uses a dedicated media envelope over the open data channel, with address-ordered polite/impolite collision handling.
- `close()` releases connections, polling and the local control bus.

## Verification

- Private Meet: unit tests cover Poker synchronization, signed messages, rematch, fold payout, Chess rules/session synchronization, early-ready handling, scheduling/DST, invite state and chat counters.
- Networking package: 33 passing tests, including four mocked media-negotiation cases.
- Backend TypeScript check passes.
- Convex functions deployed successfully to an isolated anonymous local instance on ports 33210/33211.
- Production Vite build passes.
- A local Convex Auth signing key/JWKS pair and `SITE_URL` were configured without reusing Battle Tanks credentials.

No browser, camera, microphone, OAuth-redirect or real email-delivery test was performed. Sadhbh will test those manually.

## Setup and remaining deployment work

See `../README.md` for commands and environment variables. GitHub needs an OAuth app; Resend needs an API key and verified sender for normal delivery. Without a Resend key, development emails are printed to backend logs.

The local instance does not alter Battle Tanks. Cloud deployment should use a separate Private Meet Convex project.

Only STUN is configured by default. Restrictive NATs or corporate networks may need a TURN service. Public booking also needs abuse controls and email retry monitoring before a large public launch.
