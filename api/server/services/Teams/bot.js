const { TeamsActivityHandler, TurnContext } = require('botbuilder');
const { chunkTeamsReply, TeamsAnswerService } = require('./answer');

function removeTeamsMention(context) {
  const activity = context.activity || {};
  const withoutRecipient = TurnContext.removeRecipientMention(activity);
  return withoutRecipient || activity.text || '';
}

class TenexityTeamsBot extends TeamsActivityHandler {
  constructor({ answerService = new TeamsAnswerService() } = {}) {
    super();
    this.answerService = answerService;

    this.onMessage(async (context, next) => {
      const text = removeTeamsMention(context);
      const conversationId = context.activity?.conversation?.id;
      const userName = context.activity?.from?.name;

      await context.sendActivity({ type: 'typing' });

      const answer = await this.answerService.answer({
        text,
        conversationId,
        userName,
      });

      for (const chunk of chunkTeamsReply(answer)) {
        await context.sendActivity(chunk);
      }

      await next();
    });

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity?.membersAdded || [];
      const botId = context.activity?.recipient?.id;
      const shouldWelcome = membersAdded.some((member) => member.id !== botId);

      if (shouldWelcome) {
        await context.sendActivity(
          'Tenexity AI is connected. Ask a question here, or ask me to summarize, plan, draft, or reason through a client workflow.',
        );
      }

      await next();
    });
  }
}

module.exports = {
  TenexityTeamsBot,
  removeTeamsMention,
};
