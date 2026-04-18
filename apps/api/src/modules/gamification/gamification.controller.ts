import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GamificationService } from './gamification.service';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('gamification')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('me')
  getMyStats(@Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.gamification.getMyStats(userId);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('leaderboard')
  getLeaderboard(@Req() req: any) {
    const tenantId = req.user.tenantId || req.tenantId || 'public';
    return this.gamification.getLeaderboard(tenantId);
  }
}
