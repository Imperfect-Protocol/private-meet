# Private Meet competitors: features and pricing

Date: 2026-10-10  
POC: Project owner  
TL;DR: Private Meet competes with combinations of a scheduler, a call link, and a shared activity. Poker Now is the closest shared-game substitute; Calendly and Cal.com set the scheduling baseline. Free incumbent options make “cheaper calls” a weak positioning claim.

[Wiki index](README.md) | [Privacy comparison](privacy-and-trust.md) | [Positioning and priorities](product-positioning.md)

## Scope and evidence

The comparison follows the local [Private Meet README](../../README.md): booking links, guest invitations, two-person play-chip poker, peer-to-peer audio/video, and chat. It does not compare cash-gambling rake or blockchain settlement, which are outside this app’s scope.

Prices below are published USD figures where the source establishes the currency. A monthly equivalent billed annually is not a monthly-billing offer. Where the captured page did not identify billing cadence, that ambiguity is retained. Taxes, regional prices, and checkout changes were not tested.

This is desk research, not an account-level or real-call evaluation. Security claims are addressed separately in [privacy and trust](privacy-and-trust.md).

## Scheduling competitors

| Product | Booking workflow and useful baseline | Published host price | Guest and billing qualifications |
| --- | --- | --- | --- |
| Calendly | Free includes one event type, one calendar connection, and one-to-one scheduling. Standard adds unlimited event types and multiple calendars. [21, lines 16-46] | The displayed yearly-billed Standard price is $10/seat/month. [21, lines 10-36] Teams is $16/seat/month in that display. [21, lines 70-78] | Seats are for hosts connecting calendars; invitees do not require a seat. [21, lines 34-36] Invitees do not require an account. [21, lines 74-76] The $10 figure must not be presented as month-to-month billing. |
| Cal.com | The pricing page lists a free individual plan and unlimited event types, calendar connections, and meetings. [22, lines 12-54] Meeting locations include external conferencing; availability includes timezone and conflict checks. [22, lines 60-70] | Teams is displayed at $12/month/user, Organizations at $28/month/user, and Enterprise at custom pricing. [22, lines 18-42] | The page extract includes a savings label but does not establish which billing cadence produces the displayed prices. No guest subscription charge is established. Do not equate optional payment collection for a booking with a guest platform-seat fee. |
| SavvyCal | Its plans describe scheduling links, polls, team scheduling, and conferencing integrations; Premium adds paid bookings, custom domains, and delegation. [23, lines 6-78] | Basic is displayed at $10/user/month and Premium at $17/user/month. [23, lines 6-40] | The same page advertises “Save 2 months,” but the retrieved text does not resolve the displayed billing cadence or annual total. Invitee charges and trial duration were not established. |

For a 30-minute host/guest introduction, compare one host’s subscription, not two paid seats unless the service explicitly requires both. The guest’s cost of accepting a booking is different from an optional price the host charges for the session.

## Calling competitors

| Product | Role in the substitute workflow | Price and limits supported by sources | Qualification |
| --- | --- | --- | --- |
| Whereby | Meetings is a licensed-user product; Embedded is usage-billed infrastructure for adding calls to an app. [24, lines 24-70] | The retrieved pricing page did not expose exact amounts or free-plan limits. | Distinguish the end-user Meetings subscription from Embedded usage. Neither is evidence of a bundled scheduler or poker game. |
| Jitsi Meet | Browser conferencing with a documented self-hosting option. [25, lines 54-56] | A comparable paid-seat schedule and public-host usage limits were not established by the security source. | Self-hosting replaces a vendor subscription with infrastructure and administration costs; it is not evidence of a zero operating-cost service. |
| Zoom Workplace | Basic is free with 40-minute meetings and up to 100 participants. [26, lines 209-227] | Pro is displayed at $14.16/user/month, billed annually. [26, lines 331-339] | The annual display is a monthly equivalent of an upfront annual charge and excludes applicable taxes and fees. [26, lines 1103-1103] A 30-minute introduction already fits Basic’s duration limit. |
| Google Meet | A Google Account can host no-cost meetings for up to 100 participants; guests sign in or obtain organizer approval. [27, lines 707-710] | Help documentation gives basic limits of 24 hours for one-to-one meetings and one hour for three or more participants. [28, lines 54-65] | The marketing page describes no time limit for one-to-one meetings. [27, lines 710-710] Use the more specific help limit, and retain this source discrepancy. Paid Workspace pricing was not compared. |

