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

  await prisma.user.createMany({
    data: [
      { id: adminId, email: 'admin@atlasio.com', role: Role.ADMIN, passwordHash: adminPass, isActive: true, name: 'Atlasio Admin', updatedAt: now },
      { id: instructorId, email: 'instructor1@atlasio.com', role: Role.INSTRUCTOR, passwordHash: instrPass, isActive: true, name: 'Atlasio Instructor', updatedAt: now },
      { id: studentId, email: 'student1@atlasio.com', role: Role.STUDENT, passwordHash: studentPass, isActive: true, name: 'Atlasio Student', updatedAt: now },
    ],
    skipDuplicates: true,
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

  // Topics
  const topics = [
    { id: randomUUID(), name: 'Temel Matematik', description: 'Toplama/çıkarma ve basit denklemler' },
    { id: randomUUID(), name: 'Fizik Giriş', description: 'Hız, ivme, hareket' },
  ];
  await prisma.topic.createMany({
    data: topics.map((t) => ({ ...t, updatedAt: now })),
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
      { id: q1, topicId: topics[0].id, stem: '3 + 4 = ?', explanation: 'Basit toplama', difficulty: 1, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
      { id: q2, topicId: topics[0].id, stem: '12 - 5 = ?', explanation: 'Basit çıkarma', difficulty: 1, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
      { id: q3, topicId: topics[0].id, stem: 'x + 3 = 8 ise x = ?', explanation: 'Basit denklem çözümü', difficulty: 2, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
      { id: q4, topicId: topics[1].id, stem: 'Hız = yol / zaman formülünde, yol 100m zaman 10s ise hız kaç m/s?', explanation: 'v = s/t', difficulty: 1, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
      { id: q5, topicId: topics[1].id, stem: 'Sabit ivme 2 m/s² ile 5 saniyede hız değişimi kaç m/s olur?', explanation: 'Δv = a*t', difficulty: 2, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
      { id: q6, topicId: topics[1].id, stem: 'Doğrusal hareket grafiğinde eğim hangi büyüklüğü verir?', explanation: 'Konum-zaman eğimi hızdır', difficulty: 2, correctChoiceId: randomUUID(), tenantId: 'public', updatedAt: now },
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
