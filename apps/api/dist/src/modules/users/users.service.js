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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const argon2 = require("argon2");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async me(userId) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true, isActive: true, emailVerified: true, createdAt: true },
        });
    }
    async updateMe(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.BadRequestException('Kullanıcı bulunamadı');
        const updates = {};
        if (dto.name !== undefined) {
            updates.name = dto.name.trim() || null;
        }
        if (dto.newPassword) {
            if (!dto.currentPassword) {
                throw new common_1.BadRequestException('Mevcut şifrenizi girmeniz gerekiyor');
            }
            const ok = await argon2.verify(user.passwordHash, dto.currentPassword);
            if (!ok)
                throw new common_1.BadRequestException('Mevcut şifre hatalı');
            if (dto.newPassword.length < 8) {
                throw new common_1.BadRequestException('Yeni şifre en az 8 karakter olmalıdır');
            }
            updates.passwordHash = await argon2.hash(dto.newPassword);
        }
        if (Object.keys(updates).length === 0) {
            throw new common_1.BadRequestException('Güncellenecek bir alan belirtilmedi');
        }
        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: updates,
            select: { id: true, email: true, name: true, role: true, emailVerified: true, createdAt: true },
        });
        return updated;
    }
    async list() {
        return this.prisma.user.findMany({
            select: { id: true, email: true, name: true, role: true, isActive: true, emailVerified: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async adminUpdateUser(userId, dto) {
        if (!dto.role && dto.isActive === undefined) {
            throw new common_1.BadRequestException('Güncellenecek bir alan belirtilmedi');
        }
        const updates = {};
        if (dto.role !== undefined)
            updates.role = dto.role;
        if (dto.isActive !== undefined)
            updates.isActive = dto.isActive;
        return this.prisma.user.update({
            where: { id: userId },
            data: updates,
            select: { id: true, email: true, name: true, role: true, isActive: true, emailVerified: true, createdAt: true },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map