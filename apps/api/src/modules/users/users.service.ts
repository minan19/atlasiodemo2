import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, isActive: true, emailVerified: true, createdAt: true },
    });
  }

  /**
   * Profil güncelleme: ad ve/veya şifre.
   * currentPassword şifre değişikliği için zorunludur.
   */
  async updateMe(
    userId: string,
    dto: { name?: string; currentPassword?: string; newPassword?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Kullanıcı bulunamadı');

    const updates: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updates.name = dto.name.trim() || null;
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Mevcut şifrenizi girmeniz gerekiyor');
      }
      const ok = await argon2.verify(user.passwordHash, dto.currentPassword);
      if (!ok) throw new BadRequestException('Mevcut şifre hatalı');
      if (dto.newPassword.length < 8) {
        throw new BadRequestException('Yeni şifre en az 8 karakter olmalıdır');
      }
      updates.passwordHash = await argon2.hash(dto.newPassword);
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('Güncellenecek bir alan belirtilmedi');
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

  async adminUpdateUser(userId: string, dto: { role?: string; isActive?: boolean }) {
    if (!dto.role && dto.isActive === undefined) {
      throw new BadRequestException('Güncellenecek bir alan belirtilmedi');
    }
    const updates: Record<string, unknown> = {};
    if (dto.role !== undefined) updates.role = dto.role;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;

    return this.prisma.user.update({
      where: { id: userId },
      data: updates,
      select: { id: true, email: true, name: true, role: true, isActive: true, emailVerified: true, createdAt: true },
    });
  }
}
