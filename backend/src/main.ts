import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const origins = (config.get<string>("CORS_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  app.setGlobalPrefix("api");
  app.enableCors({ origin: origins.length ? origins : true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const port = Number(config.get("PORT") ?? 5000);
  await app.listen(port, "0.0.0.0");
  console.log(`Ember Kitchen API running on http://localhost:${port}/api`);
}

void bootstrap();
