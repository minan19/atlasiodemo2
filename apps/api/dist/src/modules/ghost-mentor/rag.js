"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagEngine = void 0;
const openai_1 = require("openai");
class RagEngine {
    constructor(prisma, vectorSearch) {
        this.prisma = prisma;
        this.vectorSearch = vectorSearch;
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new openai_1.default({ apiKey });
        }
    }
    async fallback(query, lessonId, timestamp) {
        const snippet = `Konu özeti (${lessonId} @ ${timestamp}s)`;
        return {
            text: `Bu bir placeholder yanıt: ${query}`,
            sources: [{ snippet, ref: `lesson:${lessonId}@${timestamp}` }],
        };
    }
    async answer(courseId, lessonId, timestamp, query, queryEmbedding) {
        const chunk = await this.vectorSearch.similarLessonChunk(lessonId, queryEmbedding);
        const context = chunk.text;
        if (!this.openai) {
            return this.fallback(query, lessonId, timestamp);
        }
        const prompt = `Sen bir eğitmensin. Aşağıdaki bağlamı ve soruyu kullanarak kısa, kaynaklı cevap ver.
Bağlam:
${context}

Soru: ${query}`;
        const completion = await this.openai.chat.completions.create({
            model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 300,
        });
        const text = completion.choices[0]?.message?.content ?? query;
        const sources = [{ snippet: 'Context', ref: `lesson:${lessonId}@${timestamp}` }];
        return { text, sources };
    }
}
exports.RagEngine = RagEngine;
//# sourceMappingURL=rag.js.map