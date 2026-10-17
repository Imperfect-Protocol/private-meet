import assert from 'node:assert/strict';
import test from 'node:test';
import { assertAccountCreationAllowed, assertPasswordFlowAllowed } from '../convex/model/accountAccess';
import { ACCESS_REQUEST_LIMITS, validateAccessRequest } from '../convex/model/accessRequest';

const request = { displayName: 'Ada Lovelace', email: 'ada@example.com', message: 'I would like to try Private Meet.' };

test('access requests normalize contact details without changing display-name case', () => {
  assert.deepEqual(validateAccessRequest({
    displayName: '  Ada Lovelace  ',
    email: '  ADA@Example.com ',
    message: ' Hello! ',
  }), { displayName: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello!' });
});

test('access requests require a display name, valid email and message', () => {
  assert.throws(() => validateAccessRequest({ ...request, displayName: '  ' }), /display name/);
  assert.throws(() => validateAccessRequest({ ...request, email: 'not-an-email' }), /email/);
  assert.throws(() => validateAccessRequest({ ...request, message: '  ' }), /message/);
});

test('access requests enforce length limits', () => {
  assert.throws(() => validateAccessRequest({ ...request, displayName: 'a'.repeat(ACCESS_REQUEST_LIMITS.displayName + 1) }), /display name/);
  assert.throws(() => validateAccessRequest({ ...request, email: `${'a'.repeat(254)}@example.com` }), /email/);
  assert.throws(() => validateAccessRequest({ ...request, message: 'a'.repeat(ACCESS_REQUEST_LIMITS.message + 1) }), /message/);
  assert.doesNotThrow(() => validateAccessRequest({
    ...request,
    displayName: 'a'.repeat(ACCESS_REQUEST_LIMITS.displayName),
    message: 'a'.repeat(ACCESS_REQUEST_LIMITS.message),
  }));
});

test('direct password sign-up is blocked but existing sign-in and password reset remain available', () => {
  assert.throws(() => assertPasswordFlowAllowed('signUp'), /by request only/);
  for (const flow of ['signIn', 'reset', 'reset-verification', 'email-verification']) {
    assert.doesNotThrow(() => assertPasswordFlowAllowed(flow));
  }
});

test('GitHub OAuth may create new accounts', () => {
  assert.doesNotThrow(() => assertAccountCreationAllowed(null, 'github', 'oauth'));
});

test('non-GitHub providers cannot create accounts', () => {
  assert.throws(() => assertAccountCreationAllowed(null, 'password', 'credentials'), /by request only/);
  assert.throws(() => assertAccountCreationAllowed(null, 'password-reset', 'email'), /by request only/);
  assert.throws(() => assertAccountCreationAllowed(null, 'google', 'oauth'), /by request only/);
  assert.throws(() => assertAccountCreationAllowed(null, 'github', 'credentials'), /by request only/);
});

test('existing or verified-linked accounts can still sign in and recover passwords', () => {
  for (const provider of [
    { id: 'github', type: 'oauth' },
    { id: 'password', type: 'credentials' },
    { id: 'password-reset', type: 'email' },
  ]) {
    assert.doesNotThrow(() => assertAccountCreationAllowed('existing-user', provider.id, provider.type));
  }
});
