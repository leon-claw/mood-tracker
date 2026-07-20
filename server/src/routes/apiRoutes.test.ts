import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app';
import { createExportEnvelope, SyncData } from '../domain/portableData';
import { MemoryRepository } from '../repositories/memoryRepository';
import { createApiRouter } from './api';
import { createDefaultAppPreferences } from '../../../shared/appPreferences';

const repo = new MemoryRepository();
const app = createApp({
  routes: [
    createApiRouter({
      repository: repo,
      jwtSecret: 'test-secret-with-enough-length',
      captchaTextFactory: () => 'a7b9',
    }),
  ],
});

const guest = request(app);
await guest
  .get('/api/health')
  .set('Origin', 'capacitor://localhost')
  .expect(200)
  .expect((response) => {
    assert.equal(response.headers['access-control-allow-origin'], 'capacitor://localhost');
  });

await guest
  .get('/api/health')
  .set('Origin', 'http://localhost')
  .expect(200)
  .expect((response) => {
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost');
  });

const captchaResponse = await guest.get('/api/captcha').expect(200);
assert.equal(typeof captchaResponse.body.captchaId, 'string');
assert.match(captchaResponse.body.svg, /<svg/);
assert.equal(typeof captchaResponse.body.expiresAt, 'string');

const userAgent = request.agent(app);
await userAgent
  .post('/api/auth/register')
  .send({
    email: 'USER@example.com',
    password: 'StrongPass123',
    captchaId: captchaResponse.body.captchaId,
    captchaText: ' A7 B9 ',
  })
  .expect(200)
  .expect((response) => {
    assert.equal(response.body.user.email, 'user@example.com');
    const cookies = response.headers['set-cookie'];
    const cookieList = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
    assert.ok(cookieList.some((cookie: string) => cookie.includes('mood_tracker_session')));
    assert.equal(response.body.token, undefined);
  });

await guest
  .post('/api/auth/register')
  .send({
    email: 'other@example.com',
    password: 'StrongPass123',
    captchaId: captchaResponse.body.captchaId,
    captchaText: 'a7b9',
  })
  .expect(400)
  .expect((response) => {
    assert.equal(response.body.error.code, 'INVALID_CAPTCHA');
  });

await userAgent.get('/api/me').expect(200).expect((response) => {
  assert.equal(response.body.user.email, 'user@example.com');
});

await guest
  .post('/api/auth/login')
  .send({ email: 'user@example.com', password: 'wrong' })
  .expect(401)
  .expect((response) => {
    assert.equal(response.body.error.code, 'INVALID_CREDENTIALS');
  });

await userAgent
  .patch('/api/me/password')
  .send({ currentPassword: 'StrongPass123', newPassword: 'NewStrongPass456' })
  .expect(200);

await userAgent.post('/api/auth/logout').expect(200);
await request.agent(app)
  .post('/api/auth/login')
  .send({ email: 'user@example.com', password: 'StrongPass123' })
  .expect(401);

const loggedInAgent = request.agent(app);
await loggedInAgent
  .post('/api/auth/login')
  .send({ email: 'user@example.com', password: 'NewStrongPass456' })
  .expect(200);

const bearerLoginResponse = await guest
  .post('/api/auth/login')
  .set('X-Mood-Tracker-Auth', 'bearer')
  .send({ email: 'user@example.com', password: 'NewStrongPass456' })
  .expect(200)
  .expect((response) => {
    assert.equal(response.body.user.email, 'user@example.com');
    assert.equal(typeof response.body.token, 'string');
    assert.equal(response.headers['set-cookie'], undefined);
  });
const bearerToken = bearerLoginResponse.body.token;

await guest
  .get('/api/me')
  .set('Authorization', `Bearer ${bearerToken}`)
  .expect(200)
  .expect((response) => {
    assert.equal(response.body.user.email, 'user@example.com');
  });

const syncData: SyncData = {
  entries: [
    {
      id: 'entry-1',
      date: '2026-07-08',
      values: {
        sleepQuality: 8,
        moodLevel: 9,
        energyLevel: 7,
        dietHealth: 6,
        workEfficiency: 8,
        activities: ['running'],
        weather: ['sunny'],
        social: ['party'],
        achievementMilestones: ['newStage'],
        journal: '云端同步',
        achievement: '完成 API 测试',
      },
    },
  ],
  points: 500,
  unlockedItems: ['plant_succulent', 'badge_focus'],
  isPremiumUnlocked: true,
  preferences: {
    enabledRecordFieldIds: ['sleepQuality', 'moodLevel', 'journal'],
    reminders: { enabled: true, times: ['08:30', '21:00'] },
  },
};

await loggedInAgent.put('/api/sync').send(syncData).expect(200).expect((response) => {
  assert.deepEqual(response.body, syncData);
});

await loggedInAgent.get('/api/sync').expect(200).expect((response) => {
  assert.deepEqual(response.body, syncData);
});

await guest
  .get('/api/sync')
  .set('Authorization', `Bearer ${bearerToken}`)
  .expect(200)
  .expect((response) => {
    assert.deepEqual(response.body, syncData);
  });

await loggedInAgent
  .post('/api/entries')
  .send({
    date: '2026-07-08',
    values: {
      sleepQuality: 4,
      moodLevel: 5,
      activities: ['fitness', 'coffee'],
      journal: '更新同一天',
    },
  })
  .expect(200)
  .expect((response) => {
    assert.equal(response.body.entry.date, '2026-07-08');
    assert.equal(response.body.entry.values.sleepQuality, 4);
    assert.deepEqual(response.body.entry.values.activities, ['fitness']);
  });

await loggedInAgent
  .put('/api/preferences')
  .send({ enabledRecordFieldIds: ['activities', 'journal'] })
  .expect(200)
  .expect((response) => {
    assert.deepEqual(response.body.preferences, {
      enabledRecordFieldIds: ['activities', 'journal'],
      reminders: createDefaultAppPreferences().reminders,
    });
  });

await loggedInAgent
  .put('/api/preferences')
  .send({
    enabledRecordFieldIds: ['activities', 'journal'],
    reminders: { enabled: true, times: ['09:00', '21:30'] },
  })
  .expect(200)
  .expect((response) => {
    assert.deepEqual(response.body.preferences.reminders, {
      enabled: true,
      times: ['09:00', '21:30'],
    });
  });

await loggedInAgent
  .put('/api/preferences')
  .send({ enabledRecordFieldIds: [] })
  .expect(400)
  .expect((response) => {
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

await loggedInAgent.get('/api/export').expect(200).expect((response) => {
  assert.equal(response.body.app, 'mood-tracker');
  assert.equal(response.body.version, 1);
  assert.equal(response.body.data.entries.length, 1);
  assert.equal(response.body.data.entries[0].values.journal, '更新同一天');
});

const replacement = createExportEnvelope({
  entries: [],
  points: 0,
  unlockedItems: [],
  isPremiumUnlocked: false,
  preferences: createDefaultAppPreferences(),
});

await loggedInAgent.post('/api/import').send(replacement).expect(200).expect((response) => {
  assert.deepEqual(response.body, replacement.data);
});

await loggedInAgent.get('/api/sync').expect(200).expect((response) => {
  assert.deepEqual(response.body, replacement.data);
});

await guest.get('/api/sync').expect(401);

console.log('server api route tests passed');
