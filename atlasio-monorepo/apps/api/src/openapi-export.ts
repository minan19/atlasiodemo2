import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './modules/app.module';
import * as fs from 'fs';

async function exportOpenAPI() {
  const app = await NestFactory.create(AppModule, { logger: false });

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
  const outputPath = 'docs/openapi.json';
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf8');

  await app.close();
  // eslint-disable-next-line no-console
  console.log(`OpenAPI spec written to ${outputPath}`);
}

void exportOpenAPI();
