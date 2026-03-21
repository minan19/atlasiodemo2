import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MathEngineService } from './math-engine.service';

@Controller('math-engine')
@UseGuards(AuthGuard('jwt'))
export class MathEngineController {
  constructor(private service: MathEngineService) {}

  @Post('solve')
  solve(@Body() dto: { expression: string }, @Req() req: any) {
    const userId = req.user.id || req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId || 'public';
    return this.service.evaluateEquation(userId, tenantId, dto.expression);
  }

  @Post('matrix')
  calculateMatrix(@Body() dto: { matrixA: number[][], matrixB: number[][], operation: 'ADD' | 'MULTIPLY' }, @Req() req: any) {
    const userId = req.user.id || req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId || 'public';
    return this.service.calculateMatrix(userId, tenantId, dto.matrixA, dto.matrixB, dto.operation);
  }
}
