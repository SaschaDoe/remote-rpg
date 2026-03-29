import { PIPER_URL } from '$env/static/private';

export async function synthesizeSpeech(text: string): Promise<Uint8Array> {
  const response = await fetch(`${PIPER_URL}/api/tts?text=${encodeURIComponent(text)}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Piper TTS error: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
