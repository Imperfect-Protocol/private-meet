# Private Meet: positioning hypotheses and priorities
Date: 2026-10-10  
POC: Project owner  
TL;DR: Test a “book a conversation and share a friendly game” proposition. Reliability, guest clarity, and calendar conflict checks come before competing on broad scheduling features or security superlatives.

[Wiki index](README.md) | [Competitor comparison](competitor-comparison.md) | [Privacy and trust](privacy-and-trust.md)

## What the investigation supports

Calendly provides free one-to-one scheduling, with paid host features. [21, lines 16-36] Cal.com advertises free individual scheduling with unlimited event types, calendar connections, and meetings. [22, lines 12-54] Poker Now advertises a room link leading directly to a browser poker game, including heads-up play and integrated calling. [29, lines 10-36]

Private Meet's potential advantage is combining the booking and social-game flow. This is a hypothesis about reduced friction and a better conversation, not proof of uniqueness or demand. Existing free tools already make price-only positioning difficult.

The local [README](../../README.md) and [GTM draft](../GTM.md) define Private Meet as play-chip social meetings. It has no wallet, cash buy-in, blockchain transaction, or cash payout in this scope. Keep its positioning separate from Private Poker's gambling/settlement proposition.

## Positioning to test

> Book a one-to-one conversation and meet at a friendly poker table. Play chips only; keep talking when the game ends.

Supporting architecture description:

> Booking and invitations use our backend. Participants exchange the connected call and game traffic through their peer connection.

The first statement describes the user experience. The second explains the data path without claiming “no servers.” Avoid leading with BLS terminology for a guest deciding whether to accept a meeting. Put technical detail in the privacy explanation for readers who want it.

Do not promise that every network will connect, that the app has been audited, or that no metadata reaches services.

## Audience hypotheses

| Candidate audience | Reason to test | Main risk | Validation task |
| --- | --- | --- | --- |
| Crypto/technical founders and community introductions | May already understand poker and the privacy/fairness story. | Affinity does not establish willingness to book or return. | Interview hosts, then track accepted invitations and completed conversations. |
| Poker creators, coaches, and their audiences | Already have a reason to share a poker activity. | Coaching may require hand review or other capabilities this version does not provide. | Observe a short introductory session and document missing requirements. |
| Communities organizing member introductions | A shared activity may help a first conversation. | Hosts may need matching, moderation, or multi-user administration outside current scope. | Run a small organizer-led pilot without implying Donut feature parity. |
| General professional scheduling | Larger theoretical audience. | Many guests do not want poker; reliability and calendar tools may matter more. | Test booking copy and a clear “just chat” option before pursuing this segment. |

These are research proposals. No customer interviews, demand survey, or pilot was performed in this investigation.

## Priority 0: make guest joining dependable

The local README leaves browser media playback, two-device gameplay, email delivery, and OAuth redirects for manual verification. It also states that only STUN is configured by default and that direct WebRTC is not guaranteed.

Deliverables:

- Two-device tests on desktop/mobile and common browsers.
- Connection tests across home, mobile, corporate, and restrictive NAT networks.
- A TURN plan with defined provider, credentials, cost, and metadata exposure.
- Permission handling, audible audio verification, camera toggle/cleanup, and explicit error states.
- Expired/wrong invitation handling, duplicate-tab behavior, and seat replacement tests.
- A clear recovery message when refresh starts a new match.

Measure booking-to-join completion, connection time, audible-call success, and the share of guests who fail before the first hand. Define targets from pilot observations rather than inventing performance claims.

## Priority 1: meet scheduling expectations

Private Meet checks overlap against its own stored bookings, but the local README lists calendar-provider synchronization and rescheduling outside the first version. Avoid saying it prevents every conflict across a host's work calendar.

Add provider free/busy integration and a coherent cancellation/rescheduling flow before presenting the app as a general scheduler replacement. Preserve timezone handling and guest-without-account access. Test daylight-saving transitions, race conditions, revoked invites, and email/calendar attachment behavior.

## Priority 2: publish the privacy boundary

Use the [privacy page](privacy-and-trust.md) to draft a concise public data-flow disclosure:

- Convex stores account, availability, booking, invitation, and peer-announcement data.
- Email delivery receives addresses and invitation content.
- Private Mesh handles bootstrap/signalling.
- Peers exchange connected media/game/chat traffic.
- Personal invitation URLs grant seat access and must be kept secret.
- Hands/chat are ephemeral and refresh starts a new game.

State retention/deletion rules and analytics practices. Add abuse controls and email retry monitoring before public booking receives large traffic. Backend metadata and peer-to-peer payload privacy need different explanations.

## Priority 3: make the activity understandable

Use play-chip language before the guest joins. Explain that poker is a shared activity, not a financial wager. Let the guest find “just chat” without playing to a stack bust. Test beginner hints and pacing rather than assuming poker expertise.

The strongest competitor challenge is the ease of sending an existing meeting link or Poker Now room. Compare the number of guest steps, the clarity of invitations, and completed conversations. Do not claim the combined flow reduces friction until users demonstrate it.

## Monetization questions, not a price recommendation

Private Meet has no published subscription pricing in the reviewed local scope. Test these questions before choosing a model:

- Would a host pay for the combined experience instead of combining free tools?
- Does the host need calendar integration, custom branding, recurring sessions, or community administration enough to pay?
- What are actual backend, email, signalling, and TURN costs per completed meeting?
- Can guests remain free, and which host features would justify a subscription?
- Does introducing recordings or transcripts contradict the intended privacy expectations?

Use host-seat prices as comparison points, not a recommended price. A paid activity or coaching booking is a separate transaction from a platform subscription and may involve processor and policy requirements.

