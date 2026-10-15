import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEmail, normalizeCode, validateStandup, errorKey } from '../src/validate.js';
import { detectLang, strings } from '../src/i18n.js';

test('email and 6-digit code', () => {
  assert.ok(isEmail('a@b.co'));
  assert.ok(!isEmail('a@b'));
  assert.equal(normalizeCode('123 456'), '123456');
  assert.equal(normalizeCode('١٢٣٤٥٦'), '123456');
  assert.equal(normalizeCode('12345'), null);
});

test('standup mirrors the server rules', () => {
  assert.deepEqual(validateStandup({ did: 'ok' }), { ok: false, error: 'standup_empty' });
  assert.equal(validateStandup({ next: 'ship the cli' }).ok, true);
  assert.equal(validateStandup({ did: 'x'.repeat(601) }).error, 'too_long');
  assert.equal(validateStandup({ did: 'done', blockers: 'b'.repeat(401) }).error, 'too_long');
  assert.equal(validateStandup({ did: '  fixed bug  ' }).value.did, 'fixed bug');
});

test('server errors map to friendly messages in both languages', () => {
  assert.equal(errorKey({ code: 'otp_expired', message: 'Token has expired or is invalid' }), 'wrongCode');
  assert.equal(errorKey({ code: '42501', message: 'not_member' }), 'notMember');
  assert.equal(errorKey({ code: 'offline' }), 'offline');
  assert.equal(errorKey({ code: 'signed_out' }), 'notSignedIn');
  assert.equal(errorKey({ status: 429, message: 'x' }), 'tooMany');
  assert.equal(errorKey({ message: 'weird' }), null);
  for (const lang of ['en', 'ar'])
    for (const k of ['wrongCode', 'notMember', 'offline', 'notSignedIn', 'tooMany', 'noAccount', 'standupEmpty', 'tooLong'])
      assert.ok(strings(lang)[k], `${lang}.${k}`);
});

test('language detection: flag, env, locale', () => {
  assert.equal(detectLang({ flags: { en: true }, env: { LANG: 'ar_SD.UTF-8' } }), 'en');
  assert.equal(detectLang({ flags: { ar: true }, env: {} }), 'ar');
  assert.equal(detectLang({ env: { ISHRAQA_LANG: 'ar' } }), 'ar');
  assert.equal(detectLang({ env: { LANG: 'ar_SD.UTF-8' } }), 'ar');
  assert.equal(detectLang({ env: { LANG: 'en_US.UTF-8' } }), 'en');
  assert.equal(detectLang({ env: { LANG: 'C.UTF-8' }, intl: 'ar-EG' }), 'ar');
  assert.equal(detectLang({ env: {}, intl: 'fr-FR' }), 'en');
});

test('both languages define the same keys', () => {
  assert.deepEqual(Object.keys(strings('ar')).sort(), Object.keys(strings('en')).sort());
});
