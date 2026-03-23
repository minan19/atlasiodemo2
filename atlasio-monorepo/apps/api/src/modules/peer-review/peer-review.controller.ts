import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PeerReviewService } from './peer-review.service';

@Controller('peer-review')
@UseGuards(AuthGuard('jwt'))
export class PeerReviewController {
  constructor(private service: PeerReviewService) {}

  @Post('submit')
  submit(@Body() dto: { submissionId: string, score: number, feedback: string }, @Req() req: any) {
    const reviewerId = req.user.id || req.user.userId;
    return this.service.submitReview(dto.submissionId, reviewerId, dto.score, dto.feedback);
  }
}
