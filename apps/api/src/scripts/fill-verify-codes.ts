/**
 * Populates missing verifyCode for existing certifications.
 * Usage: pnpm --filter @atlasio/api exec ts-node src/scripts/fill-verify-codes.ts
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const certs = await prisma.certification.findMany({ where: { verifyCode: null } });
  for (const cert of certs) {
    const code = randomUUID().replace(/-/g, '').slice(0, 12);
    await prisma.certification.update({ where: { id: cert.id }, data: { verifyCode: code } });
    // eslint-disable-next-line no-console
    console.log(`verifyCode set for ${cert.id} -> ${code}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
