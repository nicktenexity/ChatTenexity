const express = require('express');
const { isEnabled } = require('@librechat/api');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const sourceCatalog = [
  {
    id: 'google-workspace',
    label: 'Google Workspace',
    systems: ['Drive', 'Gmail', 'Calendar'],
    accessMode: 'User OAuth or admin OAuth',
    status: 'planned',
    firstUse: 'Search files, summarize docs, draft emails, and check calendar context.',
  },
  {
    id: 'microsoft-365',
    label: 'Microsoft 365',
    systems: ['SharePoint', 'OneDrive', 'Outlook', 'Teams'],
    accessMode: 'Microsoft Graph OAuth and Azure Bot',
    status: 'teams-code-ready',
    firstUse: 'Chat in Teams, search SharePoint, read Office files, and inspect Outlook context.',
  },
  {
    id: 'salesforce',
    label: 'Salesforce',
    systems: ['Accounts', 'Contacts', 'Opportunities', 'Cases'],
    accessMode: 'Admin OAuth',
    status: 'planned',
    firstUse: 'Summarize account history, draft follow-ups, and prepare CRM update proposals.',
  },
  {
    id: 'sql-reporting',
    label: 'SQL and ERP Reporting',
    systems: ['Postgres', 'SQL Server', 'MySQL', 'ERP reporting replicas'],
    accessMode: 'Read-only service credential',
    status: 'planned',
    firstUse: 'Answer operational questions through governed, audited read-only queries.',
  },
  {
    id: 'storage',
    label: 'Storage',
    systems: ['Dropbox', 'Box'],
    accessMode: 'User OAuth or admin OAuth',
    status: 'planned',
    firstUse: 'Search and ingest approved folders after the primary workspace connector is chosen.',
  },
];

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function emailConfigured() {
  return (
    (hasValue(process.env.EMAIL_SERVICE) || hasValue(process.env.EMAIL_HOST)) &&
    hasValue(process.env.EMAIL_USERNAME) &&
    hasValue(process.env.EMAIL_PASSWORD) &&
    hasValue(process.env.EMAIL_FROM)
  );
}

function teamsConfigured() {
  return (
    isEnabled(process.env.TEAMS_BOT_ENABLED) &&
    hasValue(process.env.TEAMS_BOT_APP_ID) &&
    hasValue(process.env.TEAMS_BOT_APP_PASSWORD) &&
    hasValue(process.env.OPENAI_API_KEY)
  );
}

router.get('/readiness', requireJwtAuth, (req, res) => {
  const registrationOpen = isEnabled(process.env.ALLOW_REGISTRATION);
  const passwordResetEnabled = isEnabled(process.env.ALLOW_PASSWORD_RESET);
  const emailReady = emailConfigured();

  res.status(200).send({
    app: {
      title: process.env.APP_TITLE || 'Tenexity AI Workspace',
      url: process.env.DOMAIN_CLIENT || '',
      customDomainReady: process.env.DOMAIN_CLIENT === 'https://chat.tenexity.ai',
    },
    chatGPT: {
      configured: hasValue(process.env.OPENAI_API_KEY),
      models: process.env.OPENAI_MODELS || 'gpt-5.4-mini',
      defaultMode: 'ChatGPT',
    },
    access: {
      emailLogin:
        process.env.ALLOW_EMAIL_LOGIN === undefined || isEnabled(process.env.ALLOW_EMAIL_LOGIN),
      registrationOpen,
      registrationClosed: !registrationOpen,
      emailConfigured: emailReady,
      passwordResetEnabled,
      passwordResetReady: passwordResetEnabled && emailReady,
    },
    teams: {
      endpoint: '/api/teams/messages',
      healthEndpoint: '/api/teams/health',
      codeReady: true,
      enabled: isEnabled(process.env.TEAMS_BOT_ENABLED),
      configured: teamsConfigured(),
      model: process.env.TEAMS_BOT_MODEL || process.env.OPENAI_MODELS || 'gpt-5.4-mini',
    },
    sources: {
      configuredCount: 0,
      catalog: sourceCatalog,
    },
  });
});

router.get('/source-catalog', requireJwtAuth, (req, res) => {
  res.status(200).send({ sources: sourceCatalog });
});

module.exports = router;
