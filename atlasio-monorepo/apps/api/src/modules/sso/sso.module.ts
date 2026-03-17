import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SsoService } from './sso.service';
import { SsoController } from './sso.controller';
import { InfraModule } from '../../infra/infra.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    }),
    InfraModule,
  ],
  controllers: [SsoController],
  providers: [SsoService],
  exports: [SsoService],
})
export class SsoModule {}
