import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { transcribeAudio } from '$lib/server/voice/whisper.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return json({ error: 'Keine Audiodatei' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const text = await transcribeAudio(buffer);

    return json({ text });
  } catch (error) {
    console.error('STT error:', error);
    return json({ error: 'Spracherkennung fehlgeschlagen' }, { status: 500 });
  }
};
