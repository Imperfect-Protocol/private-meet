# Private Meet privacy and trust comparison
Date: 2026-10-10  
POC: Project owner  
TL;DR: Private Meet keeps the call/game path peer-to-peer when direct WebRTC succeeds, but scheduling, email, and connection bootstrap still use services. Competitors distinguish default transport encryption, optional E2EE, and self-hosting; the comparison must do the same.

[Wiki index](README.md) | [Features and pricing](competitor-comparison.md) | [Positioning and priorities](product-positioning.md)

## Data planes, not a single privacy label

Compare five kinds of data separately:

- Account identity and calendar availability.
- Booking details, invitations, and guest identifiers.
- Media, screen content, and call recordings.
- Chat, gameplay actions, and unrevealed cards.
- Network addresses, meeting access tokens, and connection metadata.

A service can protect media well while retaining booking metadata. A peer connection can avoid media storage while letting a guest record the call. Encryption does not eliminate endpoint compromise, participant disclosure, or link theft.

## Calling privacy comparison

| Product / mode | Provider's documented encryption model | What remains outside that claim |
| --- | --- | --- |
| Whereby small rooms | Whereby says small rooms have E2EE so only participants can access calls. [36, lines 16-20] | The reviewed page does not specify the room-size cutoff or topology. Do not infer “P2P” from E2EE alone. |
| Whereby large rooms | Whereby says large-room media is encrypted in transit but decrypted in server memory. [36, lines 16-20] | That is not participant-only confidentiality from the service. |
| Jitsi Meet | Its security page describes DTLS-SRTP network encryption, outer-layer removal at the Videobridge, and optional E2EE for audio, video, and screen sharing. [25, lines 58-78] | E2EE excludes chat and polls and depends on supported clients/browsers. [25, lines 60-66] The source's undated compatibility list is not a current browser test. |
| Zoom default | Default enhanced encryption uses meeting keys generated and managed by Zoom servers. [37, lines 64-70] | This is not E2EE that excludes Zoom from key access. |
| Zoom E2EE | E2EE must be enabled and requires supported apps or Zoom Rooms; free-account hosts verify a phone number. [37, lines 8-10] Participant machines generate keys and relayed media is indecipherable to Zoom. [37, lines 48-50] | Cloud recording, Whiteboard, AI features, streaming, transcription, and polling are disabled among other limits. [37, lines 56-58] Account/meeting metadata is a separate issue. |
| Google Meet meeting links | Meet meetings use cloud encryption, including device-to-Google transport and stored-recording encryption. [38, lines 49-73] | This does not establish participant-only keys for ordinary meetings. Do not advertise all Google Meet use as E2EE. |
| Google Meet personal calling modes | Personal-account calls can enable Additional Encryption; business/education calls do not have that toggle. [38, lines 78-107] Legacy calls have E2EE by default with secrets kept on participant devices. [38, lines 113-140] | Additional Encryption disables several features, including in-call messages and certain interaction features. [38, lines 83-89] Calling modes must not be conflated with scheduled meeting links. |
| Poker Now | Its homepage advertises integrated voice/video. [29, lines 22-36] | Current topology, provider access, and media retention were not established. Historical Jitsi use does not prove today's architecture. |

These rows report vendor documentation. They are not results of independent security audits.

### Whereby recording is a separate setting

Whereby says Meetings recordings are local and its chat is retained in the browser during the meeting. Embedded can use local recording, customer S3 storage, or paid Whereby-provided cloud storage. [36, lines 24-32]

The same page's broad “does not store your video and audio” statement needs those explicit recording exceptions. Do not copy the slogan without the product and recording-mode qualifications.

### Relays do not automatically defeat E2EE

Zoom documents E2EE media relayed through servers that lack the participant decryption keys. [37, lines 48-50] Google's legacy-call explanation similarly describes relays that route media without the shared secret. [38, lines 163-178]

Therefore, topology and key access should be separate columns. A relay can observe metadata while remaining unable to read media. Conversely, “encrypted transport” can terminate at a service. Private Meet should describe the actual WebRTC encryption and key endpoints, including any future TURN path, instead of relying on the word P2P.

## Scheduling and social metadata

