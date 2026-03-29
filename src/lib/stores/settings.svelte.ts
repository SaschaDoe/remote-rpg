function createSettingsStore() {
  let ttsEnabled = $state(false);
  let recording = $state(false);

  return {
    get ttsEnabled() { return ttsEnabled; },
    get recording() { return recording; },

    toggleTTS() {
      ttsEnabled = !ttsEnabled;
    },

    setRecording(value: boolean) {
      recording = value;
    },
  };
}

export const settingsStore = createSettingsStore();
