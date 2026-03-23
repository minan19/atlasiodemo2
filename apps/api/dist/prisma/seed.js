"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = require("argon2");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
async function main() {
    const now = new Date();
    await prisma.tenant.upsert({
        where: { id: 'public' },
        update: { name: 'Atlasio Demo', slug: 'atlasio-demo', updatedAt: now },
        create: { id: 'public', name: 'Atlasio Demo', slug: 'atlasio-demo', status: 'active', updatedAt: now },
    });
    const adminId = (0, crypto_1.randomUUID)();
    const instructorId = (0, crypto_1.randomUUID)();
    const studentId = (0, crypto_1.randomUUID)();
    const adminPass = await argon2.hash('Atlasio123!');
    const instrPass = await argon2.hash('Atlasio123!');
    const studentPass = await argon2.hash('Atlasio123!');
    const headInstructorId = (0, crypto_1.randomUUID)();
    const guardianId = (0, crypto_1.randomUUID)();
    const topStudentId = (0, crypto_1.randomUUID)();
    const riskStudentId = (0, crypto_1.randomUUID)();
    await prisma.user.createMany({
        data: [
            { id: adminId, email: 'admin@atlasio.com', role: client_1.Role.ADMIN, passwordHash: adminPass, isActive: true, name: 'Atlasio Admin', updatedAt: now },
            { id: headInstructorId, email: 'head@atlasio.com', role: client_1.Role.HEAD_INSTRUCTOR, passwordHash: instrPass, isActive: true, name: 'Bölüm Başkanı', updatedAt: now },
            { id: instructorId, email: 'instructor1@atlasio.com', role: client_1.Role.INSTRUCTOR, passwordHash: instrPass, isActive: true, name: 'Atlasio Eğitmeni', updatedAt: now },
            { id: guardianId, email: 'veli@atlasio.com', role: client_1.Role.GUARDIAN, passwordHash: studentPass, isActive: true, name: 'Örnek Veli', updatedAt: now },
            { id: studentId, email: 'student1@atlasio.com', role: client_1.Role.STUDENT, passwordHash: studentPass, isActive: true, name: 'Normal Öğrenci', updatedAt: now, currentStreak: 3, longestStreak: 5, totalXp: 1500, league: 'SILVER', hearts: 3 },
            { id: topStudentId, email: 'topstudent@atlasio.com', role: client_1.Role.STUDENT, passwordHash: studentPass, isActive: true, name: 'Şampiyon Öğrenci', updatedAt: now, currentStreak: 120, longestStreak: 150, totalXp: 25000, league: 'MASTER', hearts: 5, coins: 4500, streakFreezes: 2 },
            { id: riskStudentId, email: 'riskstudent@atlasio.com', role: client_1.Role.STUDENT, passwordHash: studentPass, isActive: true, name: 'Riskli Öğrenci', updatedAt: now, currentStreak: 0, longestStreak: 2, totalXp: 100, league: 'BRONZE', hearts: 0 },
        ],
        skipDuplicates: true,
    });
    await prisma.parentStudent.create({
        data: { parentId: guardianId, studentId: riskStudentId, tenantId: 'public' }
    });
    const dept = await prisma.department.create({
        data: { name: 'İngilizce Zümresi', headInstructorId: headInstructorId, tenantId: 'public' }
    });
    await prisma.user.update({
        where: { id: instructorId },
        data: { departmentId: dept.id }
    });
    const courseId = (0, crypto_1.randomUUID)();
    await prisma.course.create({
        data: {
            id: courseId,
            title: 'AI Destekli Öğrenme',
            description: 'Canlı + asenkron derslerle demo katalog.',
            isPublished: true,
            updatedAt: now,
            price: 0,
            tenantId: 'public',
            instructorId: null,
        },
    });
    await prisma.lessonContent.createMany({
        data: [
            { id: (0, crypto_1.randomUUID)(), courseId, title: 'Hoş geldin', order: 1, updatedAt: now },
            { id: (0, crypto_1.randomUUID)(), courseId, title: 'Canlı sınıfa giriş', order: 2, updatedAt: now },
        ],
    });
    await prisma.enrollment.createMany({
        data: [
            { userId: studentId, courseId: courseId, tenantId: 'public' },
            { userId: topStudentId, courseId: courseId, tenantId: 'public' },
            { userId: riskStudentId, courseId: courseId, tenantId: 'public' }
        ]
    });
    const topics = [
        { id: (0, crypto_1.randomUUID)(), name: 'Temel Matematik', description: 'Toplama/çıkarma ve basit denklemler' },
        { id: (0, crypto_1.randomUUID)(), name: 'Fizik Giriş', description: 'Hız, ivme, hareket' },
    ];
    await prisma.topic.createMany({
        data: topics.map((t) => ({ ...t, updatedAt: now })),
    });
    const concepts = [
        { id: (0, crypto_1.randomUUID)(), topicId: topics[0].id, name: 'Toplama', description: 'İki basamaklı sayılar' },
        { id: (0, crypto_1.randomUUID)(), topicId: topics[0].id, name: 'Çıkarma', description: 'Negatif sayılara geçiş' },
        { id: (0, crypto_1.randomUUID)(), topicId: topics[1].id, name: 'Hız', description: 'v=s/t kuralı' },
    ];
    await prisma.concept.createMany({
        data: concepts
    });
    const q1 = (0, crypto_1.randomUUID)();
    const q2 = (0, crypto_1.randomUUID)();
    const q3 = (0, crypto_1.randomUUID)();
    const q4 = (0, crypto_1.randomUUID)();
    const q5 = (0, crypto_1.randomUUID)();
    const q6 = (0, crypto_1.randomUUID)();
    await prisma.question.createMany({
        data: [
            { id: q1, topicId: topics[0].id, conceptId: concepts[0].id, stem: '3 + 4 = ?', explanation: 'Basit toplama', difficulty: 1, correctChoiceId: (0, crypto_1.randomUUID)(), tenantId: 'public', updatedAt: now },
            { id: q2, topicId: topics[0].id, conceptId: concepts[1].id, stem: '12 - 5 = ?', explanation: 'Basit çıkarma', difficulty: 1, correctChoiceId: (0, crypto_1.randomUUID)(), tenantId: 'public', updatedAt: now },
            { id: q3, topicId: topics[0].id, conceptId: concepts[0].id, stem: 'x + 3 = 8 ise x = ?', explanation: 'Basit denklem çözümü', difficulty: 2, correctChoiceId: (0, crypto_1.randomUUID)(), tenantId: 'public', updatedAt: now },
            { id: q4, topicId: topics[1].id, conceptId: concepts[2].id, stem: 'Hız = yol / zaman formülünde, yol 100m zaman 10s ise hız kaç m/s?', explanation: 'v = s/t', difficulty: 1, correctChoiceId: (0, crypto_1.randomUUID)(), tenantId: 'public', updatedAt: now },
            { id: q5, topicId: topics[1].id, conceptId: concepts[2].id, stem: 'Sabit ivme 2 m/s² ile 5 saniyede hız değişimi kaç m/s olur?', explanation: 'Δv = a*t', difficulty: 2, correctChoiceId: (0, crypto_1.randomUUID)(), tenantId: 'public', updatedAt: now },
            { id: q6, topicId: topics[1].id, conceptId: concepts[2].id, stem: 'Doğrusal hareket grafiğinde eğim hangi büyüklüğü verir?', explanation: 'Konum-zaman eğimi hızdır', difficulty: 2, correctChoiceId: (0, crypto_1.randomUUID)(), tenantId: 'public', updatedAt: now },
        ],
    });
    const choices = [
        { q: q1, text: '6', correct: false },
        { q: q1, text: '7', correct: true },
        { q: q1, text: '8', correct: false },
        { q: q2, text: '5', correct: false },
        { q: q2, text: '7', correct: true },
        { q: q2, text: '9', correct: false },
        { q: q3, text: '3', correct: false },
        { q: q3, text: '5', correct: true },
        { q: q3, text: '8', correct: false },
        { q: q4, text: '5 m/s', correct: false },
        { q: q4, text: '10 m/s', correct: true },
        { q: q4, text: '20 m/s', correct: false },
        { q: q5, text: '2 m/s', correct: false },
        { q: q5, text: '10 m/s', correct: true },
        { q: q5, text: '20 m/s', correct: false },
        { q: q6, text: 'İvme', correct: false },
        { q: q6, text: 'Hız', correct: true },
        { q: q6, text: 'Konum', correct: false },
    ];
    const choiceCreates = choices.map((c) => ({ id: (0, crypto_1.randomUUID)(), questionId: c.q, text: c.text, isCorrect: c.correct }));
    await prisma.questionChoice.createMany({ data: choiceCreates });
    const correctMap = choiceCreates.filter((c) => c.isCorrect).reduce((acc, c) => {
        acc[c.questionId] = c.id;
        return acc;
    }, {});
    await Promise.all(Object.entries(correctMap).map(([questionId, correctChoiceId]) => prisma.question.update({ where: { id: questionId }, data: { correctChoiceId } })));
    const attemptBase = { tenantId: 'public', durationMs: 15000, createdAt: now };
    await prisma.quizAttempt.createMany({
        data: [
            { id: (0, crypto_1.randomUUID)(), userId: topStudentId, questionId: q1, correct: true, ...attemptBase },
            { id: (0, crypto_1.randomUUID)(), userId: topStudentId, questionId: q2, correct: true, ...attemptBase },
            { id: (0, crypto_1.randomUUID)(), userId: topStudentId, questionId: q4, correct: true, ...attemptBase },
        ]
    });
    await prisma.conceptMastery.createMany({
        data: [
            { id: (0, crypto_1.randomUUID)(), userId: topStudentId, conceptId: concepts[0].id, masteryLevel: 0.9, consecutiveOk: 5, lastReviewedAt: now, nextReviewAt: new Date(now.getTime() + 86400000 * 30) },
            { id: (0, crypto_1.randomUUID)(), userId: topStudentId, conceptId: concepts[1].id, masteryLevel: 0.85, consecutiveOk: 4, lastReviewedAt: now, nextReviewAt: new Date(now.getTime() + 86400000 * 14) },
            { id: (0, crypto_1.randomUUID)(), userId: topStudentId, conceptId: concepts[2].id, masteryLevel: 0.95, consecutiveOk: 7, lastReviewedAt: now, nextReviewAt: new Date(now.getTime() + 86400000 * 30) },
        ]
    });
    await prisma.quizAttempt.createMany({
        data: [
            { id: (0, crypto_1.randomUUID)(), userId: riskStudentId, questionId: q1, correct: true, ...attemptBase },
            { id: (0, crypto_1.randomUUID)(), userId: riskStudentId, questionId: q2, correct: false, ...attemptBase },
            { id: (0, crypto_1.randomUUID)(), userId: riskStudentId, questionId: q4, correct: false, ...attemptBase },
        ]
    });
    await prisma.conceptMastery.createMany({
        data: [
            { id: (0, crypto_1.randomUUID)(), userId: riskStudentId, conceptId: concepts[0].id, masteryLevel: 0.8, consecutiveOk: 2, lastReviewedAt: now, nextReviewAt: new Date(now.getTime() + 86400000 * 3) },
            { id: (0, crypto_1.randomUUID)(), userId: riskStudentId, conceptId: concepts[1].id, masteryLevel: 0.2, consecutiveOk: 0, lastReviewedAt: now, nextReviewAt: now },
            { id: (0, crypto_1.randomUUID)(), userId: riskStudentId, conceptId: concepts[2].id, masteryLevel: 0.1, consecutiveOk: 0, lastReviewedAt: now, nextReviewAt: now },
        ]
    });
    await prisma.studentRiskProfile.create({
        data: {
            id: (0, crypto_1.randomUUID)(),
            userId: riskStudentId,
            courseId: courseId,
            riskLevel: 'HIGH',
            aiInsights: { message: "Yapay Zeka Uyarısı: Öğrencinin bilişsel hakimiyeti %40'ın altında. Düşme (Dropout) riski yüksek!", avgMastery: 0.36 },
            lastCalculated: now
        }
    });
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map