| Product | What the reviewed source establishes | Missing or separate evidence |
| --- | --- | --- |
| Calendly | Its help page describes OAuth calendar connections, hosted infrastructure, transport/at-rest encryption, and access controls. [39, lines 98-132] | This does not establish an E2EE scheduler or calling service. Exact retention and permission scopes need further review. |
| Cal.com | Its policy describes account/availability data, attendee identity, booking titles/locations, and form answers. [40, lines 30-69] It describes subprocessors, mainly US processing, integrations, retention, and deletion/export rules. [40, lines 82-126] | Hosting control is distinct from the hosted policy. Cal.diy's deployment model must be evaluated separately. |
| SavvyCal | The retrieved pricing page substantiates feature/price claims. | It is insufficient for a detailed retention, service-access, or media privacy rating. |
| Poker Now | The 2020 policy describes cookies, IPs, game logs/participation, social-login identifiers, and discretionary retention. [34, lines 8-42] | Current media/chat processing and a current domain-wide policy remain unresolved. |
| Donut / Gather | Reviewed sources establish social matching or virtual-office use and, for Gather, a dated price policy. | Their data-retention, content access, and media-encryption models were not established in this investigation. |

“Not established” is an evidence gap, not a finding that a competitor is insecure.

## Private Meet's current local data flow

The following is implementation/documentation context, not evidence of an externally audited deployment. See the local [README](../../README.md), especially “Architecture” and “Deployment and limits,” plus [PLAN](../PLAN.md).

| Component | Current responsibility | Privacy or trust boundary |
| --- | --- | --- |
| Convex | Accounts, availability, transactional booking, invitations, and announced peer identities. | The backend receives scheduling/identity metadata. Backend access and account controls still matter. |
| Resend/email | Invitations, reset email, and calendar attachments. | Email addresses and invitation content traverse an email provider and recipient mail systems. |
| Private Mesh | Bootstrap/signalling relay. | Connection availability and signalling metadata depend on a service. The README says mesh bootstrap signalling is not signed by the mesh. |
| WebRTC peers | Call media and game/chat messaging. | Direct connectivity avoids a media relay in the current configured path, but can reveal network information to the other participant. |
| Per-tab transport identity | BLS-signed application messages checked against Convex-announced keys. | The announced-key trust path and backend authorization remain relevant. Signatures do not independently establish confidentiality. |
| Per-hand masking key | Cryptographic card handling and end-of-hand verification. | Separate from transport signing. The [local README](../../README.md) describes disclosure of the masking key's public key and the shuffle trace during hand verification; it does not describe disclosure of the secret key. |
| Participant invitation URL | Bearer access to a specific participant seat. | Anyone possessing that URL can use the seat. It is a credential, not an ordinary public room link. |

The README states that Convex receives neither hole cards nor bets and that players each keep a game replica. This is a narrower, defensible description than “no data on servers.”

## Limitations that affect privacy and reliability

From the local README:

- Only STUN is configured by default. Corporate networks and restrictive NATs may require TURN; direct connectivity is not guaranteed.
- A second tab replaces the same participant's announced identity.
- Refresh/reconnection starts a new match. In-progress hands and chat are not persisted.
- Browser layout, real media playback, OAuth redirects, email delivery, and two-device gameplay remain manual-test tasks.
- Public booking needs abuse/rate controls and email monitoring.

Ephemeral hands/chat reduce retained history but also reduce recovery and troubleshooting evidence. Avoid presenting that tradeoff as an unconditional privacy win.

## Claim guidance

Suitable architecture descriptions, with implementation context:

> Booking and invitations use our backend. Once connected, the participants exchange the call and game traffic over their peer connection.

> Cards are masked and gameplay messages are signed using the browser protocol. Production security and network reliability still need further verification.

Avoid “no servers,” “fully anonymous,” “no provider can ever observe anything,” and “formally audited” without specific evidence. Do not claim uniqueness: Whereby, Jitsi, Zoom, and Google calling modes already document privacy mechanisms with differing defaults and limits.

## Prelaunch privacy checks

1. Document each provider, collected field, retention period, deletion process, and analytics practice.
2. Verify backend authorization for host/guest bookings and announced peer keys.
3. Keep bearer invitation tokens out of analytics, third-party referrers, and ordinary logs.
4. Define token expiry/revocation and seat takeover behavior.
5. Test camera/microphone start, mute, stop, navigation, and tab cleanup.
6. Add a TURN design and test it without weakening media encryption; document relay metadata.
7. State card-disclosure behavior at hand verification and folded-hand handling.
8. Publish a participant-recording warning and realistic endpoint-compromise limits.
9. Commission review before making strong comparative security guarantees.

These are recommendations, not completed security findings.

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