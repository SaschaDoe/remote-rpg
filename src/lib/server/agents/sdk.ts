import { query } from '@anthropic-ai/claude-agent-sdk';

export interface AgentRequest {
  systemPrompt: string;
  userMessage: string;
  maxTurns?: number;
}

export interface AgentResponse {
  content: string;
}

export async function callAgent(request: AgentRequest): Promise<AgentResponse> {
  let content = '';

  for await (const message of query({
    prompt: request.userMessage,
    options: {
      systemPrompt: request.systemPrompt,
      maxTurns: request.maxTurns ?? 1,
      allowedTools: [],
    },
  })) {
    if (message.type === 'assistant') {
      const textBlocks = message.message.content.filter(
        (block: any) => block.type === 'text'
      );
      content += textBlocks.map((block: any) => block.text).join('');
    } else if (message.type === 'result') {
      if (message.result) {
        content = message.result;
      }
    }
  }

  return { content };
}
