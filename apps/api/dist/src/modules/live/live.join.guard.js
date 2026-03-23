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
exports.LiveJoinGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let LiveJoinGuard = class LiveJoinGuard {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const userId = req.user?.id ?? req.user?.userId;
        const role = req.user?.role ?? req.user?.roles?.[0];
        const sessionId = req.params?.id;
        if (!userId)
            throw new common_1.UnauthorizedException();
        const session = await this.prisma.liveSession.findUnique({
            where: { id: sessionId },
            select: { courseId: true, instructorId: true },
        });
        if (!session)
            throw new common_1.ForbiddenException('Live session bulunamadı');
        if (role === 'ADMIN' || role === 'INSTRUCTOR' || session.instructorId === userId)
            return true;
        const enrolled = await this.prisma.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId: session.courseId } },
            select: { id: true },
        });
        if (!enrolled)
            throw new common_1.ForbiddenException('Derse kayıtlı değilsiniz');
        return true;
    }
};
exports.LiveJoinGuard = LiveJoinGuard;
exports.LiveJoinGuard = LiveJoinGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LiveJoinGuard);
//# sourceMappingURL=live.join.guard.js.map