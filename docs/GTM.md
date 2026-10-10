# Private Meet — Go-To-Market Strategy

- **Date:** 2026-10-10
- **POC:** Sonia Sadhbh Kolasinska (Imperfect Protocol)
- **Status:** Draft v1. Pricing and segment choices are hypotheses we still need to test.

## TL;DR

Private Meet is **a booking link plus a heads-up poker table plus peer-to-peer video**. A host shares a link, the guest books 15–60 minutes, and at meeting time they talk while playing a friendly hand of Hold'em with play chips. The deck is cryptographically fair and the video goes browser to browser.

- **Category we claim:** *social meetings*, meaning meetings people actually want to show up to. We are not a video conferencing product and we are not a gambling product.
- **Beachhead:** crypto and tech founders, BD and devrel people, and investors who take a lot of intro and networking calls. They already like poker and privacy, and they are where the founder's network is (Arbitrum ecosystem).
- **Second wedge:** poker coaches and creators running 1:1 sessions ("play a hand with me").
- **Growth engine:** the **guest-to-host loop**. Every booking puts a non-user through the full product, and the post-match screen invites them to get their own link. This is Calendly's playbook with a much more memorable first session.
- **Monetization:** freemium. Free 1:1 meetings; **Pro at about $8/mo** for branding, calendar sync, multiple meeting types and a guaranteed relay. We never sell chips.
- **Strategic role:** Private Meet takes Private Poker's P2P and mental-poker engine to market with **no wallet, no chain and no regulatory exposure**. It builds an audience and brand that can later be invited to Private Poker tournaments.
- **Sequence:** fix the launch gates (TURN, rate limits, email, calendar busy-check) → private alpha with 30 hosts → Show HN, Product Hunt and crypto Twitter → Pro tier, creator program and conference activations → bridge to Private Poker.

---

## 1. Product truth (what we can honestly sell today)

| Capability | State | GTM implication |
|---|---|---|
| Public booking link, availability, time zones, 15/30/45/60 min | Built | Core "Calendly" job is covered |
| Guest needs no account; email invites + `.ics` | Built (Resend key/sender needed) | Zero-friction viral loop is possible |
| Heads-up Hold'em, 1,000 play chips, 10/20 blinds, rematch | Built | The hook |
| P2P audio/video + chat over WebRTC | Built (STUN only) | Privacy claim is real for media |
| Per-hand verifiable shuffle/unmask, BLS-signed messages | Built | "Nobody, not even us, sees your cards" is true |
| Calendar provider sync (busy check) | **Missing** | Hosts will double-book. Blocks Pro and serious use |
| TURN relay | **Missing** | Calls fail on corporate/strict NATs, which ruins first impressions |
| Abuse/rate limiting on public booking | **Missing** | Spam risk once links circulate |
| Reconnect / state persistence | Missing | A refresh restarts the match. Acceptable for beta |
| Wallet, chain, real money, tokens | Out of scope by design | Keeps us out of gambling, app-store and payments trouble |

**Claims rules.** Say "peer-to-peer video", "cards dealt by the players' browsers" and "no real money". **Never say "no servers"**: scheduling runs on Convex, email on Resend, and signalling on Private Mesh. We are a privacy-led brand, so one overclaim that gets caught on HN costs more than the feature is worth.

---

## 2. Positioning

**For** people who take a lot of 1:1 intro, networking and coffee-chat calls,
**who** are tired of awkward, forgettable 30-minute video calls,
**Private Meet is** a booking link that turns the meeting into a friendly game of heads-up poker over private peer-to-peer video.
**Unlike** Calendly + Zoom/Meet, **the conversation has something to do**: a shared, low-stakes game breaks the ice, shows how people think, and makes the meeting memorable. The video and the cards never pass through our servers.

### Message pillars

