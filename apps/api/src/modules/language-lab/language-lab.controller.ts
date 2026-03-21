import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LanguageLabService } from './language-lab.service';
import { TranslationService } from './translation.service';

@Controller('language-lab')
@UseGuards(AuthGuard('jwt'))
export class LanguageLabController {
  constructor(private service: LanguageLabService, private translation: TranslationService) {}

  @Post('analyze-speech')
  analyzeSpeech(@Body() dto: { audioBase64: string, expectedText: string }, @Req() req: any) {
    const userId = req.user.id || req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId || 'public';
    return this.service.analyzeSpeech(userId, tenantId, dto.audioBase64, dto.expectedText);
  }

  @Get('history')
  getHistory(@Req() req: any) {
    const userId = req.user.id || req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId || 'public';
    return this.service.fetchSpeakingHistory(userId, tenantId);
  }

  @Post('live-transcription')
  transcribeLiveStream(@Body() dto: { sessionId: string, text: string, targetLang: string }, @Req() req: any) {
    const userId = req.user.id || req.user.userId;
    return this.translation.processLiveTranscription(dto.sessionId, userId, dto.text, dto.targetLang);
  }
}
