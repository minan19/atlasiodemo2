import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly openai?: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) this.openai = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small';
  }

  async embed(text: string): Promise<number[] | null> {
    if (!this.openai) return null;
    const res = await this.openai.embeddings.create({ model: this.model, input: text });
    return res.data[0]?.embedding ?? null;
  }
}
