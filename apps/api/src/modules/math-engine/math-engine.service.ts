import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MathEngineService {
  constructor(private prisma: PrismaService) {}

  async evaluateEquation(userId: string, tenantId: string, expression: string) {
    // Burada SymPy, Math.js vb. bir library ile karmaşık denklem çözümü yapılır.
    // Şimdilik simüle ediyoruz.
    const result = `Solution for ${expression}`;

    await this.prisma.mathSimulationLog.create({
      data: {
        userId,
        tenantId,
        toolType: 'EQUATION',
        inputData: { expression },
        resultData: { result }
      }
    });

    return { result };
  }

  async calculateMatrix(userId: string, tenantId: string, matrixA: number[][], matrixB: number[][], operation: 'ADD' | 'MULTIPLY') {
    // Basit simülasyon (Gerçek dünyada linear cebir paketi kullanılacak)
    const result = { matrix: "Simulated Result" };

    await this.prisma.mathSimulationLog.create({
      data: {
        userId,
        tenantId,
        toolType: 'MATRIX',
        inputData: { matrixA, matrixB, operation },
        resultData: result
      }
    });

    return result;
  }
}
