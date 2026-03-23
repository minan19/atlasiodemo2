import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { InstructorInsightsService } from './instructor-insights.service';
import { UpdateInstructorActionDto } from './dto/update-action.dto';

@ApiBearerAuth('access-token')
@ApiTags('me-actions')
@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class MeActionsController {
  constructor(private readonly insights: InstructorInsightsService) {}

  /**
   * Öğrencinin kendisine atanmış aksiyonları listeler
   * GET /me/actions?status=active&limit=20&cursor=...
   */
  @Get('actions')
  async listMyActions(@Req() req: any, @Query() query: any) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.insights.listMyActions({
      userId,
      query,
    });
  }

  /**
   * Öğrenci kendi aksiyonunun durumunu günceller (örn. completed)
   */
  @Patch('actions/:actionId')
  async updateMyAction(@Param('actionId') actionId: string, @Body() dto: UpdateInstructorActionDto, @Req() req: any) {
    const userId = req.user?.id ?? req.user?.userId;
    return this.insights.updateMyAction({ actionId, dto, userId });
  }
}
