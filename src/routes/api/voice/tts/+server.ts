import type { RequestHandler } from './$types.js';
import { synthesizeSpeech } from '$lib/server/voice/piper.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text } = await request.json();

    if (!text) {
      return new Response('Text erforderlich', { status: 400 });
    }

    const audioBuffer = await synthesizeSpeech(text);

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return new Response('Sprachsynthese fehlgeschlagen', { status: 500 });
  }
};
