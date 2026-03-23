"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./modules/app.module");
const fs = require("fs");
async function exportOpenAPI() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { logger: false });
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
    const outputPath = 'docs/openapi.json';
    fs.mkdirSync('docs', { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf8');
    await app.close();
    console.log(`OpenAPI spec written to ${outputPath}`);
}
void exportOpenAPI();
//# sourceMappingURL=openapi-export.js.map