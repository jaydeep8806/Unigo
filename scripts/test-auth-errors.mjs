import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accountErrorMessage } from '../src/services/authErrors.js';

test('Account errors distinguish transport failures from authentication errors', () => {
  for (const message of ['Failed to fetch', 'Network request failed', 'Load failed']) {
    assert.match(accountErrorMessage({ message }), /Cannot reach the UNIGO account server/);
  }
  assert.equal(accountErrorMessage({ message: 'Invalid login credentials' }), 'Invalid login credentials');
  assert.equal(accountErrorMessage({ message: 'Email rate limit exceeded' }), 'Email rate limit exceeded');
  assert.match(accountErrorMessage(null), /Please try again/);
});
