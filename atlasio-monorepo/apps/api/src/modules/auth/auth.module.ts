import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { BypassAuthGuard } from './bypass.guard';
import { UsersModule } from '../users/users.module';
import { InfraModule } from '../../infra/infra.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    }),
    UsersModule,
    InfraModule,
    NotificationsModule,
  ],
  providers: [AuthService, JwtStrategy, BypassAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, BypassAuthGuard],
})
export class AuthModule {}
