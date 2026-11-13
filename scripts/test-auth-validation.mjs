import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateAuthFields } from '../src/services/authValidation.js';

const valid = { name: 'Asha Rao', email: 'asha@example.com', password: 'Ride1234', confirmPassword: 'Ride1234' };

test('signup accepts international names and trims surrounding email/name whitespace', () => {
  for (const name of [' Asha Rao ', 'आरव कुमार', '李明', 'Jean-Luc', 'O’Connor', 'José', 'Asha']) {
    assert.deepEqual(validateAuthFields({ ...valid, name, email: ' asha+rides@example.co.in ' }, true), {});
  }
});

test('signup reports every missing field and rejects invalid names', () => {
  assert.deepEqual(Object.keys(validateAuthFields({}, true)).sort(), ['confirmPassword', 'email', 'name', 'password']);
  for (const name of [' ', 'A', 'A'.repeat(81), '1234', 'Asha<>', 'Asha\nRao', '--']) {
    assert.ok(validateAuthFields({ ...valid, name }, true).name, name);
  }
});

test('both forms reject malformed and oversized email addresses', () => {
  for (const email of ['asha', 'asha@', '@example.com', 'a b@example.com', 'a@b', 'a@@b.com', 'a@.com', 'a@b..com', `${'a'.repeat(250)}@b.com`]) {
    for (const signup of [false, true]) assert.ok(validateAuthFields({ ...valid, email }, signup).email, email);
  }
});

test('signup enforces password boundaries and confirmation', () => {
  for (const password of ['12345', 'a'.repeat(13)]) {
    assert.ok(validateAuthFields({ ...valid, password, confirmPassword: password }, true).password);
  }
  for (const password of ['123456', 'abcdef', 'a'.repeat(12)]) {
    assert.deepEqual(validateAuthFields({ ...valid, password, confirmPassword: password }, true), {});
  }
  assert.ok(validateAuthFields({ ...valid, confirmPassword: 'ride1234' }, true).confirmPassword);
  assert.ok(validateAuthFields({ ...valid, confirmPassword: `${valid.password} ` }, true).confirmPassword);
});

test('login accepts legacy passwords and does not require signup-only fields', () => {
  assert.deepEqual(validateAuthFields({ email: valid.email, password: 'old' }), {});
  assert.deepEqual(validateAuthFields({ email: valid.email, password: '  exact password  ' }), {});
  assert.ok(validateAuthFields({ email: valid.email, password: '' }).password);
});
