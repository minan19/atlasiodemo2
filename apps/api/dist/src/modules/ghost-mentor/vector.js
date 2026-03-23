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
exports.VectorSearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const vector_repository_1 = require("./vector.repository");
const vector_chunks_repository_1 = require("./vector-chunks.repository");
let VectorSearchService = class VectorSearchService {
    constructor(prisma, repo, chunksRepo) {
        this.prisma = prisma;
        this.repo = repo;
        this.chunksRepo = chunksRepo;
    }
    async similarLessonChunk(lessonId, queryEmbedding) {
        const chunk = await this.chunksRepo.searchByLesson(lessonId, queryEmbedding, 1).then((arr) => arr[0]);
        return {
            text: chunk?.text ?? '',
            ref: chunk?.ref ?? `lesson:${lessonId}`,
        };
    }
    toEmbeddingPlaceholder() {
        return new Array(10).fill(0);
    }
};
exports.VectorSearchService = VectorSearchService;
exports.VectorSearchService = VectorSearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        vector_repository_1.VectorRepository,
        vector_chunks_repository_1.VectorChunksRepository])
], VectorSearchService);
//# sourceMappingURL=vector.js.map