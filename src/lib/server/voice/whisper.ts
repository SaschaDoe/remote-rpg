import { WHISPER_URL } from '$env/static/private';

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append('audio_file', new Blob([audioBuffer]), 'audio.webm');
  formData.append('language', 'de');

  const response = await fetch(`${WHISPER_URL}/asr?output=json&language=de`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper STT error: ${response.status}`);
  }

  const data = await response.json();
  return data.text ?? '';
}
