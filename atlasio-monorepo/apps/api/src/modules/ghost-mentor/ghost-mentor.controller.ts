import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GhostAskDto, GhostPreloadFaqDto } from './dto';
import { GhostMentorService } from './ghost-mentor.service';

@ApiTags('ghost-mentor')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('ghost-mentor')
export class GhostMentorController {
  constructor(private readonly ghost: GhostMentorService) {}

  @Post('ask')
  ask(@Req() req: any, @Body() dto: GhostAskDto) {
    return this.ghost.ask(req.user.id ?? req.user.userId, dto);
  }

  @Post('preload-faq')
  preload(@Req() req: any, @Body() dto: GhostPreloadFaqDto) {
    return this.ghost.preloadFaq(req.user.id ?? req.user.userId, dto);
  }
}
