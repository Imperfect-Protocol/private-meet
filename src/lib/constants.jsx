const TERMS_URL = "https://privatemeet.imperfectprotocol.ie/terms"
const PRIVACY_URL = "https://privatemeet.imperfectprotocol.ie/privacy"

export const PRIVATE_POKER_DEMO_DISCLAIMER =
  (
<p className="legal-footnote">
  Private Meet (18+) offers poker and chess for entertainment only. No real-money gambling, wagering, prizes or payouts. Poker chips have no monetary value.
  <br />
  Games are peer-to-peer; calls are not recorded. Booking data is processed in accordance with our <a href={PRIVACY_URL}>Privacy Policy</a>.
  <br />
  By continuing, you agree to our <a href={TERMS_URL}>Terms</a>. Social casino gaming success does not imply future success at real-money gambling. © 2026 Private Meet · Imperfect Protocol.
</p>
  )

export const PRIVATE_POKER_DEMO_DISCLAIMER_FULL =
  (
    <p className="legal-footnote">
      Private Meet is intended for adults aged 18 and over and provides poker and chess solely for recreational entertainment. Poker chips are virtual numerical indicators with no monetary value and cannot be purchased, sold, transferred or redeemed. Chess involves no chips or wagering. No entry fees, bets, deposits, real-money gambling, prizes or payouts are offered. Games take place exclusively peer-to-peer between participants. Poker uses collaborative cryptographic shuffling (Mental Poker), without server-side RNG. Practice or success at social casino gaming does not imply future success at real-money gambling.
      <br /><br />
      Private Meet collects email addresses and display names for meeting bookings. Pseudonymised, encrypted WebRTC signalling data (SDP) may be temporarily stored to establish connections and is deleted once a peer-to-peer connection is established. Audio and video calls are not recorded or stored by Private Meet. Independent internet and network providers may process communications data under their own policies.
      <br /><br />
      By using Private Meet, you agree to our <a href={TERMS_URL}>Terms of Service</a> and acknowledge our <a href={PRIVACY_URL}>Privacy Policy</a>.
      <br /><br />
      © 2026 Private Meet · Imperfect Protocol. A more memorable way to meet.
    </p>
  )
