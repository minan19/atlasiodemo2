"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GhostMentorModule = void 0;
const common_1 = require("@nestjs/common");
const ghost_mentor_service_1 = require("./ghost-mentor.service");
const ghost_mentor_controller_1 = require("./ghost-mentor.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const tts_1 = require("./tts");
const vector_1 = require("./vector");
const vector_repository_1 = require("./vector.repository");
const vector_chunks_repository_1 = require("./vector-chunks.repository");
const embeddings_1 = require("./embeddings");
let GhostMentorModule = class GhostMentorModule {
};
exports.GhostMentorModule = GhostMentorModule;
exports.GhostMentorModule = GhostMentorModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [ghost_mentor_controller_1.GhostMentorController],
        providers: [ghost_mentor_service_1.GhostMentorService, tts_1.TtsService, vector_1.VectorSearchService, vector_repository_1.VectorRepository, vector_chunks_repository_1.VectorChunksRepository, embeddings_1.EmbeddingService],
    })
], GhostMentorModule);
//# sourceMappingURL=ghost-mentor.module.js.map