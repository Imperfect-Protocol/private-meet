import assert from 'node:assert/strict';
import test from 'node:test';
import { otherAttendeeEmail } from '../convex/model/inviteEmail';

test('host invitation replies to the guest attendee', () => {
  assert.equal(otherAttendeeEmail('host', 'host@example.com', 'guest@example.com'), 'guest@example.com');
});

test('guest invitation replies to the host attendee', () => {
  assert.equal(otherAttendeeEmail('guest', 'host@example.com', 'guest@example.com'), 'host@example.com');
});

test('counterpart is chosen by attendee role even if both use the same email', () => {
  assert.equal(otherAttendeeEmail('host', 'shared@example.com', 'shared@example.com'), 'shared@example.com');
  assert.equal(otherAttendeeEmail('guest', 'shared@example.com', 'shared@example.com'), 'shared@example.com');
});
