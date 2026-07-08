import assert from 'node:assert/strict';
import {
  comparePassword,
  hashPassword,
} from './password';
import {
  createCaptchaChallenge,
  normalizeCaptchaAnswer,
  verifyCaptchaAnswer,
} from './captcha';
import {
  signSessionToken,
  verifySessionToken,
} from './session';

const passwordHash = await hashPassword('StrongPass123');
assert.notEqual(passwordHash, 'StrongPass123');
assert.equal(await comparePassword('StrongPass123', passwordHash), true);
assert.equal(await comparePassword('wrong-password', passwordHash), false);

assert.equal(normalizeCaptchaAnswer(' A b 9 '), 'ab9');

const captcha = await createCaptchaChallenge('k7p4');
assert.equal(captcha.answer, 'k7p4');
assert.match(captcha.svg, /<svg/);
assert.equal(await verifyCaptchaAnswer(' K7 P4 ', captcha.answerHash), true);
assert.equal(await verifyCaptchaAnswer('K7P5', captcha.answerHash), false);

const token = signSessionToken({ userId: 'user-1', email: 'test@example.com' }, 'test-secret', '10m');
assert.deepEqual(verifySessionToken(token, 'test-secret'), {
  userId: 'user-1',
  email: 'test@example.com',
});
assert.equal(verifySessionToken(`${token}x`, 'test-secret'), null);

console.log('server auth utility tests passed');
