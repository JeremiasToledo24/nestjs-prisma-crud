// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

// --- NUEVAS IMPORTACIONES ---
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
// --------------------------

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  const globalPrefix = process.env.GLOBAL_PREFIX || 'chat';
  app.setGlobalPrefix(globalPrefix);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const basePath = process.env.BASE_PATH || '';

  // --- NUEVA CONFIGURACIÓN DE REDIS ---
  // 1. Inicializar el cliente de Redis
  const redisClient = createClient({
    // Asume que Redis corre en localhost:6379
    // Para producción, usa una variable de entorno:
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  // Manejar errores de conexión
  redisClient.on('error', (err) =>
    console.log('Error del Cliente Redis', err),
  );

  // 2. Conectar el cliente (es asíncrono)
  await redisClient.connect();
  console.log('Conectado a Redis exitosamente.');

  // 3. Inicializar el RedisStore
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'chat-session:', // Un prefijo para tus claves de sesión en Redis
  });
  // ------------------------------------

  app.use(
    session({
      // --- CAMBIO PRINCIPAL: USAR REDISSTORE ---
      store: redisStore,
      // ----------------------------------------

      secret: process.env.SESSION_SECRET || 'tu-secreto-super-seguro-cambiar',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 3600000 * 24 * 30, // 30 días
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: basePath ? `${basePath}/` : '/',
      },
    }),
  );

  app.setBaseViewsDir(join(__dirname, '..', './src/views'));
  app.setViewEngine('hbs');
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: basePath ? `${basePath}/${globalPrefix}/uploads/` : `/${globalPrefix}/uploads/`,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}${basePath}`);
}
bootstrap();