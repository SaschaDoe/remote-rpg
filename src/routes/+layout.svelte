<script lang="ts">
  import '../app.css';
  import { chatStore } from '$lib/stores/chat.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';

  let { children } = $props();
</script>

<div class="app">
  <header>
    <h1>Remote RPG</h1>
    <nav>
      <button
        class:active={chatStore.mode === 'game-master'}
        onclick={() => chatStore.setMode('game-master')}
      >
        Spielleiter
      </button>
      <button
        class:active={chatStore.mode === 'world-builder'}
        onclick={() => chatStore.setMode('world-builder')}
      >
        Weltenbauer
      </button>
      <label class="tts-toggle">
        <input
          type="checkbox"
          checked={settingsStore.ttsEnabled}
          onchange={() => settingsStore.toggleTTS()}
        />
        Sprachausgabe
      </label>
    </nav>
  </header>

  <main>
    {@render children()}
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    max-width: 800px;
    margin: 0 auto;
  }

  header {
    padding: 1rem;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  nav {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  nav button {
    padding: 0.4rem 0.8rem;
    border: 1px solid #555;
    background: #222;
    color: #ccc;
    border-radius: 4px;
    cursor: pointer;
  }

  nav button.active {
    background: #4a6;
    color: #fff;
    border-color: #4a6;
  }

  .tts-toggle {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: #aaa;
    cursor: pointer;
  }

  main {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
