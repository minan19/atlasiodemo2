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
var ConnectorsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let ConnectorsService = ConnectorsService_1 = class ConnectorsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
        this.logger = new common_1.Logger(ConnectorsService_1.name);
    }
    async handleLtiLaunch(tenantId, payload) {
        const deployment = await this.prisma.ltiDeployment.findFirst({
            where: { id: payload.deploymentId },
            include: { LtiTool: true, Course: true },
        });
        if (!deployment)
            throw new common_1.NotFoundException('LTI deployment not found');
        const role = this.mapLtiRole(payload.roles);
        await this.prisma.ltiLaunch.create({
            data: {
                deploymentId: deployment.id,
                userId: payload.sub,
                role,
                rawPayload: payload,
            },
        });
        await this.audit.log({
            action: 'lti.launch',
            entity: 'LtiDeployment',
            entityId: deployment.id,
            meta: { tenantId, ltiUserId: payload.sub, role },
        });
        return {
            deploymentId: deployment.id,
            courseId: deployment.courseId,
            courseName: deployment.Course?.title,
            toolName: deployment.LtiTool?.name,
            ltiUserId: payload.sub,
            atlasioRole: role,
            targetLinkUri: payload.targetLinkUri,
            context: payload.context,
        };
    }
    async sendLtiGrade(deploymentId, userId, score, maxScore, comment) {
        const deployment = await this.prisma.ltiDeployment.findUnique({
            where: { id: deploymentId },
            include: { LtiTool: true },
        });
        if (!deployment)
            throw new common_1.NotFoundException('LTI deployment not found');
        const agsPayload = {
            scoreGiven: score,
            scoreMaximum: maxScore,
            activityProgress: 'Completed',
            gradingProgress: 'FullyGraded',
            userId,
            comment: comment ?? '',
            timestamp: new Date().toISOString(),
        };
        this.logger.log(`LTI AGS: Score ${score}/${maxScore} for user ${userId} in deployment ${deploymentId}`);
        await this.audit.log({
            action: 'lti.grade_sent',
            entity: 'LtiDeployment',
            entityId: deploymentId,
            meta: { userId, score, maxScore },
        });
        return { sent: true, payload: agsPayload };
    }
    mapLtiRole(roles) {
        const r = roles.map((r) => r.toLowerCase()).join(',');
        if (r.includes('administrator') || r.includes('admin'))
            return 'ADMIN';
        if (r.includes('instructor') || r.includes('teacher'))
            return 'INSTRUCTOR';
        return 'STUDENT';
    }
    async importOneRoster(tenantId, data) {
        const stats = { usersCreated: 0, usersUpdated: 0, classesCreated: 0, enrollmentsCreated: 0 };
        for (const u of data.users) {
            const existing = await this.prisma.user.findFirst({
                where: { email: u.email, tenantId },
            });
            const role = u.role === 'teacher' ? 'INSTRUCTOR' : u.role === 'administrator' ? 'ADMIN' : 'STUDENT';
            if (existing) {
                await this.prisma.user.update({
                    where: { id: existing.id },
                    data: { firstName: u.givenName, lastName: u.familyName, name: `${u.givenName} ${u.familyName}` },
                });
                stats.usersUpdated++;
            }
            else {
                await this.prisma.user.create({
                    data: {
                        email: u.email,
                        passwordHash: '',
                        name: `${u.givenName} ${u.familyName}`,
                        firstName: u.givenName,
                        lastName: u.familyName,
                        role: role,
                        tenantId,
                        emailVerified: true,
                    },
                });
                stats.usersCreated++;
            }
        }
        for (const c of data.classes) {
            const existing = await this.prisma.course.findFirst({
                where: { title: c.title, tenantId },
            });
            if (!existing) {
                await this.prisma.course.create({
                    data: { title: c.title, tenantId, isPublished: true },
                });
                stats.classesCreated++;
            }
        }
        for (const e of data.enrollments) {
            const user = await this.prisma.user.findFirst({
                where: { email: { contains: e.userSourcedId }, tenantId },
            });
            const course = await this.prisma.course.findFirst({
                where: { title: { contains: e.classSourcedId }, tenantId },
            });
            if (user && course) {
                await this.prisma.enrollment.upsert({
                    where: { userId_courseId: { userId: user.id, courseId: course.id } },
                    create: { userId: user.id, courseId: course.id, tenantId },
                    update: {},
                });
                stats.enrollmentsCreated++;
            }
        }
        await this.audit.log({
            action: 'oneroster.import',
            entity: 'OneRoster',
            meta: { tenantId, stats },
        });
        return stats;
    }
    async exportOneRoster(tenantId) {
        const users = await this.prisma.user.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
        });
        const courses = await this.prisma.course.findMany({
            where: { tenantId },
            select: { id: true, title: true },
        });
        const enrollments = await this.prisma.enrollment.findMany({
            where: { tenantId },
            select: { userId: true, courseId: true },
        });
        return {
            users: users.map((u) => ({
                sourcedId: u.id,
                username: u.email,
                givenName: u.firstName ?? '',
                familyName: u.lastName ?? '',
                email: u.email,
                role: u.role === 'INSTRUCTOR' ? 'teacher' : u.role === 'ADMIN' ? 'administrator' : 'student',
                orgs: [tenantId],
            })),
            classes: courses.map((c) => ({
                sourcedId: c.id,
                title: c.title,
            })),
            enrollments: enrollments.map((e) => ({
                sourcedId: `${e.userId}_${e.courseId}`,
                classSourcedId: e.courseId,
                userSourcedId: e.userId,
                role: 'student',
            })),
        };
    }
    async importQtiItems(tenantId, items, topicId) {
        let imported = 0;
        for (const item of items) {
            const choices = item.choices ?? [];
            const correctId = item.responseDeclaration.correctResponse[0];
            const question = await this.prisma.question.create({
                data: {
                    topicId,
                    stem: item.title,
                    explanation: item.itemBody,
                    difficulty: 1,
                    tenantId,
                    correctChoiceId: '',
                },
            });
            let correctChoiceId = '';
            for (const c of choices) {
                const choice = await this.prisma.questionChoice.create({
                    data: {
                        questionId: question.id,
                        text: c.value,
                        isCorrect: c.identifier === correctId,
                    },
                });
                if (c.identifier === correctId)
                    correctChoiceId = choice.id;
            }
            if (correctChoiceId) {
                await this.prisma.question.update({
                    where: { id: question.id },
                    data: { correctChoiceId },
                });
            }
            imported++;
        }
        await this.audit.log({
            action: 'qti.import',
            entity: 'Question',
            meta: { tenantId, topicId, imported },
        });
        return { imported };
    }
    async exportQtiItems(tenantId, topicId) {
        const where = { tenantId };
        if (topicId)
            where.topicId = topicId;
        const questions = await this.prisma.question.findMany({
            where,
            include: { choices: true },
        });
        return questions.map((q) => ({
            identifier: q.id,
            title: q.stem,
            itemBody: q.explanation ?? '',
            responseDeclaration: {
                identifier: 'RESPONSE',
                cardinality: 'single',
                baseType: 'identifier',
                correctResponse: [q.correctChoiceId],
            },
            choices: q.choices.map((c) => ({
                identifier: c.id,
                value: c.text,
            })),
        }));
    }
    async issueOpenBadge(certificationId, tenantId) {
        const cert = await this.prisma.certification.findUnique({
            where: { id: certificationId },
            include: {
                User: { select: { email: true, name: true } },
                Course: { select: { title: true, description: true } },
            },
        });
        if (!cert)
            throw new common_1.NotFoundException('Certification not found');
        const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
        const assertion = {
            '@context': 'https://w3id.org/openbadges/v2',
            type: 'Assertion',
            id: `${baseUrl}/badges/assertions/${cert.id}`,
            recipient: {
                type: 'email',
                identity: cert.User.email,
                hashed: false,
            },
            badge: {
                type: 'BadgeClass',
                id: `${baseUrl}/badges/classes/${cert.courseId}`,
                name: cert.Course.title,
                description: cert.Course.description ?? `Completed ${cert.Course.title}`,
                image: `${baseUrl}/badges/images/${cert.courseId}.png`,
                criteria: { narrative: `Successfully completed the course: ${cert.Course.title}` },
                issuer: {
                    type: 'Issuer',
                    id: `${baseUrl}/badges/issuer`,
                    name: 'Atlasio Platform',
                    url: baseUrl,
                },
            },
            issuedOn: cert.issuedAt.toISOString(),
            verification: { type: 'hosted' },
        };
        await this.audit.log({
            actorId: cert.userId,
            action: 'badge.issued',
            entity: 'Certification',
            entityId: cert.id,
            meta: { tenantId, courseId: cert.courseId },
        });
        return assertion;
    }
};
exports.ConnectorsService = ConnectorsService;
exports.ConnectorsService = ConnectorsService = ConnectorsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ConnectorsService);
//# sourceMappingURL=connectors.service.js.map