const OpenAI = require('openai');
const sanitizeHtml = require('sanitize-html');
const { logger } = require('@librechat/data-schemas');

const DEFAULT_MODEL = 'gpt-5.4-mini';
const DEFAULT_TIMEOUT_MS = 18000;
const DEFAULT_MAX_INPUT_CHARS = 6000;
const DEFAULT_HISTORY_TURNS = 8;

const defaultInstructions = [
  'You are Tenexity AI inside Microsoft Teams.',
  'Answer quickly and directly. Use short paragraphs and bullets when helpful.',
  'When the user asks about connected business sources, explain what source or tool would be needed if it is not currently available.',
  'Do not claim to have searched private files, email, calendars, CRM, or databases unless a tool result is provided.',
  'For operational work, give the answer, assumptions, and the next practical action.',
].join('\n');

function isEnabled(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function sanitizeTeamsText(text = '') {
  return sanitizeHtml(String(text), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimInput(text, maxChars = DEFAULT_MAX_INPUT_CHARS) {
  if (!text || text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n\n[Input truncated to ${maxChars} characters for Teams response latency.]`;
}

function chunkTeamsReply(text, maxChars = 3600) {
  const clean = String(text || '').trim();
  if (!clean) {
    return ['I could not generate a response. Try asking again with a little more context.'];
  }

  const chunks = [];
  let remaining = clean;

  while (remaining.length > maxChars) {
    const splitAt = Math.max(
      remaining.lastIndexOf('\n\n', maxChars),
      remaining.lastIndexOf('\n', maxChars),
      remaining.lastIndexOf('. ', maxChars),
      remaining.lastIndexOf(' ', maxChars),
    );
    const index = splitAt > maxChars * 0.5 ? splitAt + 1 : maxChars;
    chunks.push(remaining.slice(0, index).trim());
    remaining = remaining.slice(index).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

class TeamsConversationMemory {
  constructor({ maxTurns = DEFAULT_HISTORY_TURNS } = {}) {
    this.maxTurns = maxTurns;
    this.conversations = new Map();
  }

  get(conversationId) {
    return this.conversations.get(conversationId) || [];
  }

  append(conversationId, userText, assistantText) {
    if (!conversationId) {
      return;
    }

    const history = this.get(conversationId);
    history.push({ role: 'user', content: userText });
    history.push({ role: 'assistant', content: assistantText });
    this.conversations.set(conversationId, history.slice(this.maxTurns * -2));
  }
}

class TeamsAnswerService {
  constructor({
    openai,
    memory = new TeamsConversationMemory(),
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.TEAMS_BOT_MODEL || DEFAULT_MODEL,
    timeoutMs = Number(process.env.TEAMS_BOT_REPLY_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    maxInputChars = Number(process.env.TEAMS_BOT_MAX_INPUT_CHARS) || DEFAULT_MAX_INPUT_CHARS,
    instructions = process.env.TEAMS_BOT_SYSTEM_PROMPT || defaultInstructions,
    workspaceUrl = process.env.DOMAIN_CLIENT,
  } = {}) {
    this.model = model;
    this.memory = memory;
    this.timeoutMs = timeoutMs;
    this.instructions = instructions;
    this.workspaceUrl = workspaceUrl;
    this.maxInputChars = maxInputChars;
    this.openai = openai || (apiKey ? new OpenAI({ apiKey }) : null);
  }

  isReady() {
    return Boolean(this.openai);
  }

  async answer({ text, conversationId, userName }) {
    const cleanText = trimInput(sanitizeTeamsText(text), this.maxInputChars);

    if (!cleanText) {
      return 'Ask me a question or describe what you want Tenexity to help with.';
    }

    if (!this.openai) {
      return 'Tenexity Teams chat is connected, but `OPENAI_API_KEY` is not configured for answer generation yet.';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const history = this.memory.get(conversationId);

    try {
      const completion = await this.openai.chat.completions.create(
        {
          model: this.model,
          messages: [
            { role: 'system', content: this.instructions },
            ...history,
            {
              role: 'user',
              content: userName ? `${userName} asks in Microsoft Teams: ${cleanText}` : cleanText,
            },
          ],
        },
        { signal: controller.signal },
      );

      const answer =
        completion?.choices?.[0]?.message?.content?.trim() ||
        'I could not generate a response. Try asking again with a little more context.';

      this.memory.append(conversationId, cleanText, answer);
      return this.addWorkspaceHint(answer);
    } catch (error) {
      if (error?.name === 'AbortError') {
        return 'I need a little more time than Teams should wait for. Try a narrower question, or open the full Tenexity workspace for deeper analysis.';
      }

      logger.error('[TeamsAnswerService] Failed to answer Teams message', {
        message: error?.message,
        name: error?.name,
      });
      return 'I hit an error while answering from Teams. The Tenexity workspace may still be available in the browser.';
    } finally {
      clearTimeout(timeout);
    }
  }

  addWorkspaceHint(answer) {
    if (!this.workspaceUrl || isEnabled(process.env.TEAMS_BOT_HIDE_WORKSPACE_LINK)) {
      return answer;
    }

    if (answer.includes(this.workspaceUrl)) {
      return answer;
    }

    return `${answer}\n\nOpen the full workspace: ${this.workspaceUrl}`;
  }
}

module.exports = {
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  TeamsAnswerService,
  TeamsConversationMemory,
  chunkTeamsReply,
  sanitizeTeamsText,
  trimInput,
};
