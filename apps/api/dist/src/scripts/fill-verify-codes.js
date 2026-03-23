"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
async function main() {
    const certs = await prisma.certification.findMany({ where: { verifyCode: null } });
    for (const cert of certs) {
        const code = (0, crypto_1.randomUUID)().replace(/-/g, '').slice(0, 12);
        await prisma.certification.update({ where: { id: cert.id }, data: { verifyCode: code } });
        console.log(`verifyCode set for ${cert.id} -> ${code}`);
    }
}
main()
    .then(() => prisma.$disconnect())
    .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
});
//# sourceMappingURL=fill-verify-codes.js.map