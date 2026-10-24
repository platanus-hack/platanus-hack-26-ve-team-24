import 'reflect-metadata';
import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

// La API se reconstruye según docs/BACKEND.md: ingesta de la captura
// kernel (eBPF), sellado y anclaje. Hasta entonces esto solo verifica
// el toolchain (rspack, oxlint, oxfmt).
@Module({})
class AppModule {}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Los agentes no hablan con esta API. Solo el dashboard y la página pública.
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');

  new Logger('Bootstrap').log(`api escuchando en http://0.0.0.0:${port}`);
}

void bootstrap();
