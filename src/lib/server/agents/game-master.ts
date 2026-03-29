import { callAgent } from './sdk.js';
import { getGameMasterPrompt } from './prompts.js';
import { getPlayerHandlerAdvice } from './player-handler.js';

export async function askGameMaster(
  userMessage: string,
  worldContext: string,
  playerContext: string
): Promise<string> {
  const balanceAdvice = await getPlayerHandlerAdvice(playerContext, userMessage);

  const response = await callAgent({
    systemPrompt: getGameMasterPrompt(worldContext, playerContext, balanceAdvice),
    userMessage,
  });

  return response.content;
}