## Claim-to-evidence checklist

| Claim | Required evidence |
| --- | --- |
| “Easy for guests” | Observed invite-to-call completion and usability results across devices. |
| “Private meetings” | Data-flow disclosure, key/access model, retention rules, and security review. |
| “Peer-to-peer” | Verified topology for the actual media/game path and a clear TURN explanation. |
| “Reliable calls” | Real media and restrictive-network testing, monitored failures, and a recovery path. |
| “Calendar conflict prevention” | Clarify internal booking checks versus provider-calendar busy checks. |
| “Fair poker” | Precise protocol properties, verification behavior, disclosure policy, and adversarial tests. |

## Remaining external evidence

Confirm Poker Now's complete live Plus pricing and which participant needs a subscription. Resolve its integrated-call documentation against actual behavior. Obtain current Whereby plan amounts and small-room thresholds. Refresh Gather's dated price policy. Treat current Jitsi browser support and Google/Zoom encryption-mode selection as hands-on verification tasks before publishing absolute comparisons.

## References

- [1] ZK Poker | Vara Network | https://vara.network/ecosystem/zk-poker
- [2] A New Format for a Legendary Game: ZK Poker Is Live | https://gear-tech.io/news/a-new-format-for-a-legendary-game-zk-poker-is-live
- [3] zkPoker Development | https://projectcatalyst.io/funds/15/cardano-use-cases-prototype-and-launch/zkpoker-development
- [4] Introducing zkHoldem - Decentralized Poker Room as a Reality | https://zkholdem.medium.com/introducing-zkholdem-decentralized-poker-room-as-a-reality-ee5a6a1476b
- [5] Virtue Poker co-founder stepping-down announcement | https://x.com/Virtue_Poker/status/1878127418881589590
- [6] Virtue Poker just lauched a free-to-play play-to-earn platform | https://www.poker.org/latest-news/virtue-poker-just-lauched-a-free-to-play-play-to-earn-platform-aVn3Z8p7NrHy/
- [7] CoinPoker | Best Online Poker Site for Real Money 2026 | https://coinpoker.com/
- [8] Poker Rake on CoinPoker: Game Fees Guide for Players | https://coinpoker.com/rake/
- [9] How to Withdrawals Work on CoinPoker | Full Guide | https://coinpoker.com/deposits-and-withdrawals/withdrawals/
- [10] On-Chain Proof of Reserves | CoinPoker Crypto Poker | https://coinpoker.com/trust-coinpoker/
- [11] CoinPoker Terms and Conditions of Use | https://coinpoker.com/wp-content/uploads/2026/03/Terms-and-Conditions-2026-CoinPoker-.pdf
- [12] Why Blockchains Need Instant Finality in 2026 | https://blog.blockchain.poker/p/why-blockchains-need-instant-finality
- [13] The Infinite Money Glitch? Let's Actually Do the Math | https://blog.blockchain.poker/p/the-infinite-money-glitch-lets-actually
- [14] CoinPoker vs PlayBlind: What Is the Best Crypto Poker Site? | https://playblind.com/blog/coinpoker-vs-playblind
- [15] What Is Provably Fair Poker? | PlayBlind | https://playblind.com/provably-fair-poker
- [16] Deposits and Withdrawals - Guide to the CoinPoker Cashier | https://coinpoker.com/deposits-and-withdrawals/
- [17] Blockchain.Poker Affiliate Program | https://affiliates.blockchain.poker/
- [18] Insta-Pok3r: Real-time Poker on Blockchain | https://eprint.iacr.org/2024/1061
- [19] pokerdao.xyz | https://pokerdao.xyz/
- [20] PokerFi price today, POKERFI to USD live price, marketcap and chart | CoinMarketCap | https://coinmarketcap.com/currencies/pokerfi/
- [21] Pricing | Calendly | https://calendly.com/pricing
- [22] Pricing | Cal.com | https://cal.com/pricing
- [23] Plans & Pricing · SavvyCal | https://savvycal.com/pricing
- [24] Meetings & Embedded pricing | Whereby | https://whereby.com/information/pricing
- [25] Jitsi Meet Security & Privacy | Jitsi | https://jitsi.org/security/
- [26] Zoom Workplace Pricing - Zoom | https://zoom.us/pricing
- [27] Google Meet: Online Web and Video Conferencing Calls | Google Workspace | https://workspace.google.com/products/meet/
- [28] Learn about features in Google Meet | https://support.google.com/meet/answer/13396001
- [29] Poker Now - Poker with Friends | https://www.pokernow.club/
- [30] Poker Now - Plus | https://www.pokernow.club/subscription/plus
- [31] Virtual Coffee Program | Slack Channel Templates by Donut | https://donut.com/templates/virtual-coffee-program/
- [32] Understanding Gather’s pricing changes (2025) | https://support.gather.town/articles/2500085119-understanding-gather-s-pricing-changes-2025
- [33] Poker Now - Changes on Video/Voice Chat on Poker Now through Jitsi | https://network.pokernow.club/blog/changes-video-voice-chat-poker-now-jitsi
- [34] Poker Now - Privacy Policy | https://network.pokernow.club/privacy
- [35] Cal.diy — community open-source scheduling platform | https://github.com/calcom/cal.com
- [36] Security at Whereby | Whereby | https://whereby.com/information/security
- [37] Using end-to-end encryption (E2EE) in Zoom meetings | https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0065408
- [38] Learn about call & meeting encryption in Google Meet | https://support.google.com/meet/answer/12387251
- [39] Your privacy and security | Calendly Help | https://calendly.com/help/your-privacy-and-security
- [40] Privacy Policy | Cal.com | https://cal.com/privacy