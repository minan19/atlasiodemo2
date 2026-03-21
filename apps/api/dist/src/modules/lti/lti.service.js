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
exports.LtiService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
let LtiService = class LtiService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    listTools() {
        return this.prisma.ltiTool.findMany({ include: { LtiDeployment: true } });
    }
    async createTool(dto, actorId) {
        const tool = await this.prisma.ltiTool.create({ data: dto });
        await this.audit.log({
            actorId,
            action: 'lti.tool.create',
            entity: 'LtiTool',
            entityId: tool.id,
        });
        return tool;
    }
    async updateTool(toolId, dto, actorId) {
        const existing = await this.prisma.ltiTool.findUnique({ where: { id: toolId } });
        if (!existing)
            throw new common_1.NotFoundException('LTI tool not found');
        const updated = await this.prisma.ltiTool.update({ where: { id: toolId }, data: dto });
        await this.audit.log({
            actorId,
            action: 'lti.tool.update',
            entity: 'LtiTool',
            entityId: toolId,
            meta: { changes: Object.keys(dto) },
        });
        return updated;
    }
    async createDeployment(dto, actorId) {
        const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
        if (!course)
            throw new common_1.NotFoundException('Course not found');
        const deployment = await this.prisma.ltiDeployment.create({
            data: {
                LtiTool: { connect: { id: dto.toolId } },
                Course: { connect: { id: dto.courseId } },
                instructors: dto.instructors ?? [],
                learners: dto.learners ?? [],
            },
        });
        await this.audit.log({
            actorId,
            action: 'lti.deployment.create',
            entity: 'LtiDeployment',
            entityId: deployment.id,
        });
        return deployment;
    }
    async getDeploymentsForTool(toolId) {
        return this.prisma.ltiDeployment.findMany({
            where: { toolId },
            include: { LtiTool: true, LtiLaunch: true, Course: true },
        });
    }
    async processLaunch(dto) {
        const deployment = await this.prisma.ltiDeployment.findUnique({ where: { id: dto.deploymentId } });
        if (!deployment)
            throw new common_1.NotFoundException('Deployment not found');
        const launch = await this.prisma.ltiLaunch.create({
            data: {
                deploymentId: dto.deploymentId,
                userId: dto.userId,
                role: dto.role,
                rawPayload: (dto.rawPayload ?? client_1.Prisma.JsonNull),
            },
        });
        if (deployment.status === 'ACTIVE') {
            await this.audit.log({
                action: 'lti.launch',
                entity: 'LtiLaunch',
                entityId: launch.id,
                meta: { role: dto.role, userId: dto.userId, deploymentId: dto.deploymentId },
            });
        }
        return { status: 'ok', launchId: launch.id };
    }
    async rotateKeys() {
        const rotations = await this.prisma.ltiDeployment.findMany({
            where: { status: 'ACTIVE', keyRotation: { lte: new Date() } },
            take: 10,
        });
        await Promise.all(rotations.map((deployment) => this.prisma.ltiDeployment.update({
            where: { id: deployment.id },
            data: { keyRotation: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        })));
        return { rotated: rotations.length };
    }
    getJwks() {
        return {
            keys: [
                {
                    kty: 'RSA',
                    n: 'publicKeyModulusHere',
                    e: 'AQAB',
                    alg: 'RS256',
                    use: 'sig',
                    kid: 'atlasio-lti-key-1',
                },
            ],
        };
    }
    async initiateOidcLogin(payload) {
        const targetLinkUri = payload.target_link_uri;
        const loginHint = payload.login_hint;
        const client_id = payload.client_id;
        const ltiMessageHint = payload.lti_message_hint;
        const tool = await this.prisma.ltiTool.findUnique({
            where: { clientId: client_id },
        });
        if (!tool) {
            throw new common_1.NotFoundException('Unregistered LTI Tool clientId.');
        }
        const state = Math.random().toString(36).substring(2, 15);
        const nonce = Math.random().toString(36).substring(2, 15);
        const redirectUrl = new URL(tool.issuer);
        redirectUrl.searchParams.append('response_type', 'id_token');
        redirectUrl.searchParams.append('response_mode', 'form_post');
        redirectUrl.searchParams.append('client_id', client_id);
        redirectUrl.searchParams.append('redirect_uri', targetLinkUri);
        redirectUrl.searchParams.append('login_hint', loginHint);
        redirectUrl.searchParams.append('state', state);
        redirectUrl.searchParams.append('prompt', 'none');
        redirectUrl.searchParams.append('nonce', nonce);
        if (ltiMessageHint) {
            redirectUrl.searchParams.append('lti_message_hint', ltiMessageHint);
        }
        return { redirectUrl: redirectUrl.toString(), state, nonce };
    }
};
exports.LtiService = LtiService;
exports.LtiService = LtiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, audit_service_1.AuditService])
], LtiService);
//# sourceMappingURL=lti.service.js.map