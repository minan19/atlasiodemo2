// TTS provider seçimi: OPENAI_TTS_MODEL varsa OpenAI, yoksa fallback (metin).
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class TtsService {
  private readonly openai?: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
    this.model = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
  }

  async synthesize(text: string, voiceId?: string): Promise<{ audioUrl?: string; note?: string }> {
    if (!this.openai) {
      return { audioUrl: undefined, note: 'TTS disabled (no OPENAI_API_KEY)' };
    }
    // Gerçek üretimde: storage/upload + signed URL. Burada inline data URL döndürülüyor.
    const res = await this.openai.audio.speech.create({
      model: this.model,
      voice: voiceId ?? 'alloy',
      input: text,
    });
    const buffer = Buffer.from(await res.arrayBuffer());
    const dataUrl = `data:audio/mpeg;base64,${buffer.toString('base64')}`;
    return { audioUrl: dataUrl };
  }
}