1. **Skip the small talk. Deal a hand.** Fun first. The game gives the call a rhythm and something to react to. (This is the lead message.)
2. **Private by construction.** Video goes browser to browser. No meeting bots, no recordings, no transcripts sitting in someone's cloud.
3. **Provably fair.** The players' own browsers shuffle and deal. This is the 1979 "Mental Poker" problem, solved in the browser. It's a credibility and curiosity hook for technical audiences, not the headline for everyone else.
4. **No money, no catch.** Play chips only. Nothing to buy, nothing to win.

### Taglines to test
- "Meet over a hand of poker."
- "Skip the small talk. Deal a hand."
- "The 15-minute meeting people actually show up for."
- Technical audience: "Mental Poker, 1979 → your browser, 2026."

### Competitive frame

| Alternative | What they own | Our angle |
|---|---|---|
| Calendly / Cal.com / SavvyCal | Scheduling | We include the meeting experience, not just the slot |
| Zoom / Google Meet / Whereby | Video | P2P privacy plus a shared activity |
| PokerNow, ClubGG, home-game apps | Poker with friends | We are 1:1, scheduled and video-first. Meeting comes first, game second |
| Donut / coffee-chat tools | Icebreakers inside orgs | Works across companies, with an actual activity |
| Houseparty-style social video (cautionary) | Novelty | Tie usage to a recurring **job** (intro calls) so we don't depend on novelty, which is what killed Houseparty |

---

## 3. Target segments

Score: pain × poker affinity × reachable by founder × viral surface (number of guests they expose).

| # | Segment | Why | Priority |
|---|---|---|---|
| A | **Crypto/tech founders, BD, devrel, VCs**: people with "grab 15 min" links in their bio | High call volume (each host exposes 10–50 guests a month), poker culture runs deep in tech/VC/crypto, they care about privacy, and they're reachable through the Arbitrum network | **Beachhead** |
| B | **Poker coaches, streamers, creators** | "Book a hand with me" is a fan or coaching product, and their audiences are pre-educated in poker | Second wedge (month 3+) |
| C | Community managers / DAO contributors running member 1:1s | Recurring 1:1 volume, Web3-native | Expansion inside A |
| D | Recruiters / hiring managers ("culture chat") | Big volume, but poker in hiring raises fairness and optics issues | **Avoid for now** |
| E | Dating / social discovery | Viral, but brings safety and moderation burden plus brand risk | **Avoid** |

**Ideal first host:** a founder or BD lead in the Arbitrum/Ethereum ecosystem who already has a public scheduling link and plays poker at conference side events.

---

## 4. Growth model

### 4.1 The core loop (built into the product)

```
Host shares link ──► Guest books (no account) ──► Both get invite
      ▲                                               │
      │                                               ▼
Guest becomes host ◄── "Get your own Private Meet link" ◄── Fun call + hands played
```

Product work this loop needs (small, high leverage):
1. **Post-match screen for guests:** match recap (hands won, biggest pot, best hand) plus a one-click "Create your own link" button with name/email pre-filled from the booking.
2. **Shareable recap card:** an image of the winning hand to post to X or Farcaster. Shows hand categories only, never hole cards unless the player opts in.
3. **"Booked with Private Meet" footer** on the free tier booking page and in invite emails.
4. **Head-to-head record** between the same two people ("You lead Alex 3–2"). Gives people a reason to rematch and re-book.
5. **Poker-optional on-ramp:** a one-line hand-strength hint and "how to play" overlay, so guests who don't play poker still enjoy the call. This matters because any guest can churn out of the loop.

### 4.2 Acquisition channels (in order)

