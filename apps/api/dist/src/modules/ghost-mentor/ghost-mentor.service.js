"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GhostMentorService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const rag_1 = require("./rag");
const tts_1 = require("./tts");
const vector_1 = require("./vector");
const vector_repository_1 = require("./vector.repository");
const embeddings_1 = require("./embeddings");
const crypto_1 = require("crypto");
let GhostMentorService = class GhostMentorService {
    constructor(prisma, tts, vector, vectorRepo, embedder) {
        this.prisma = prisma;
        this.tts = tts;
        this.vector = vector;
        this.vectorRepo = vectorRepo;
        this.embedder = embedder;
        this.rag = new rag_1.RagEngine(this.prisma, this.vector);
    }
    async ask(userId, dto) {
        const start = Date.now();
        const requestId = (0, crypto_1.randomUUID)();
        const embedding = await this.embedder.embed(dto.query);
        const rag = await this.rag.answer(dto.courseId, dto.lessonId, dto.timestamp, dto.query, embedding ?? undefined);
        let answer = "";
        if (dto.examMode) {
            answer = `Sınav modundasınız. Çözümü veremem ancak ilgili konuyu "${rag.sources.map(s => s.ref).join(', ')}" dakikalarında bulabilirsiniz.`;
        }
        else {
            answer = `Bu konu hakkında şu kaynaklardan yola çıkarak yanıtlıyorum: ${rag.text}`;
        }
        let audioUrl = undefined;
        if (process.env.TTS_VOICE_ID && process.env.OPENAI_API_KEY) {
            const tts = await this.tts.synthesize(answer, process.env.TTS_VOICE_ID);
            audioUrl = tts.audioUrl;
        }
        return {
            text: answer,
            sources: rag.sources,
            audioUrl,
            latencyMs: Date.now() - start,
            policyFlags: dto.examMode ? ['exam_mode_hint_only'] : [],
            requestId,
        };
    }
    async preloadFaq(userId, dto) {
        return { ok: true, cached: dto.faqs.length };
    }
};
exports.GhostMentorService = GhostMentorService;
exports.GhostMentorService = GhostMentorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tts_1.TtsService,
        vector_1.VectorSearchService,
        vector_repository_1.VectorRepository,
        embeddings_1.EmbeddingService])
], GhostMentorService);
//# sourceMappingURL=ghost-mentor.service.js.map