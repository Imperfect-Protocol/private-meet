import { Modal } from '../Modal.jsx';
import { gameLabel } from '../../lib/meet/games.js';
import { ViewerTime } from '../../lib/time/ViewerTime.js';

const INVITE_LABEL = {
  queued: 'Sending…',
  sent: 'Awaiting reply',
  failed: 'Email failed',
  accepted: 'Accepted',
  declined: 'Declined',
};

export function meetingLink(meetingId, token) {
  return `${window.location.origin}/meet/${meetingId}?k=${token}`;
}

export function MeetingPopup({ meeting, onClose }) {
  const link = meetingLink(meeting.id, meeting.hostToken);
  return (
    <Modal title={meeting.title} onClose={onClose}>
      <dl className="space-y-3 text-sm">
        <Row label="When">
          {ViewerTime.fullDate(meeting.startsAt)}<br />
          {ViewerTime.range(meeting.startsAt, meeting.durationMinutes)} · {meeting.durationMinutes} min
        </Row>
        <Row label="Game">{gameLabel(meeting.game)}</Row>
        <Row label="Guest">{meeting.guestName}</Row>
        <Row label="Email"><a className="text-rose-300 hover:underline" href={`mailto:${meeting.guestEmail}`}>{meeting.guestEmail}</a></Row>
        <Row label="Status">
          <span className="capitalize">{meeting.status}</span>
          <span className="text-slate-400"> · you: {INVITE_LABEL[meeting.hostInvite]} · guest: {INVITE_LABEL[meeting.guestInvite]}</span>
        </Row>
        <Row label="Meeting link">
          <a className="break-all text-rose-300 hover:underline" href={link} target="_blank" rel="noreferrer">{link}</a>
        </Row>
      </dl>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" type="button" onClick={() => navigator.clipboard.writeText(link)}>Copy link</button>
        <a className="btn-primary" href={link} target="_blank" rel="noreferrer">Open table</a>
      </div>
    </Modal>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-slate-100">{children}</dd>
    </div>
  );
}
