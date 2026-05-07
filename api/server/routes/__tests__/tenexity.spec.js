const express = require('express');
const request = require('supertest');

jest.mock('~/server/middleware', () => ({
  requireJwtAuth: (req, res, next) => {
    req.user = { id: 'user-1' };
    next();
  },
}));

describe('Tenexity readiness route', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function setupApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/tenexity', require('../tenexity'));
    return app;
  }

  test('reports demo readiness without exposing secret values', async () => {
    process.env.APP_TITLE = 'Tenexity AI Workspace';
    process.env.DOMAIN_CLIENT = 'https://chat.tenexity.ai';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OPENAI_MODELS = 'gpt-5.4-mini';
    process.env.ALLOW_EMAIL_LOGIN = 'true';
    process.env.ALLOW_REGISTRATION = 'false';
    process.env.TEAMS_BOT_ENABLED = 'false';

    const res = await request(setupApp()).get('/api/tenexity/readiness').expect(200);

    expect(res.body.app).toMatchObject({
      title: 'Tenexity AI Workspace',
      customDomainReady: true,
    });
    expect(res.body.chatGPT).toMatchObject({
      configured: true,
      models: 'gpt-5.4-mini',
      defaultMode: 'ChatGPT',
    });
    expect(res.body.access).toMatchObject({
      emailLogin: true,
      registrationOpen: false,
      registrationClosed: true,
    });
    expect(JSON.stringify(res.body)).not.toContain('sk-test');
  });

  test('returns the source catalog', async () => {
    const res = await request(setupApp()).get('/api/tenexity/source-catalog').expect(200);

    expect(res.body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'google-workspace' }),
        expect.objectContaining({ id: 'microsoft-365', status: 'teams-code-ready' }),
        expect.objectContaining({ id: 'sql-reporting' }),
      ]),
    );
  });
});
