"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./modules/app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const express_rate_limit_1 = require("express-rate-limit");
const crypto_1 = require("crypto");
const express = require("express");
const prisma_service_1 = require("./modules/prisma/prisma.service");
const tenant_context_middleware_1 = require("./modules/prisma/tenant-context.middleware");
const ops_webhook_verify_middleware_1 = require("./modules/ops/ops.webhook.verify.middleware");
const security_service_1 = require("./modules/security/security.service");
function ensureEnv() {
    const required = ['JWT_SECRET', 'DATABASE_URL'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
async function bootstrap() {
    ensureEnv();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bodyParser: false });
    const httpAdapter = app.getHttpAdapter();
    const instance = httpAdapter.getInstance?.();
    if (instance?.set) {
        instance.set('trust proxy', 1);
    }
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
    app.use((0, express_rate_limit_1.default)({
        windowMs: 60_000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
    }));
    app.use('/payments/webhook', express.raw({ type: '*/*' }), (req, _res, next) => {
        req.rawBody = req.body;
        next();
    });
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    const opsVerify = new ops_webhook_verify_middleware_1.OpsWebhookVerifyMiddleware();
    app.use('/ops/webhook', (req, res, next) => {
        return opsVerify.use(req, res, next);
    });
    const prisma = app.get(prisma_service_1.PrismaService);
    const tenantCtx = new tenant_context_middleware_1.TenantContextMiddleware();
    app.use((req, res, next) => {
        req.prisma = prisma;
        return tenantCtx.use(req, res, next);
    });
    const securityService = app.get(security_service_1.SecurityService);
    app.use(async (req, res, next) => {
        const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket?.remoteAddress || '';
        void securityService.observeRequest(ip, req.originalUrl || req.url || '');
        void securityService.detectPatterns(ip, req.originalUrl || req.url || '');
        if (await securityService.isDenied(ip)) {
            return res.status(401).json({ error: 'IP temporarily blocked' });
        }
        next();
    });
    app.use((req, res, next) => {
        const requestId = req.headers['x-request-id'] ?? (0, crypto_1.randomUUID)();
        req.requestId = requestId;
        res.setHeader('x-request-id', requestId);
        next();
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Atlasio API')
        .setDescription('Atlasio Kurumsal Uzaktan Eğitim API')
        .setVersion('0.2.0')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
    }, 'access-token')
        .addApiKey({ type: 'apiKey', name: 'X-Tenant-ID', in: 'header' }, 'tenant')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, document);
    const fs = await Promise.resolve().then(() => require('fs'));
    fs.writeFileSync('docs/openapi.json', JSON.stringify(document, null, 2), 'utf8');
    const port = Number(process.env.API_PORT) || 4000;
    await app.listen(port);
    console.log(`API running on http://localhost:${port}`);
    console.log(`Swagger: http://localhost:${port}/docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map