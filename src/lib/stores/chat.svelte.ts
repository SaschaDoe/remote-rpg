import type { ChatMessage, AgentMode } from '$lib/types.js';

function createChatStore() {
  let messages = $state<ChatMessage[]>([]);
  let loading = $state(false);
  let mode = $state<AgentMode>('game-master');

  return {
    get messages() { return messages; },
    get loading() { return loading; },
    get mode() { return mode; },

    setMode(newMode: AgentMode) {
      mode = newMode;
    },

    async sendMessage(content: string) {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        agent: mode,
        timestamp: Date.now(),
      };
      messages = [...messages, userMsg];
      loading = true;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, mode }),
        });

        const data = await res.json();

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.content ?? data.error ?? 'Keine Antwort',
          agent: mode,
          timestamp: Date.now(),
        };
        messages = [...messages, assistantMsg];

        return assistantMsg;
      } catch (error) {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'system',
          content: 'Verbindungsfehler. Bitte versuche es erneut.',
          agent: 'system',
          timestamp: Date.now(),
        };
        messages = [...messages, errorMsg];
        return errorMsg;
      } finally {
        loading = false;
      }
    },

    clear() {
      messages = [];
    },
  };
}

export const chatStore = createChatStore();
