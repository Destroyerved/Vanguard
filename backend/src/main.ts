import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.enableCors({ origin: '*' });

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  console.log(`VANGUARD backend listening on http://localhost:${port}`);
}
await bootstrap();