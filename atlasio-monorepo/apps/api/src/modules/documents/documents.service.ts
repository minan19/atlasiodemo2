import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function pad(n: number, width: number) {
  const s = String(n);
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates monotonic document numbers like: ATL-FT-2026-000123
   * - No gaps policy: counter increases, never reused.
   */
  async nextDocNo(docType: string, prefix = 'ATL') {
    const year = new Date().getFullYear();
    const seq = await this.prisma.documentSequence.upsert({
      where: { docType },
      update: { year, counter: { increment: 1 } },
      create: { docType, year, counter: 1 },
    });
    return `${prefix}-${docType}-${year}-${pad(seq.counter, 6)}`;
  }
}