Google Meet's meeting links and its personal/legacy calling modes have different encryption behavior. Do not infer a meeting’s privacy from the existence of an E2EE calling option.

## Shared play and social substitutes

| Product | Relevant workflow | Price evidence | Important limit |
| --- | --- | --- | --- |
| Poker Now | The current `.club` page advertises private browser poker rooms, link-based joining without signup, heads-up or up to ten players, and built-in voice/video. [29, lines 10-36] | The homepage advertises free play. [29, lines 52-59] Its Plus page also contains a multi-tier feature matrix with different voice/video and tournament allowances. [30, lines 6-39] Exact subscription amounts and payer rules were not reliably captured. | It is a strong substitute for meeting at a poker table, but the reviewed pages do not establish a booking/calendar workflow. Do not call every feature free. |
| Donut | Its virtual-coffee template matches coworkers for recurring introductions through workplace integrations. [31, lines 88-116] | The reviewed template offers a free trial path but does not establish a paid price or free limits. | A substitute for organizing internal social introductions, not a public guest booking link or a proven bundled call/game service. |
| Gather | Its virtual-office product includes guest participation allowances. [32, lines 120-124] | A pricing-change article effective September 15, 2025 states $15/user/month monthly or $12/user/month annual, with no free tier and a 30-day trial for new Gather 2.0 offices. [32, lines 8-39] | The article describes at least 30 guest-hours/month, with scaling allowances for larger offices. [32, lines 120-124] This is a dated policy page, not a newly verified 2026 checkout quote. |

### Poker Now: what remains unresolved

Use `pokernow.club` as the main product entry point. The `.com` page alone is insufficient for a current subscription comparison.

An official Poker Now network post says free embedded Jitsi voice/video could no longer be offered because usage exceeded the free allowance, and discusses users opening Jitsi separately. [33] The current homepage advertises integrated voice/video. [29, lines 22-36] The Plus page lists one column with 30 minutes/day and other columns with unlimited voice/video. [30, lines 14-20]

The retrieved matrix lost its tier headers and pricing. The undated discontinuation post could predate a later reintroduction. A live browser check could not be completed in this environment because the browser integration lacked its required dependency. Consequently, this wiki does not assign the limits or quote a subscription amount from a search snippet. Working feature status and who must subscribe remain verification tasks.

The network privacy policy is dated October 14, 2020, references the older `.com` domain, and describes cookies, IP addresses, game participation/logs, and login identifiers. [34, lines 8-42] Its age and scope ambiguity reduce confidence in claims about current media handling.

## Self-hosted scheduling needs a separate row

The repository page reached through the historical Cal.com repository URL describes Cal.diy for personal, non-production self-hosting and points commercial users to hosted Cal.com or invited on-prem enterprise access. [35, lines 8-12] It identifies Cal.diy as an MIT-licensed community fork with enterprise/commercial features removed and no hosted managed version. [35, lines 28-40]

Do not transfer Cal.diy’s license, feature set, or operating-cost assumptions to current hosted Cal.com plans. Equally, the absence of self-hosting on a pricing page would not prove it is unavailable.

## Practical cost scenarios

### One host, one guest, 30 minutes

A scheduler’s free tier plus a free call service is a price floor, provided its feature limits fit the host. The source-backed alternatives include Calendly Free, Cal.com Individual, Zoom Basic, and no-cost Google Meet. None of the reviewed evidence establishes that the guest must purchase a second scheduler seat.

Adding a private Poker Now room may replace the shared activity, but introducing another link and unresolved call/subscription behavior can add friction. That friction is a product hypothesis to test, not a measured advantage for Private Meet.

### Paid host workflow

Calendly Standard at its published annual display is $10 per host seat/month. A host might already receive calling through another existing subscription. Do not add a paid Zoom plan automatically to every scheduler comparison.

### Community/team workflow

Gather uses member pricing and guest-hour allowances. Donut’s reviewed source did not establish a numeric price. Private Meet does not yet establish matching, team administration, or virtual-office feature parity; a price comparison across those different jobs can mislead.

## Update checklist

Before using this wiki in pricing or sales material:

1. Recheck billing toggles, currency, tax treatment, and checkout date.
2. Capture Poker Now’s complete rendered subscription table and payer rules.
3. Obtain Whereby’s actual Meetings/Embedded prices for the relevant usage.
4. Confirm Gather’s current plan rather than relying only on its 2025 change notice.
5. Treat free-plan limits separately from host-seat subscriptions and guest charges.
6. Re-run live joining/calling tests before making reliability comparisons.

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