| Channel | Tactic | Phase |
|---|---|---|
| Founder network / Arbitrum ecosystem | Hand-onboard 30 alpha hosts. Replace your own Calendly link with Private Meet | Alpha |
| **Show HN** | "Show HN: Peer-to-peer mental poker over WebRTC, as a meeting scheduler." The crypto story is what earns the upvotes, so be candid about what still runs on servers | Public beta |
| Product Hunt | Lead with fun ("Skip the small talk"). GIF of a call with the cards on the table | Public beta, about 2 weeks after HN |
| Build in public on X + Farcaster | Weekly threads: BLS card masking explained, P2P connection stats, funny hand clips (with consent) | Continuous |
| Conference side events (ETH/Arbitrum events) | "Private Meet Poker Hour": book a hand with speakers, sponsors or VCs during the event week. Hosts get pre-made links | Months 2–6 |
| Poker creators | Free Pro for life for 20 coaches or streamers who put "Book a hand with me" in their bio | Month 3+ |
| SEO / content | "Icebreaker ideas for virtual meetings", "fair online poker explained", "Calendly alternatives" | Month 3+, slow burn |
| Paid ads | **Not planned.** Poker creative risks gambling-policy review on ad platforms, and organic plus viral is cheaper at this stage | — |

---

## 5. Pricing & packaging (hypothesis)

| | **Free** | **Pro (~$8/mo or $72/yr)** | **Team (later, ~$6/seat)** |
|---|---|---|---|
| 1:1 meetings | Unlimited | Unlimited | Unlimited |
| Meeting types | 1 | Unlimited (e.g. "15-min intro", "60-min deep dive") | Unlimited |
| Calendar busy-check (Google/Outlook) | 1 calendar | Multiple calendars | Multiple calendars |
| Branding | "Booked with Private Meet" | Custom/no branding, custom slug | Org branding |
| Connectivity | STUN + best-effort relay | **Guaranteed TURN relay** | Guaranteed TURN |
| Stats | Basic | Head-to-head history, meeting analytics | Team routing / round-robin |

Principles:
- **We charge for the meeting tools, never for the game.** No paid chips, no cosmetics tied to winning, no prizes. This keeps us clearly out of gambling and "social casino" categories with payment processors, app stores and ad networks.
- TURN is a real cost that grows with relayed usage, so it belongs in the paid tier. Free users still get a best-effort relay so first impressions don't break.
- Don't launch Pro until there are around 100 weekly active hosts and calendar sync works. Before then, use pricing-page "join waitlist" clicks to test willingness to pay.

---

## 6. Phased plan

