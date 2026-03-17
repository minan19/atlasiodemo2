import { Body, Controller, Get, Post, Req, UseGuards, Param, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { IssueCertificationDto } from './dto';
import { CertificationsService } from './certifications.service';

@ApiTags('certifications')
@ApiBearerAuth('access-token')
@Controller('certifications')
export class CertificationsController {
  constructor(private readonly certifications: CertificationsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  my(@Req() req: any) {
    return this.certifications.listMine(req.user.id ?? req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'INSTRUCTOR')
  @Post('issue')
  issue(@Body() dto: IssueCertificationDto, @Req() req: any) {
    return this.certifications.issue(dto, req.user.id ?? req.user.userId);
  }

  @Get('verify')
  verifyByKey(@Query('key') key: string) {
    return this.certifications.verify(key);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get()
  list() {
    return this.certifications.listAll();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Post('mark-expired')
  markExpired() {
    return this.certifications.markExpiries();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Query('lang') lang: 'tr' | 'en' = 'tr',
  ): Promise<StreamableFile> {
    const stream = await this.certifications.generatePdf(id, lang);
    return new StreamableFile(stream, {
      disposition: `inline; filename=\"certificate-${id}.pdf\"`,
      type: 'application/pdf',
    });
  }
}
