import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ForgotPasswordDto, LoginDto, RefreshDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from './dto';

@ApiTags('auth')
@Controller('auth')
// Auth işlemleri için global'den daha sıkı limit: 1 dakikada 10 istek
@Throttle({ medium: { ttl: 60_000, limit: 10 } })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @ApiOperation({ summary: 'Yeni hesap oluştur' })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    return this.auth.register(dto, { ip: req.ip, ua: req.headers['user-agent'] });
  }

  @ApiOperation({ summary: 'E-posta + şifre ile giriş yap' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto.email, dto.password, { ip: req.ip, ua: req.headers['user-agent'] });
  }

  @ApiOperation({ summary: 'Refresh token ile yeni access token al (token rotation)' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: any) {
    return this.auth.refresh(dto.refreshToken, { ip: req.ip, ua: req.headers['user-agent'] });
  }

  @ApiOperation({ summary: 'Çıkış yap — refresh token iptal edilir' })
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Şifre sıfırlama e-postası gönder' })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @ApiOperation({ summary: 'Token ile şifre sıfırla' })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: any) {
    return this.auth.resetPassword(dto.token, dto.password, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
  }

  @ApiOperation({ summary: 'Token ile e-postayı doğrula' })
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: any) {
    return this.auth.verifyEmail(dto.token, { ip: req.ip, ua: req.headers['user-agent'] });
  }

  @ApiOperation({ summary: 'Doğrulama e-postasını yeniden gönder (JWT gerekli)' })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Post('resend-verification')
  async resendVerification(@Req() req: any) {
    return this.auth.resendVerification(req.user.id ?? req.user.userId);
  }

  /** GET /auth/me  — JWT'den kullanıcı bilgisi */
  @ApiOperation({ summary: 'Giriş yapan kullanıcının profili' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @SkipThrottle() // Sık polling yapılabilir, kısıtlama yok
  @Get('me')
  me(@Req() req: any) {
    return this.users.me(req.user.id ?? req.user.userId);
  }

  /** GET /auth/profile  — /auth/me için alias */
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @SkipThrottle()
  @Get('profile')
  profile(@Req() req: any) {
    return this.users.me(req.user.id ?? req.user.userId);
  }
}
