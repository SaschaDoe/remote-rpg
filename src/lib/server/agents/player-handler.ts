import { callAgent } from './sdk.js';
import { getPlayerHandlerPrompt } from './prompts.js';

export async function getPlayerHandlerAdvice(
  playerContext: string,
  situation: string
): Promise<string> {
  const response = await callAgent({
    systemPrompt: getPlayerHandlerPrompt(playerContext, situation),
    userMessage: `Bewerte diese Spieleraktion und gib kurze Balance-Hinweise: ${situation}`,
  });

  return response.content;
}
