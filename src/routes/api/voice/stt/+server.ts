import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { transcribeAudio } from '$lib/server/voice/whisper.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return json({ error: 'Keine Audiodatei' }, { status: 400 });
    }

    const arrayBuf = await audioFile.arrayBuffer();
    const text = await transcribeAudio(new Uint8Array(arrayBuf));

    return json({ text });
  } catch (error) {
    console.error('STT error:', error);
    return json({ error: 'Spracherkennung fehlgeschlagen' }, { status: 500 });
  }
};
