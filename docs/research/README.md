# Private Meet research wiki
Date: 2026-10-10  
POC: Project owner  
TL;DR: Ten competitors/substitutes span scheduling, calls, social introductions, and shared poker. Private Meet's combined booked-conversation-and-play workflow is a positioning hypothesis; calendar integration, call reliability, and clear privacy boundaries are immediate priorities.

## Pages

| Page | Contents |
| --- | --- |
| [Competitor comparison](competitor-comparison.md) | Calendly, Cal.com, SavvyCal, Whereby, Jitsi, Zoom, Google Meet, Poker Now, Donut, and Gather; host prices, free limits, guest qualifications, and unresolved pricing. |
| [Privacy and trust](privacy-and-trust.md) | Media encryption modes, hosted scheduling metadata, recording exceptions, service dependencies, and Private Meet's local data flow. |
| [Positioning and priorities](product-positioning.md) | Audience hypotheses, guest reliability, calendar expectations, privacy disclosure, and monetization questions. |
| [Research plan](research-plan.md) | Scope, questions, evidence strategy, and limitations. |

## Main findings

[Calendly](https://calendly.com/pricing) provides free one-to-one scheduling and prices paid seats for hosts, not invitees. [21, lines 16-36] [Cal.com](https://cal.com/pricing) lists a free individual plan and paid per-user plans. [22, lines 12-54] Private Meet should not compete solely on cheap booking or calling when free incumbent workflows already exist.

[Poker Now](https://www.pokernow.club/) advertises link-based browser poker and integrated calls. [29, lines 10-36] Its [Plus page](https://www.pokernow.club/subscription/plus) also contains tiered features, so a “completely free in all respects” comparison is unsafe. [30, lines 6-39] A complete rendered price/tier verification remains open.

[Zoom's documentation](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0065408) distinguishes provider-managed default keys from optional participant-key E2EE. [37, lines 48-70] [Google Meet's documentation](https://support.google.com/meet/answer/12387251) distinguishes meeting cloud encryption from selected personal-call encryption modes. [38, lines 49-107] [Whereby](https://whereby.com/information/security) distinguishes small-room E2EE, large-room server-memory decryption, and recording storage options. [36, lines 16-32] “Encrypted” and “P2P” need precise meanings in product copy.

The local [README](../../README.md) describes a peer call/game path alongside Convex booking/authentication, email delivery, and mesh signalling. It also documents STUN-only default connectivity, bearer participant links, and reset-on-refresh gameplay. Those limits are part of the comparison, not footnotes to a serverless claim.

## Scope

Private Meet uses play chips and does not include wallets, cash wagers, blockchain settlement, or a published subscription schedule in the reviewed local scope. The investigation therefore compares subscriptions, host/guest access, integrated activities, and privacy rather than gambling rake.

Cal.diy is discussed as an additional deployment variant, not counted as another directly comparable hosted service.

## Method and limitations

A delegated research track and follow-up used official pricing, help, privacy, security, and product pages. The final review corrected domain, billing, encryption-mode, and recording qualifications. Sources were accessed on October 10, 2026; stale policies and dated pricing-change notices remain labelled.

Glasser's free catalog was checked, but no paid endpoint was run: available research access covered the same job. No Glasser balance was spent.

No accounts were created or competitor calls tested. A final attempt to inspect dynamic Poker Now pricing was blocked by an unavailable browser dependency. Its exact tier prices and payer requirements remain unresolved instead of being filled from snippets. Whereby and Donut numeric pricing also remain incomplete. Privacy mechanisms reported by vendors were not independently audited.

## Maintenance

Recheck plan toggles, billing terms, free limits, and security modes before publishing sales comparisons. Keep the scheduling, media, gameplay, and metadata planes separate. Validate audience hypotheses with actual hosts and guests.

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