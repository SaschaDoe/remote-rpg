<script lang="ts">
  import { chatStore } from '$lib/stores/chat.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { tick } from 'svelte';

  let inputText = $state('');
  let chatContainer: HTMLDivElement;
  let mediaRecorder: MediaRecorder | null = $state(null);

  async function scrollToBottom() {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  async function sendMessage() {
    const text = inputText.trim();
    if (!text || chatStore.loading) return;

    inputText = '';
    const response = await chatStore.sendMessage(text);
    await scrollToBottom();

    if (settingsStore.ttsEnabled && response.role === 'assistant') {
      await speakText(response.content);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function toggleRecording() {
    if (settingsStore.recording) {
      mediaRecorder?.stop();
      settingsStore.setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
          const res = await fetch('/api/voice/stt', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.text) {
            inputText = data.text;
          }
        } catch (err) {
          console.error('STT error:', err);
        }
      };

      recorder.start();
      mediaRecorder = recorder;
      settingsStore.setRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }

  async function speakText(text: string) {
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
    }
  }

  $effect(() => {
    if (chatStore.messages.length > 0) {
      scrollToBottom();
    }
  });
</script>

<div class="chat-container" bind:this={chatContainer}>
  {#if chatStore.messages.length === 0}
    <div class="empty-state">
      {#if chatStore.mode === 'game-master'}
        <p>Willkommen, Abenteurer! Sprich mit dem Spielleiter.</p>
      {:else}
        <p>Willkommen beim Weltenbauer. Erschaffe deine Welt!</p>
      {/if}
    </div>
  {/if}

  {#each chatStore.messages as msg (msg.id)}
    <div class="message {msg.role}">
      <div class="message-header">
        {#if msg.role === 'user'}Du
        {:else if msg.agent === 'game-master'}Spielleiter
        {:else if msg.agent === 'world-builder'}Weltenbauer
        {:else}System{/if}
      </div>
      <div class="message-content">{msg.content}</div>
    </div>
  {/each}

  {#if chatStore.loading}
    <div class="message assistant loading">
      <div class="message-header">
        {chatStore.mode === 'game-master' ? 'Spielleiter' : 'Weltenbauer'}
      </div>
      <div class="message-content">Denkt nach...</div>
    </div>
  {/if}
</div>

<div class="input-bar">
  <button
    class="mic-btn"
    class:recording={settingsStore.recording}
    onclick={toggleRecording}
    title={settingsStore.recording ? 'Aufnahme stoppen' : 'Sprechen'}
  >
    {settingsStore.recording ? '⏹' : '🎤'}
  </button>
  <textarea
    bind:value={inputText}
    onkeydown={handleKeydown}
    placeholder={chatStore.mode === 'game-master'
      ? 'Was möchtest du tun?'
      : 'Beschreibe deine Welt...'}
    rows="1"
    disabled={chatStore.loading}
  ></textarea>
  <button
    class="send-btn"
    onclick={sendMessage}
    disabled={chatStore.loading || !inputText.trim()}
  >
    Senden
  </button>
</div>

<style>
  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #666;
    font-style: italic;
  }

  .message {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    max-width: 85%;
  }

  .message.user {
    align-self: flex-end;
    background: #2a4a2a;
    color: #ddd;
  }

  .message.assistant {
    align-self: flex-start;
    background: #2a2a3a;
    color: #ddd;
  }

  .message.system {
    align-self: center;
    background: #3a2a2a;
    color: #c88;
    font-size: 0.85rem;
  }

  .message-header {
    font-size: 0.75rem;
    color: #888;
    margin-bottom: 0.25rem;
  }

  .message-content {
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .loading .message-content {
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .input-bar {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    border-top: 1px solid #333;
    align-items: flex-end;
  }

  textarea {
    flex: 1;
    resize: none;
    padding: 0.6rem;
    border: 1px solid #444;
    background: #1a1a1a;
    color: #ddd;
    border-radius: 6px;
    font-size: 1rem;
    font-family: inherit;
  }

  textarea:focus {
    outline: none;
    border-color: #4a6;
  }

  .mic-btn, .send-btn {
    padding: 0.6rem 1rem;
    border: 1px solid #444;
    background: #222;
    color: #ccc;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
  }

  .mic-btn.recording {
    background: #a44;
    border-color: #a44;
    animation: pulse 1s infinite;
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .send-btn:not(:disabled):hover,
  .mic-btn:hover {
    background: #333;
  }
</style>