### Phase 0: Launch readiness (weeks 0–4)
Gate: **nothing public until these are done.**
- [ ] TURN relay configured and connection-success telemetry in place (target ≥ 95% of scheduled calls connect)
- [ ] Rate limiting / abuse controls on public booking (per IP, per email, per host)
- [ ] Resend verified sender, SPF/DKIM/DMARC, retry and bounce monitoring
- [ ] Google Calendar busy-check, at minimum read-only free/busy (the #1 objection from schedulers)
- [ ] Manual two-device QA: Chrome/Safari/Firefox, mobile Safari, a corporate network
- [ ] Guest post-match screen + "Create your own link" CTA
- [ ] Privacy-respecting product analytics on bookings, connects and hands played. Counts only, never cards, chat or media
- [ ] Landing page with honest architecture section ("what touches our servers, what doesn't")
- [ ] Terms/privacy page stating play-money only, no prizes, 18+ (conservative default for poker content)

### Phase 1: Private alpha (weeks 4–8)
- 30 hand-picked hosts from segment A, each asked to put the link in their bio or email signature for 2 weeks.
- Weekly 15-min feedback call, held *on Private Meet*.
- Exit criteria: ≥ 60% of hosts have ≥ 3 completed meetings; ≥ 5% guest→host conversion; ≥ 95% connect rate; qualitative "guests mentioned the poker" signal.

### Phase 2: Public beta (weeks 8–14)
- Show HN (technical story) → Product Hunt about 2 weeks later (fun story).
- Build-in-public cadence: 1 deep-dive thread + 2 clips per week.
- Pricing page live with Pro waitlist.
- Exit criteria: 300 hosts signed up, 100 weekly active hosts, viral coefficient trending ≥ 0.3.

### Phase 3: Monetize and expand (months 4–6)
- Launch Pro. Start the creator program (segment B). First conference "Poker Hour" activation.
- Reconnect/persistence so a refresh doesn't kill the match.
- Exit criteria: 3–5% of active hosts paying; W8 host retention ≥ 35%.

### Phase 4: Bridge to Private Poker (month 6+)
- Opt-in "Play for real in Private Poker tournaments" invite for engaged users. **Only** once Private Poker's legal structure is settled, and kept as a separate product and brand surface. Private Meet stays wallet-free.
- Shared identity/brand story: "Same fair deck. Now in tournaments."
- Measure: Meet → Private Poker waitlist conversion.

---

## 7. Metrics

**North Star:** **completed meetings per week**, where both peers connected and at least one hand was dealt.

| Stage | Metric | Alpha target |
|---|---|---|
| Acquisition | New host sign-ups / week | 10–20 |
| Activation | Host gets first completed meeting within 7 days | ≥ 50% |
| Reliability | Scheduled calls that connect P2P/TURN | ≥ 95% |
| Engagement | Hands per meeting; rematch rate | ≥ 8 hands; ≥ 30% rematch |
| Show-up | Booked meetings that both parties join | ≥ 80% |
| Virality | Guest → host conversion within 14 days | ≥ 5% (beta: K ≥ 0.3) |
| Retention | Host W4 / W8 active | 40% / 35% |
| Revenue (Phase 3) | Free → Pro conversion | 3–5% of active hosts |

Telemetry must match the brand: aggregate counts and connection-outcome events only. Write down what we collect on the landing page.

---

## 8. Budget (lean, solo-founder)

| Item | Monthly estimate |
|---|---|
| Convex, Resend, SPA hosting, domain | Low (free/starter tiers to start) |
| TURN relay | Usage-based. Cap free-tier relay minutes and watch it |
| Conference activations | Piggyback on side events; swag deck of branded cards |
| Creator program | Free Pro (no cash) |
| Paid acquisition | $0 |

Main spend is **founder time**: roughly 60% product (gates and loop features), 40% distribution (alpha onboarding, content, events).

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Seen as gambling** by app stores, ad networks, payment processors or employers | Play chips only, no purchasable chips, no prizes, 18+ terms, "meeting tool" category in all listings. Keep Private Poker branding visually separate until its legal path is clear |
| Call fails to connect on first try (strict NAT) | TURN before launch; connection telemetry; graceful "audio-only/relay" fallback |
| Guests who don't know poker have a bad time | Hand-strength hints, how-to overlay, option to sit out and just talk |
| Novelty wears off (Houseparty problem) | Anchor to the recurring intro-call job; calendar sync, meeting types and head-to-head history give people reasons to keep using it |
| Hosts won't switch from Calendly without calendar sync | Ship read-only busy-check in Phase 0 |
| Booking spam once links go viral | Rate limits, email verification for guests on suspicious patterns, host-side block list |
| Privacy overclaim backlash | Publish an honest architecture page; never say "serverless" |
| Solo-founder bandwidth split with Private Poker | Private Meet stays wallet-free and reuses the shared P2P engine; time-box Meet work per phase |

---

## 10. Decisions needed from the founder

1. **Confirm beachhead:** crypto/tech intro calls (recommended) or poker coaches first?
2. **Brand relationship:** is Private Meet "by Private Poker" or "by Imperfect Protocol"? Recommended: by Imperfect Protocol, to keep gambling associations away from the meeting product.
3. **Domain and hosting** for public launch (separate Convex cloud deployment + HTTPS SPA).
4. **Calendar sync scope** for Phase 0: Google only, or Google + Outlook.
5. **Pro price point** to test: $6 / $8 / $12.
6. **Age gate and terms:** confirm 18+ and play-money language with counsel before public beta.
