const express = require('express');
const request = require('supertest');

describe('Teams route', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('reports disabled and unconfigured state', async () => {
    delete process.env.TEAMS_BOT_ENABLED;
    delete process.env.TEAMS_BOT_APP_ID;
    delete process.env.TEAMS_BOT_APP_PASSWORD;
    delete process.env.OPENAI_API_KEY;

    const app = express();
    app.use(express.json());
    app.use('/api/teams', require('../teams'));

    const res = await request(app).get('/api/teams/health').expect(200);

    expect(res.body).toMatchObject({
      enabled: false,
      configured: false,
      botConfigured: false,
      answerConfigured: false,
      endpoint: '/api/teams/messages',
    });
  });

  test('rejects message traffic until explicitly enabled', async () => {
    process.env.TEAMS_BOT_APP_ID = 'app-id';
    process.env.TEAMS_BOT_APP_PASSWORD = 'app-secret';

    const app = express();
    app.use(express.json());
    app.use('/api/teams', require('../teams'));

    const res = await request(app)
      .post('/api/teams/messages')
      .send({ type: 'message' })
      .expect(503);

    expect(res.body.error).toBe('teams_bot_disabled');
  });
});
