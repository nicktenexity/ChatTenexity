const {
  TeamsAnswerService,
  TeamsConversationMemory,
  chunkTeamsReply,
  sanitizeTeamsText,
  trimInput,
} = require('./answer');

describe('TeamsAnswerService helpers', () => {
  test('sanitizeTeamsText removes Teams mention markup and collapses whitespace', () => {
    expect(sanitizeTeamsText('<at>Tenexity AI</at>&nbsp; What is late?')).toBe(
      'Tenexity AI What is late?',
    );
  });

  test('trimInput limits long Teams prompts', () => {
    const result = trimInput('abcdefghij', 4);
    expect(result).toContain('abcd');
    expect(result).toContain('Input truncated');
  });

  test('chunkTeamsReply splits long replies', () => {
    const chunks = chunkTeamsReply('a '.repeat(2500), 1000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 1000)).toBe(true);
  });
});

describe('TeamsAnswerService', () => {
  test('returns setup message when OpenAI is not configured', async () => {
    const service = new TeamsAnswerService({ apiKey: null, openai: null });
    await expect(service.answer({ text: 'hello' })).resolves.toContain('OPENAI_API_KEY');
  });

  test('calls OpenAI with conversation memory and appends the answer', async () => {
    const openai = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Here is the answer.' } }],
          }),
        },
      },
    };
    const memory = new TeamsConversationMemory({ maxTurns: 2 });
    memory.append('teams-convo-1', 'Earlier question', 'Earlier answer');

    const service = new TeamsAnswerService({
      openai,
      memory,
      workspaceUrl: 'https://chat.tenexity.ai',
      model: 'gpt-test',
    });

    const answer = await service.answer({
      text: '<at>Tenexity</at> Current question?',
      conversationId: 'teams-convo-1',
      userName: 'Nick',
    });

    expect(answer).toContain('Here is the answer.');
    expect(answer).toContain('https://chat.tenexity.ai');
    expect(openai.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-test',
        messages: expect.arrayContaining([
          { role: 'user', content: 'Earlier question' },
          { role: 'assistant', content: 'Earlier answer' },
        ]),
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(memory.get('teams-convo-1').at(-1)).toEqual({
      role: 'assistant',
      content: 'Here is the answer.',
    });
  });
});
