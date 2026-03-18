import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'crypto';
import * as express from 'express';
import { PrismaService } from './modules/prisma/prisma.service';
import { TenantContextMiddleware } from './modules/prisma/tenant-context.middleware';
import { OpsWebhookVerifyMiddleware } from './modules/ops/ops.webhook.verify.middleware';
import { SecurityService } from './modules/security/security.service';

function ensureEnv() {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function bootstrap() {
  ensureEnv();

  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const httpAdapter = app.getHttpAdapter();
  const instance = httpAdapter.getInstance?.();
  if (instance?.set) {
    instance.set('trust proxy', 1);
  }

  // CORS (listen'dan önce!)
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4000',
      'http://localhost:4100',
      ...(process.env.FRONTEND_BASE ? [process.env.FRONTEND_BASE] : []),
    ],
    credentials: true,
  });

  // Basic rate limiting
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Stripe webhook: raw body (signature için) – yalnızca webhook path’inde
  app.use(
    '/payments/webhook',
    express.raw({ type: '*/*' }),
    (req: any, _res: any, next: () => void) => {
      req.rawBody = req.body; // Stripe constructEvent için buffer sakla
      next();
    },
  );
  // Diğer tüm endpointler için normal JSON/body parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Ops webhook HMAC verify (consumer için /ops/webhook ise kullanılır)
  const opsVerify = new OpsWebhookVerifyMiddleware();
  app.use('/ops/webhook', (req: any, res: any, next: () => void) => {
    // rawBody middleware bu path'te de gereklidir; zaten genel rawBody çalışıyor
    return opsVerify.use(req, res, next);
  });

  // Tenant context (RLS) -> auth sonrası tenantId set_config
  const prisma = app.get(PrismaService);
  const tenantCtx = new TenantContextMiddleware();
  app.use((req: any, res: any, next: () => void) => {
    req.prisma = prisma; // middleware'in set_config yapabilmesi için
    return tenantCtx.use(req, res, next);
  });

  // IP deny + pasif güvenlik gözlemi (rate/pattern) + honeypot entegrasyonu
  const securityService = app.get(SecurityService);
  app.use(async (req: any, res: any, next: () => void) => {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket?.remoteAddress || '';

    // Pasif gözlem: rate/pattern
    void securityService.observeRequest(ip, req.originalUrl || req.url || '');
    void securityService.detectPatterns(ip, req.originalUrl || req.url || '');

    // Deny kontrolü
    if (await securityService.isDenied(ip)) {
      return res.status(401).json({ error: 'IP temporarily blocked' });
    }
    next();
  });

  app.use((req: any, res: any, next: () => void) => {
    const requestId = req.headers['x-request-id'] ?? randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger + OpenAPI export
  const config = new DocumentBuilder()
    .setTitle('Atlasio API')
    .setDescription('Atlasio Kurumsal Uzaktan Eğitim API')
    .setVersion('0.2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .addApiKey({ type: 'apiKey', name: 'X-Tenant-ID', in: 'header' }, 'tenant')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // OpenAPI/Swagger JSON export for Postman/clients
  const fs = await import('fs');
  fs.writeFileSync('docs/openapi.json', JSON.stringify(document, null, 2), 'utf8');

  const port = Number(process.env.API_PORT) || 4000;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger: http://localhost:${port}/docs`);
}

void bootstrap();
