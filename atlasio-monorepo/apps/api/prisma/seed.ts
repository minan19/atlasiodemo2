import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  // Tenant
  await prisma.tenant.upsert({
    where: { id: 'public' },
    update: { name: 'Atlasio Demo', slug: 'atlasio-demo', updatedAt: now },
    create: { id: 'public', name: 'Atlasio Demo', slug: 'atlasio-demo', status: 'active', updatedAt: now },
  });

  // Users
  const adminId = randomUUID();
  const instructorId = randomUUID();
  const studentId = randomUUID();
  const adminPass = await argon2.hash('Atlasio123!');
  const instrPass = await argon2.hash('Atlasio123!');
  const studentPass = await argon2.hash('Atlasio123!');

  // Yeni Rollerin Eklenmesi (Head Instructor, Guardian vb.)
  const headInstructorId = randomUUID();
  const guardianId = randomUUID();
  const topStudentId = randomUUID(); // Oyunlaştırma şampiyonu
  const riskStudentId = randomUUID(); // Düşme (Dropout) riski olan

  await prisma.user.createMany({
    data: [
      { id: adminId, email: 'admin@atlasio.com', role: Role.ADMIN, passwordHash: adminPass, isActive: true, name: 'Atlasio Admin', updatedAt: now },
      { id: headInstructorId, email: 'head@atlasio.com', role: Role.HEAD_INSTRUCTOR, passwordHash: instrPass, isActive: true, name: 'Bölüm Başkanı', updatedAt: now },
      { id: instructorId, email: 'instructor1@atlasio.com', role: Role.INSTRUCTOR, passwordHash: instrPass, isActive: true, name: 'Atlasio Eğitmeni', updatedAt: now },
      { id: guardianId, email: 'veli@atlasio.com', role: Role.GUARDIAN, passwordHash: studentPass, isActive: true, name: 'Örnek Veli', updatedAt: now },
      
      { id: studentId, email: 'student1@atlasio.com', role: Role.STUDENT, passwordHash: studentPass, isActive: true, name: 'Normal Öğrenci', updatedAt: now, currentStreak: 3, longestStreak: 5, totalXp: 1500, league: 'SILVER', hearts: 3 },
      { id: topStudentId, email: 'topstudent@atlasio.com', role: Role.STUDENT, passwordHash: studentPass, isActive: true, name: 'Şampiyon Öğrenci', updatedAt: now, currentStreak: 120, longestStreak: 150, totalXp: 25000, league: 'MASTER', hearts: 5, coins: 4500, streakFreezes: 2 },
      { id: riskStudentId, email: 'riskstudent@atlasio.com', role: Role.STUDENT, passwordHash: studentPass, isActive: true, name: 'Riskli Öğrenci', updatedAt: now, currentStreak: 0, longestStreak: 2, totalXp: 100, league: 'BRONZE', hearts: 0 },
    ],
    skipDuplicates: true,
  });

  // Veli-Öğrenci Bağlantısı
  await prisma.parentStudent.create({
     data: { parentId: guardianId, studentId: riskStudentId, tenantId: 'public' }
  });

  // Departman ve Eğitmen Ataması
  const dept = await prisma.department.create({
     data: { name: 'İngilizce Zümresi', headInstructorId: headInstructorId, tenantId: 'public' }
  });

  await prisma.user.update({
     where: { id: instructorId },
     data: { departmentId: dept.id }
  });

  // Courses
  const courseId = randomUUID();
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

  // Lessons
  await prisma.lessonContent.createMany({
    data: [
      { id: randomUUID(), courseId, title: 'Hoş geldin', order: 1, updatedAt: now },
      { id: randomUUID(), courseId, title: 'Canlı sınıfa giriş', order: 2, updatedAt: now },
    ],
  });

  // Enrollments
  await prisma.enrollment.createMany({
     data: [
        { userId: studentId, courseId: courseId, tenantId: 'public' },
        { userId: topStudentId, courseId: courseId, tenantId: 'public' },
        { userId: riskStudentId, courseId: courseId, tenantId: 'public' }
     ]
  });

  // Topics
  const topics = [
    { id: randomUUID(), name: 'Temel Matematik', description: 'Toplama/çıkarma ve basit denklemler' },
    { id: randomUUID(), name: 'Fizik Giriş', description: 'Hız, ivme, hareket' },
  ];
  await prisma.topic.createMany({
    data: topics.map((t) => ({ ...t, updatedAt: now })),
  });

  // Cognitive AI & Micro-Weakness Concepts
  const concepts = [
    { id: randomUUID(), topicId: topics[0].id, name: 'Toplama', description: 'İki basamaklı sayılar' },
    { id: randomUUID(), topicId: topics[0].id, name: 'Çıkarma', description: 'Negatif sayılara geçiş' },
    { id: randomUUID(), topicId: topics[1].id, name: 'Hız', description: 'v=s/t kuralı' },
  ];
  await prisma.concept.createMany({
     data: concepts
  });

  // Questions & choices
  const q1 = randomUUID();
  const q2 = randomUUID();
  const q3 = randomUUID();
  const q4 = randomUUID();
  const q5 = randomUUID();
  const q6 = randomUUID();

  await prisma.question.createMany({
    data: [
      { id: q1, topicId: topics[0].id, conceptId: concepts[0].id, stem: '3 + 4 = ?', explanation: 'Basit toplama', difficulty: 1, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
      { id: q2, topicId: topics[0].id, conceptId: concepts[1].id, stem: '12 - 5 = ?', explanation: 'Basit çıkarma', difficulty: 1, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
      { id: q3, topicId: topics[0].id, conceptId: concepts[0].id, stem: 'x + 3 = 8 ise x = ?', explanation: 'Basit denklem çözümü', difficulty: 2, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
      { id: q4, topicId: topics[1].id, conceptId: concepts[2].id, stem: 'Hız = yol / zaman formülünde, yol 100m zaman 10s ise hız kaç m/s?', explanation: 'v = s/t', difficulty: 1, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
      { id: q5, topicId: topics[1].id, conceptId: concepts[2].id, stem: 'Sabit ivme 2 m/s² ile 5 saniyede hız değişimi kaç m/s olur?', explanation: 'Δv = a*t', difficulty: 2, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
      { id: q6, topicId: topics[1].id, conceptId: concepts[2].id, stem: 'Doğrusal hareket grafiğinde eğim hangi büyüklüğü verir?', explanation: 'Konum-zaman eğimi hızdır', difficulty: 2, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
    ],
  });

  // Choices (attach real ids to correctChoiceId)
  const choices: { q: string; text: string; correct: boolean }[] = [
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

  const choiceCreates = choices.map((c) => ({ id: randomUUID(), questionId: c.q, text: c.text, isCorrect: c.correct }));
  await prisma.questionChoice.createMany({ data: choiceCreates });

  // Update correctChoiceId using created ids
  const correctMap = choiceCreates.filter((c) => c.isCorrect).reduce<Record<string, string>>((acc, c) => {
    acc[c.questionId] = c.id;
    return acc;
  }, {});
  await Promise.all(
    Object.entries(correctMap).map(([questionId, correctChoiceId]) =>
      prisma.question.update({ where: { id: questionId }, data: { correctChoiceId } }),
    ),
  );

  // Cognitive AI Simulation (Concept Masteries & Quiz Attempts for the Heatmap)
  const attemptBase = { tenantId: 'public', durationMs: 15000, createdAt: now };

  // TOP STUDENT: Good at everything
  await prisma.quizAttempt.createMany({
     data: [
       { id: randomUUID(), userId: topStudentId, questionId: q1, correct: true, ...attemptBase },
       { id: randomUUID(), userId: topStudentId, questionId: q2, correct: true, ...attemptBase },
       { id: randomUUID(), userId: topStudentId, questionId: q4, correct: true, ...attemptBase },
     ]
  });
  await prisma.conceptMastery.createMany({
     data: [
       { id: randomUUID(), userId: topStudentId, conceptId: concepts[0].id, masteryLevel: 0.9, consecutiveOk: 5, lastReviewedAt: now, nextReviewAt: new Date(now.getTime() + 86400000 * 30) },
       { id: randomUUID(), userId: topStudentId, conceptId: concepts[1].id, masteryLevel: 0.85, consecutiveOk: 4, lastReviewedAt: now, nextReviewAt: new Date(now.getTime() + 86400000 * 14) },
       { id: randomUUID(), userId: topStudentId, conceptId: concepts[2].id, masteryLevel: 0.95, consecutiveOk: 7, lastReviewedAt: now, nextReviewAt: new Date(now.getTime() + 86400000 * 30) },
     ]
  });

  // RISK STUDENT: Failing
  await prisma.quizAttempt.createMany({
     data: [
       { id: randomUUID(), userId: riskStudentId, questionId: q1, correct: true, ...attemptBase }, // Toplamayı biliyor
       { id: randomUUID(), userId: riskStudentId, questionId: q2, correct: false, ...attemptBase }, // Çıkarmada çuvallamış
       { id: randomUUID(), userId: riskStudentId, questionId: q4, correct: false, ...attemptBase }, // Fizik (Hız) zayıf
     ]
  });
  await prisma.conceptMastery.createMany({
     data: [
       { id: randomUUID(), userId: riskStudentId, conceptId: concepts[0].id, masteryLevel: 0.8, consecutiveOk: 2, lastReviewedAt: now, nextReviewAt: new Date(now.getTime() + 86400000 * 3) },
       { id: randomUUID(), userId: riskStudentId, conceptId: concepts[1].id, masteryLevel: 0.2, consecutiveOk: 0, lastReviewedAt: now, nextReviewAt: now }, // ACİL ŞİFA GEREKİYOR
       { id: randomUUID(), userId: riskStudentId, conceptId: concepts[2].id, masteryLevel: 0.1, consecutiveOk: 0, lastReviewedAt: now, nextReviewAt: now }, // ACİL ŞİFA GEREKİYOR
     ]
  });

  // Risk Profile Simulation
  await prisma.studentRiskProfile.create({
     data: {
       id: randomUUID(),
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
    await (prisma as any).$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await (prisma as any).$disconnect();
    process.exit(1);
  });
