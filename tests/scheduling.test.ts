import assert from 'node:assert/strict';
import test from 'node:test';
import { SlotGrid } from '../convex/model/slots';
import { ZonedClock, MINUTE_MS } from '../convex/model/zonedTime';
import { meetingStatusFrom } from '../convex/model/tokens';
import { ChatLog } from '../src/lib/meet/ChatLog.js';

const monday = Date.UTC(2026, 9, 12);
const windows = [{ weekday: 1, startMinute: 540, endMinute: 660 }];

test('availability in Dublin appears as UTC slots; busy intervals block the whole duration', () => {
  const grid = new SlotGrid(new ZonedClock('Europe/Dublin'), windows, [{ startsAt: monday + 9 * 60 * MINUTE_MS, durationMinutes: 30 }]);
  const slots = grid.open(monday, monday + 24 * 60 * MINUTE_MS, 30, monday - 1);
  assert.deepEqual(slots, [8, 8.25, 8.5, 9.5].map((hour) => monday + hour * 60 * MINUTE_MS));
});

test('working hours follow daylight saving time', () => {
  const clock = new ZonedClock('Europe/Dublin');
  assert.equal(clock.instant({ year: 2026, month: 10, day: 19 }, 540), Date.UTC(2026, 9, 19, 8));
  assert.equal(clock.instant({ year: 2026, month: 10, day: 26 }, 540), Date.UTC(2026, 9, 26, 9));
});

test('slot duration must fit inside a window and not be in the past', () => {
  const grid = new SlotGrid(new ZonedClock('UTC'), windows, []);
  assert.deepEqual(grid.open(monday, monday + 24 * 60 * MINUTE_MS, 60, monday + 10 * 60 * MINUTE_MS), []);
  assert.equal(grid.open(monday, monday + 24 * 60 * MINUTE_MS, 90, 0).length, 0);
  assert.equal(grid.open(monday + 1, monday, 30, 0).length, 0);
});

test('meeting is confirmed only after both invitations are accepted', () => {
  assert.equal(meetingStatusFrom(['sent', 'accepted']), 'pending');
  assert.equal(meetingStatusFrom(['accepted', 'accepted']), 'confirmed');
  assert.equal(meetingStatusFrom(['accepted', 'declined']), 'declined');
});

test('chat unread count clears when the window opens and history is bounded', () => {
  const chat = new ChatLog();
  chat.addIncoming(1, 'hello', 1);
  assert.equal(chat.unread, 1);
  chat.setOpen(true);
  assert.equal(chat.unread, 0);
  chat.addIncoming(1, 'hello again', 2);
  assert.equal(chat.unread, 0);
  for (let index = 0; index < 220; index += 1) chat.add(0, `${index}`, index);
  assert.equal(chat.messages.length, 200);
});
