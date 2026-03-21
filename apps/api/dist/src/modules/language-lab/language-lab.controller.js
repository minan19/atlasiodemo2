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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageLabController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const language_lab_service_1 = require("./language-lab.service");
const translation_service_1 = require("./translation.service");
let LanguageLabController = class LanguageLabController {
    constructor(service, translation) {
        this.service = service;
        this.translation = translation;
    }
    analyzeSpeech(dto, req) {
        const userId = req.user.id || req.user.userId;
        const tenantId = req.user.tenantId || req.tenantId || 'public';
        return this.service.analyzeSpeech(userId, tenantId, dto.audioBase64, dto.expectedText);
    }
    getHistory(req) {
        const userId = req.user.id || req.user.userId;
        const tenantId = req.user.tenantId || req.tenantId || 'public';
        return this.service.fetchSpeakingHistory(userId, tenantId);
    }
    transcribeLiveStream(dto, req) {
        const userId = req.user.id || req.user.userId;
        return this.translation.processLiveTranscription(dto.sessionId, userId, dto.text, dto.targetLang);
    }
};
exports.LanguageLabController = LanguageLabController;
__decorate([
    (0, common_1.Post)('analyze-speech'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LanguageLabController.prototype, "analyzeSpeech", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LanguageLabController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Post)('live-transcription'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LanguageLabController.prototype, "transcribeLiveStream", null);
exports.LanguageLabController = LanguageLabController = __decorate([
    (0, common_1.Controller)('language-lab'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [language_lab_service_1.LanguageLabService, translation_service_1.TranslationService])
], LanguageLabController);
//# sourceMappingURL=language-lab.controller.js.map