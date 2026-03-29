import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { handleMessage } from '$lib/server/agents/orchestrator.js';

export const POST: RequestHandler = async ({ request }) => {
  const { message, mode } = await request.json();

  if (!message || typeof message !== 'string') {
    return json({ error: 'Nachricht erforderlich' }, { status: 400 });
  }

  const agentMode = mode === 'world-builder' ? 'world-builder' : 'game-master';

  try {
    const response = await handleMessage(agentMode, message);
    return json(response);
  } catch (error) {
    console.error('Agent error:', error);
    return json({ error: 'Fehler bei der Verarbeitung' }, { status: 500 });
  }
};
