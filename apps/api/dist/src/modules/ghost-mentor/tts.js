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
exports.TtsService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = require("openai");
let TtsService = class TtsService {
    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new openai_1.default({ apiKey });
        }
        this.model = process.env.OPENAI_TTS_MODEL ?? 'gpt-4o-mini-tts';
    }
    async synthesize(text, voiceId) {
        if (!this.openai) {
            return { audioUrl: undefined, note: 'TTS disabled (no OPENAI_API_KEY)' };
        }
        const res = await this.openai.audio.speech.create({
            model: this.model,
            voice: voiceId ?? 'alloy',
            input: text,
        });
        const buffer = Buffer.from(await res.arrayBuffer());
        const dataUrl = `data:audio/mpeg;base64,${buffer.toString('base64')}`;
        return { audioUrl: dataUrl };
    }
};
exports.TtsService = TtsService;
exports.TtsService = TtsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TtsService);
//# sourceMappingURL=tts.js.map