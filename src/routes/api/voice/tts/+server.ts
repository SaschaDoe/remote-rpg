import type { RequestHandler } from '@sveltejs/kit';
import { synthesizeSpeech } from '$lib/server/voice/piper.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text } = await request.json();

    if (!text) {
      return new Response('Text erforderlich', { status: 400 });
    }

    const audioBuffer = await synthesizeSpeech(text);

    return new Response(audioBuffer.buffer as ArrayBuffer, {
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
