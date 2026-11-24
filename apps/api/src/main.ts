import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import "reflect-metadata";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const express = app.getHttpAdapter().getInstance() as {
    disable(name: string): void;
  };
  express.disable("x-powered-by");
  app.use(
    (
      _request: unknown,
      response: { setHeader(name: string, value: string): void },
      next: () => void,
    ) => {
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("X-Frame-Options", "DENY");
      response.setHeader("Referrer-Policy", "no-referrer");
      response.setHeader("Cache-Control", "no-store");
      next();
    },
  );

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: config.get<string>("ADMIN_URL", "http://localhost:3001"),
    credentials: true,
  });
  app.enableShutdownHooks();

  const port = config.get<number>("PORT", 3000);
  await app.listen(port, "0.0.0.0");
  console.log(`Access Control API listening on http://localhost:${port}`);
}

void bootstrap();
