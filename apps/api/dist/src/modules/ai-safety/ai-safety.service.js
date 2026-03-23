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
var AiSafetyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSafetyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/i,
    /disregard\s+(all\s+)?(previous|above|prior)/i,
    /forget\s+(everything|all|your\s+instructions)/i,
    /you\s+are\s+now\s+(a|an|the)\s+(hacker|evil|malicious)/i,
    /pretend\s+(you\s+are|to\s+be)\s+(a|an)/i,
    /act\s+as\s+(a|an|if)\s+(you|hacker|admin|root)/i,
    /reveal\s+(your|the|system)\s+(prompt|instructions|rules)/i,
    /what\s+(are|is)\s+your\s+(system|initial|original)\s+(prompt|instructions)/i,
    /show\s+me\s+(your|the)\s+(prompt|instructions|rules)/i,
    /DAN\s+mode/i,
    /developer\s+mode\s+(enabled|on|activate)/i,
    /\bDO\s+ANYTHING\s+NOW\b/i,
    /base64\s*decode/i,
    /eval\s*\(/i,
    /\\x[0-9a-f]{2}/i,
    /önceki\s+(talimatları|kuralları)\s+(unut|görmezden\s+gel)/i,
    /sistem\s+promptunu\s+göster/i,
];
const PII_PATTERNS = [
    { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]', label: 'email' },
    { pattern: /\b[1-9]\d{10}\b/g, replacement: '[TC_KIMLIK]', label: 'tc_kimlik' },
    { pattern: /(\+90|0)\s*[-(]?\s*\d{3}\s*[-).]?\s*\d{3}\s*[-.]?\s*\d{2}\s*[-.]?\s*\d{2}/g, replacement: '[PHONE]', label: 'phone' },
    { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[CREDIT_CARD]', label: 'credit_card' },
    { pattern: /\bTR\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{2}\b/g, replacement: '[IBAN]', label: 'iban' },
    { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP_ADDR]', label: 'ip_address' },
    { pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, replacement: '[SSN]', label: 'ssn' },
];
const HARMFUL_OUTPUT_PATTERNS = [
    /how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|weapon|explosive)/i,
    /instructions\s+for\s+(hacking|breaking\s+into)/i,
    /self[-\s]?harm/i,
    /suicide\s+(method|technique|instruction)/i,
];
let AiSafetyService = AiSafetyService_1 = class AiSafetyService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
        this.logger = new common_1.Logger(AiSafetyService_1.name);
        this.modelGates = new Map([
            ['gpt-4', {
                    modelId: 'gpt-4',
                    version: '2024-01',
                    enabled: true,
                    maxTokens: 4096,
                    temperatureRange: [0, 1.0],
                    allowedRoles: ['ADMIN', 'INSTRUCTOR'],
                    rateLimit: { maxPerMinute: 10, maxPerDay: 500 },
                }],
            ['gpt-3.5-turbo', {
                    modelId: 'gpt-3.5-turbo',
                    version: '2024-01',
                    enabled: true,
                    maxTokens: 2048,
                    temperatureRange: [0, 1.0],
                    allowedRoles: ['ADMIN', 'INSTRUCTOR', 'STUDENT'],
                    rateLimit: { maxPerMinute: 20, maxPerDay: 1000 },
                }],
        ]);
    }
    async checkInput(text, userId, tenantId) {
        const start = Date.now();
        const patterns = [];
        const injectionDetected = this.detectInjection(text);
        if (injectionDetected.detected) {
            patterns.push(...injectionDetected.patterns);
        }
        const piiResult = this.maskPii(text);
        const harmful = this.detectHarmful(text);
        let riskScore = 0;
        if (injectionDetected.detected)
            riskScore += 60;
        if (piiResult.found.length > 0)
            riskScore += 20;
        if (harmful)
            riskScore += 40;
        riskScore = Math.min(100, riskScore);
        const blocked = injectionDetected.detected || harmful;
        if (blocked || riskScore > 30) {
            await this.audit.log({
                actorId: userId,
                action: blocked ? 'ai_safety.blocked' : 'ai_safety.warning',
                entity: 'AiSafetyCheck',
                meta: {
                    tenantId,
                    riskScore,
                    injection: injectionDetected.detected,
                    pii: piiResult.found,
                    harmful,
                    patterns,
                },
            });
        }
        return {
            safe: !blocked,
            blocked,
            reason: blocked
                ? injectionDetected.detected
                    ? 'Prompt injection detected'
                    : 'Harmful content detected'
                : undefined,
            injectionDetected: injectionDetected.detected,
            piiFound: piiResult.found,
            piiMaskedText: piiResult.masked,
            harmfulContent: harmful,
            riskScore,
            metadata: {
                checkDurationMs: Date.now() - start,
                patterns,
            },
        };
    }
    async checkOutput(text, userId) {
        const harmful = this.detectHarmful(text);
        const piiResult = this.maskPii(text);
        if (harmful) {
            await this.audit.log({
                actorId: userId,
                action: 'ai_safety.output_blocked',
                entity: 'AiSafetyCheck',
                meta: { harmful: true },
            });
        }
        return {
            safe: !harmful,
            filtered: harmful
                ? 'Bu yanıt güvenlik politikamız gereği filtrelendi.'
                : piiResult.masked,
            harmful,
        };
    }
    detectInjection(text) {
        const matched = [];
        for (const pattern of INJECTION_PATTERNS) {
            if (pattern.test(text)) {
                matched.push(pattern.source.slice(0, 50));
            }
        }
        return { detected: matched.length > 0, patterns: matched };
    }
    maskPii(text) {
        let masked = text;
        const found = [];
        for (const { pattern, replacement, label } of PII_PATTERNS) {
            const regex = new RegExp(pattern.source, pattern.flags);
            if (regex.test(masked)) {
                found.push(label);
                masked = masked.replace(new RegExp(pattern.source, pattern.flags), replacement);
            }
        }
        return { masked, found };
    }
    detectHarmful(text) {
        return HARMFUL_OUTPUT_PATTERNS.some((p) => p.test(text));
    }
    checkModelAccess(modelId, role) {
        const gate = this.modelGates.get(modelId);
        if (!gate)
            return { allowed: false, reason: `Model ${modelId} not configured` };
        if (!gate.enabled)
            return { allowed: false, reason: `Model ${modelId} is disabled` };
        if (!gate.allowedRoles.includes(role.toUpperCase())) {
            return { allowed: false, reason: `Role ${role} not allowed for model ${modelId}` };
        }
        return { allowed: true, config: gate };
    }
    validateAiRequest(modelId, params) {
        const access = this.checkModelAccess(modelId, params.role);
        if (!access.allowed)
            return { valid: false, reason: access.reason };
        const config = access.config;
        if (params.maxTokens && params.maxTokens > config.maxTokens) {
            return { valid: false, reason: `maxTokens exceeds limit (${config.maxTokens})` };
        }
        if (params.temperature !== undefined) {
            const [min, max] = config.temperatureRange;
            if (params.temperature < min || params.temperature > max) {
                return { valid: false, reason: `temperature must be between ${min} and ${max}` };
            }
        }
        return { valid: true };
    }
    async getSafetyStats(tenantId, days = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const logs = await this.prisma.auditLog.findMany({
            where: {
                action: { startsWith: 'ai_safety.' },
                createdAt: { gte: since },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        const blocked = logs.filter((l) => l.action === 'ai_safety.blocked').length;
        const warnings = logs.filter((l) => l.action === 'ai_safety.warning').length;
        const outputBlocked = logs.filter((l) => l.action === 'ai_safety.output_blocked').length;
        return {
            period: { days, from: since.toISOString() },
            totalChecks: logs.length,
            blocked,
            warnings,
            outputBlocked,
            topPatterns: this.extractTopPatterns(logs),
        };
    }
    extractTopPatterns(logs) {
        const counts = new Map();
        for (const log of logs) {
            const meta = log.meta;
            const patterns = meta?.patterns ?? [];
            for (const p of patterns) {
                counts.set(p, (counts.get(p) ?? 0) + 1);
            }
        }
        return Array.from(counts.entries())
            .map(([pattern, count]) => ({ pattern, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
};
exports.AiSafetyService = AiSafetyService;
exports.AiSafetyService = AiSafetyService = AiSafetyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], AiSafetyService);
//# sourceMappingURL=ai-safety.service.js.map