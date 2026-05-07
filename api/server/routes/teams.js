const express = require('express');
const {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  createBotFrameworkAuthenticationFromConfiguration,
} = require('botbuilder');
const { logger } = require('@librechat/data-schemas');
const { TenexityTeamsBot, TeamsAnswerService } = require('~/server/services/Teams');

const router = express.Router();

function isEnabled(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function getTeamsConfig() {
  const appId = process.env.TEAMS_BOT_APP_ID || process.env.MicrosoftAppId;
  const appPassword = process.env.TEAMS_BOT_APP_PASSWORD || process.env.MicrosoftAppPassword;
  const appTenantId = process.env.TEAMS_BOT_TENANT_ID || process.env.MicrosoftAppTenantId;
  const appType =
    process.env.TEAMS_BOT_APP_TYPE ||
    process.env.MicrosoftAppType ||
    (appTenantId ? 'SingleTenant' : 'MultiTenant');

  return {
    appId,
    appPassword,
    appTenantId,
    appType,
    enabled: isEnabled(process.env.TEAMS_BOT_ENABLED),
    model: process.env.TEAMS_BOT_MODEL || 'gpt-5.4-mini',
    endpoint: '/api/teams/messages',
  };
}

function createAdapter() {
  const config = getTeamsConfig();
  const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
    MicrosoftAppId: config.appId,
    MicrosoftAppPassword: config.appPassword,
    MicrosoftAppType: config.appType,
    MicrosoftAppTenantId: config.appTenantId,
  });

  const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(
    null,
    credentialsFactory,
  );
  const adapter = new CloudAdapter(botFrameworkAuthentication);

  adapter.onTurnError = async (context, error) => {
    logger.error('[TeamsBot] Unhandled turn error', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    await context.sendActivity(
      'Tenexity hit an error while handling that Teams message. Try again, or open the full workspace for deeper work.',
    );
  };

  return adapter;
}

let adapter;
let bot;

function getRuntime() {
  if (!adapter) {
    adapter = createAdapter();
  }
  if (!bot) {
    bot = new TenexityTeamsBot({ answerService: new TeamsAnswerService() });
  }
  return { adapter, bot };
}

router.get('/health', (_req, res) => {
  const config = getTeamsConfig();
  res.json({
    enabled: config.enabled,
    configured: Boolean(config.appId && config.appPassword && process.env.OPENAI_API_KEY),
    botConfigured: Boolean(config.appId && config.appPassword),
    answerConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: config.model,
    endpoint: config.endpoint,
  });
});

router.post('/messages', async (req, res, next) => {
  const config = getTeamsConfig();

  if (!config.enabled) {
    return res.status(503).json({
      error: 'teams_bot_disabled',
      message: 'Set TEAMS_BOT_ENABLED=true before accepting Microsoft Teams bot traffic.',
    });
  }

  if (!config.appId || !config.appPassword) {
    return res.status(503).json({
      error: 'teams_bot_not_configured',
      message: 'Set TEAMS_BOT_APP_ID and TEAMS_BOT_APP_PASSWORD from the Azure Bot registration.',
    });
  }

  try {
    const runtime = getRuntime();
    await runtime.adapter.process(req, res, async (context) => runtime.bot.run(context));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
